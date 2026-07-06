from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from services.audit_service import log_action
from supabase import create_client
import os
from datetime import datetime

admissions_bp = Blueprint('admissions', __name__, url_prefix='/api/admissions')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@admissions_bp.route('/admit', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN')
def admit_patient():
    """Admit a patient to a bed. Validates bed is AVAILABLE first."""
    try:
        data = request.get_json()
        bed_id = data.get('bed_id')
        patient_id = data.get('patient_id')
        visit_id = data.get('visit_id')
        reason = data.get('reason', '')

        if not bed_id or not patient_id:
            return jsonify({'error': 'bed_id and patient_id are required'}), 400

        # ── Check bed is AVAILABLE ──
        bed = supabase.table('beds') \
            .select('*, rooms(room_number, wards(name, floors(name)))') \
            .eq('id', bed_id) \
            .single() \
            .execute().data

        if not bed:
            return jsonify({'error': 'Bed not found'}), 404

        if bed['status'] != 'AVAILABLE':
            return jsonify({'error': f'Bed is currently {bed["status"]}. Choose an available bed.'}), 409

        # ── Check patient not already admitted ──
        existing = supabase.table('admissions') \
            .select('id') \
            .eq('patient_id', patient_id) \
            .eq('status', 'ADMITTED') \
            .execute().data

        if existing:
            return jsonify({'error': 'Patient is already admitted. Discharge first.'}), 409

        # ── Mark bed as OCCUPIED ──
        supabase.table('beds').update({
            'status': 'OCCUPIED',
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', bed_id).execute()

        # ── Create admission record ──
        admission = supabase.table('admissions').insert({
            'patient_id': patient_id,
            'visit_id': visit_id,
            'bed_id': bed_id,
            'admitted_by': g.current_staff['id'],
            'admitting_doctor': g.current_staff['id'],
            'reason': reason,
            'status': 'ADMITTED'
        }).execute().data[0]

        # ── Update visit type to IPD if visit exists ──
        if visit_id:
            supabase.table('patient_visits').update({
                'visit_type': 'IPD',
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', visit_id).execute()

        log_action(g.current_staff['id'], 'PATIENT_ADMITTED', 'admission', admission['id'])
        return jsonify(admission), 201

    except Exception as e:
        return jsonify({'error': f'Admission failed: {str(e)}'}), 500


@admissions_bp.route('/patient/<patient_id>', methods=['GET'])
@require_auth
def get_patient_admission(patient_id):
    """Get current active admission for a patient, including bed/room/floor info."""
    try:
        result = supabase.table('admissions') \
            .select('*, beds(id, bed_number, bed_type, status, rooms(id, room_number, room_type, wards(id, name, ward_type, floors(id, name, floor_number)))), staff_profiles!admissions_admitting_doctor_fkey(full_name)') \
            .eq('patient_id', patient_id) \
            .eq('status', 'ADMITTED') \
            .execute()

        if not result.data:
            return jsonify(None), 200

        admission = result.data[0]
        return jsonify(admission), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admissions_bp.route('/patient/<patient_id>/history', methods=['GET'])
@require_auth
def get_admission_history(patient_id):
    """Get all admissions (past and current) for a patient."""
    try:
        result = supabase.table('admissions') \
            .select('*, beds(bed_number, rooms(room_number, wards(name, floors(name)))), staff_profiles!admissions_admitting_doctor_fkey(full_name)') \
            .eq('patient_id', patient_id) \
            .order('created_at', desc=True) \
            .execute()

        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admissions_bp.route('/<admission_id>/notes', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'NURSE', 'SUPER_ADMIN')
def add_progress_note(admission_id):
    """Add a progress/checkup note for an admitted patient."""
    try:
        data = request.get_json()
        note = supabase.table('admission_notes').insert({
            'admission_id': admission_id,
            'staff_id': g.current_staff['id'],
            'note_type': data.get('note_type', 'PROGRESS'),
            'title': data.get('title', ''),
            'content': data.get('content', ''),
            'vitals_snapshot': data.get('vitals_snapshot')
        }).execute().data[0]

        log_action(g.current_staff['id'], 'IPD_NOTE_ADDED', 'admission', admission_id)
        return jsonify(note), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admissions_bp.route('/<admission_id>/notes', methods=['GET'])
@require_auth
def get_progress_notes(admission_id):
    """Get all progress notes for an admission."""
    try:
        result = supabase.table('admission_notes') \
            .select('*, staff_profiles(full_name, role)') \
            .eq('admission_id', admission_id) \
            .order('created_at', desc=True) \
            .execute()

        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admissions_bp.route('/<admission_id>/discharge', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN')
def discharge_patient(admission_id):
    """Discharge a patient — frees the bed and updates admission status."""
    try:
        data = request.get_json() or {}

        # Get admission to find bed_id
        admission = supabase.table('admissions') \
            .select('*') \
            .eq('id', admission_id) \
            .single() \
            .execute().data

        if not admission:
            return jsonify({'error': 'Admission not found'}), 404

        if admission['status'] != 'ADMITTED':
            return jsonify({'error': 'Patient is not currently admitted'}), 400

        # ── Update admission ──
        supabase.table('admissions').update({
            'status': 'DISCHARGED',
            'discharge_date': datetime.utcnow().isoformat(),
            'discharge_notes': data.get('notes', ''),
            'discharge_summary': data.get('summary', '')
        }).eq('id', admission_id).execute()

        # ── Free up the bed ──
        supabase.table('beds').update({
            'status': 'HOUSEKEEPING',
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', admission['bed_id']).execute()

        log_action(g.current_staff['id'], 'PATIENT_DISCHARGED', 'admission', admission_id)
        return jsonify({'message': 'Patient discharged successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admissions_bp.route('/available-beds', methods=['GET'])
@require_auth
def get_available_beds():
    """Get all available beds with room/ward/floor info for the bed picker."""
    try:
        result = supabase.table('beds') \
            .select('id, bed_number, bed_type, rooms(id, room_number, room_type, wards(id, name, ward_type, floors(id, name, floor_number)))') \
            .eq('status', 'AVAILABLE') \
            .execute()

        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
