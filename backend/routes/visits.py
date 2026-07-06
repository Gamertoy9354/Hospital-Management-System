from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from services.audit_service import log_action
from supabase import create_client
import os
import json
from datetime import datetime, date

visits_bp = Blueprint('visits', __name__, url_prefix='/api/visits')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@visits_bp.route('/', methods=['POST'])
@require_auth
@require_role('RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN')
def create_visit():
    try:
        data = request.get_json()

        payload = {
            'patient_id': data['patient_id'],
            'visit_date': data.get('visit_date', date.today().isoformat()),
            'visit_type': data.get('visit_type', 'OPD'),
            'chief_complaint': data.get('chief_complaint', ''),
            'status': 'OPEN'
        }

        if data.get('doctor_id'):
            payload['doctor_id'] = data['doctor_id']
        if data.get('department'):
            payload['department'] = data['department']

        result = supabase.table('patient_visits').insert(payload).execute()
        visit = result.data[0]
        log_action(g.current_staff['id'], 'VISIT_CREATED', 'visit', visit['id'])
        return jsonify(visit), 201
    except Exception as e:
        return jsonify({'error': f'Failed to create visit: {str(e)}'}), 500


@visits_bp.route('/<visit_id>', methods=['GET'])
@require_auth
def get_visit(visit_id):
    try:
        # Fetch visit with patient profile
        visit = supabase.table('patient_visits') \
            .select('*,staff_profiles(full_name),patient_profiles(*)') \
            .eq('id', visit_id) \
            .single() \
            .execute().data

        if not visit:
            return jsonify({'error': 'Visit not found'}), 404

        # Fetch vitals separately (safer)
        try:
            vitals = supabase.table('patient_vitals') \
                .select('*') \
                .eq('visit_id', visit_id) \
                .order('created_at', desc=True) \
                .execute().data
            visit['patient_vitals'] = vitals
        except:
            visit['patient_vitals'] = []

        # Fetch prescriptions separately
        try:
            prescriptions = supabase.table('prescriptions') \
                .select('*') \
                .eq('visit_id', visit_id) \
                .order('created_at', desc=True) \
                .execute().data
            # Parse drugs JSON string to array
            for rx in prescriptions:
                if isinstance(rx.get('drugs'), str):
                    rx['drugs'] = json.loads(rx['drugs'])
            visit['prescriptions'] = prescriptions
        except:
            visit['prescriptions'] = []

        # Fetch lab reports separately
        try:
            lab_reports = supabase.table('lab_reports') \
                .select('*') \
                .eq('visit_id', visit_id) \
                .order('created_at', desc=True) \
                .execute().data
            visit['lab_reports'] = lab_reports
        except:
            visit['lab_reports'] = []

        # Fetch current admission if any
        try:
            patient_id = visit.get('patient_id')
            if patient_id:
                admission = supabase.table('admissions') \
                    .select('*, beds(id, bed_number, bed_type, rooms(room_number, wards(name, floors(name))))') \
                    .eq('patient_id', patient_id) \
                    .eq('status', 'ADMITTED') \
                    .execute().data
                visit['current_admission'] = admission[0] if admission else None
            else:
                visit['current_admission'] = None
        except:
            visit['current_admission'] = None

        # Fetch visit-specific admission to check for discharge data
        try:
            visit_adm = supabase.table('admissions').select('status,discharge_summary').eq('visit_id', visit_id).order('created_at', desc=True).limit(1).execute().data
            if visit_adm:
                visit['visit_admission'] = visit_adm[0]
        except:
            pass

        return jsonify(visit), 200

    except Exception as e:
        return jsonify({'error': f'Visit fetch failed: {str(e)}'}), 500


@visits_bp.route('/<visit_id>', methods=['PUT'])
@require_auth
@require_role('DOCTOR', 'SUPER_ADMIN')
def update_visit(visit_id):
    try:
        data = request.get_json()
        data['updated_at'] = datetime.utcnow().isoformat()

        result = supabase.table('patient_visits') \
            .update(data) \
            .eq('id', visit_id) \
            .execute()

        log_action(g.current_staff['id'], 'VISIT_UPDATED', 'visit', visit_id)
        return jsonify(result.data[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@visits_bp.route('/<visit_id>/vitals', methods=['POST'])
@require_auth
@require_role('NURSE', 'DOCTOR', 'SUPER_ADMIN')
def add_vitals(visit_id):
    try:
        data = request.get_json()
        data['visit_id'] = visit_id
        data['recorded_by'] = g.current_staff['id']

        result = supabase.table('patient_vitals').insert(data).execute()
        log_action(g.current_staff['id'], 'VITALS_RECORDED', 'visit', visit_id)
        return jsonify(result.data[0]), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@visits_bp.route('/today', methods=['GET'])
@require_auth
def get_today_visits():
    """Get all visits for today, optionally filtered by doctor."""
    today = date.today().isoformat()
    doctor_id = request.args.get('doctor_id')

    query = supabase.table('patient_visits') \
        .select('*,patient_profiles(id,full_name,patient_uid,date_of_birth,guardian_phone,allergies),staff_profiles(full_name)') \
        .eq('visit_date', today)

    if doctor_id:
        query = query.eq('doctor_id', doctor_id)

    result = query.order('created_at').execute()
    return jsonify(result.data), 200


@visits_bp.route('/<visit_id>/close', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'SUPER_ADMIN')
def close_visit(visit_id):
    try:
        supabase.table('patient_visits') \
            .update({
                'status': 'COMPLETED',
                'updated_at': datetime.utcnow().isoformat()
            }) \
            .eq('id', visit_id) \
            .execute()

        log_action(g.current_staff['id'], 'VISIT_CLOSED', 'visit', visit_id)
        return jsonify({'message': 'Visit closed'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
