from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from services.audit_service import log_action
from supabase import create_client
import os
from datetime import datetime
from collections import Counter

beds_bp = Blueprint('beds', __name__, url_prefix='/api/beds')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@beds_bp.route('/map', methods=['GET'])
@require_auth
def get_bed_map():
    floors = supabase.table('floors') \
        .select('*,wards(*,rooms(*,beds(*)))') \
        .eq('is_active', True) \
        .order('floor_number') \
        .execute()
    return jsonify(floors.data), 200


@beds_bp.route('/summary', methods=['GET'])
@require_auth
def get_bed_summary():
    beds = supabase.table('beds').select('status').execute()
    counts = Counter(b['status'] for b in beds.data)
    return jsonify({
        'total': len(beds.data),
        'available': counts.get('AVAILABLE', 0),
        'occupied': counts.get('OCCUPIED', 0),
        'housekeeping': counts.get('HOUSEKEEPING', 0),
        'reserved': counts.get('RESERVED', 0)
    }), 200


@beds_bp.route('/<bed_id>/admit', methods=['POST'])
@require_auth
@require_role('RECEPTIONIST', 'SUPER_ADMIN')
def admit_patient(bed_id):
    data = request.get_json()
    supabase.table('beds').update({
        'status': 'OCCUPIED',
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', bed_id).execute()

    supabase.table('admissions').insert({
        'patient_id': data['patient_id'],
        'visit_id': data.get('visit_id'),
        'bed_id': bed_id,
        'admitted_by': g.current_staff['id'],
        'admitting_doctor': data.get('doctor_id'),
        'status': 'ADMITTED'
    }).execute()

    log_action(g.current_staff['id'], 'PATIENT_ADMITTED', 'bed', bed_id)
    return jsonify({'message': 'Patient admitted'}), 200


@beds_bp.route('/<bed_id>/discharge', methods=['POST'])
@require_auth
@require_role('RECEPTIONIST', 'SUPER_ADMIN')
def discharge_patient(bed_id):
    data = request.get_json()
    supabase.table('beds').update({
        'status': 'HOUSEKEEPING',
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', bed_id).execute()

    supabase.table('admissions').update({
        'status': 'DISCHARGED',
        'discharge_date': datetime.utcnow().isoformat(),
        'discharge_notes': data.get('notes')
    }).eq('bed_id', bed_id).eq('status', 'ADMITTED').execute()

    log_action(g.current_staff['id'], 'PATIENT_DISCHARGED', 'bed', bed_id)
    return jsonify({'message': 'Patient discharged'}), 200


@beds_bp.route('/<bed_id>/clean', methods=['POST'])
@require_auth
@require_role('RECEPTIONIST', 'NURSE', 'SUPER_ADMIN')
def mark_bed_clean(bed_id):
    supabase.table('beds').update({
        'status': 'AVAILABLE',
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', bed_id).execute()

    log_action(g.current_staff['id'], 'BED_MARKED_CLEAN', 'bed', bed_id)
    return jsonify({'message': 'Bed available'}), 200


@beds_bp.route('/<bed_id>/status', methods=['PUT'])
@require_auth
@require_role('RECEPTIONIST', 'NURSE', 'SUPER_ADMIN')
def update_bed_status(bed_id):
    data = request.get_json()
    valid_statuses = ['AVAILABLE', 'OCCUPIED', 'HOUSEKEEPING', 'RESERVED']
    if data['status'] not in valid_statuses:
        return jsonify({'error': 'Invalid status'}), 400

    supabase.table('beds').update({
        'status': data['status'],
        'notes': data.get('notes'),
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', bed_id).execute()

    return jsonify({'message': 'Updated'}), 200


# --- CRUD for floors/wards/rooms/beds (admin) ---

@beds_bp.route('/floors', methods=['GET', 'POST'])
@require_auth
def floors():
    if request.method == 'GET':
        result = supabase.table('floors') \
            .select('*') \
            .order('floor_number') \
            .execute()
        return jsonify(result.data), 200

    data = request.get_json()
    result = supabase.table('floors').insert(data).execute()
    return jsonify(result.data[0]), 201


@beds_bp.route('/floors/<floor_id>', methods=['PUT', 'DELETE'])
@require_auth
@require_role('SUPER_ADMIN')
def manage_floor(floor_id):
    if request.method == 'DELETE':
        supabase.table('floors').update({'is_active': False}).eq('id', floor_id).execute()
        return jsonify({'message': 'Floor deactivated'}), 200

    data = request.get_json()
    result = supabase.table('floors').update(data).eq('id', floor_id).execute()
    return jsonify(result.data[0]), 200


@beds_bp.route('/wards', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def create_ward():
    result = supabase.table('wards').insert(request.get_json()).execute()
    return jsonify(result.data[0]), 201


@beds_bp.route('/wards/<ward_id>', methods=['PUT', 'DELETE'])
@require_auth
@require_role('SUPER_ADMIN')
def manage_ward(ward_id):
    if request.method == 'DELETE':
        supabase.table('wards').update({'is_active': False}).eq('id', ward_id).execute()
        return jsonify({'message': 'Ward deactivated'}), 200

    data = request.get_json()
    result = supabase.table('wards').update(data).eq('id', ward_id).execute()
    return jsonify(result.data[0]), 200


@beds_bp.route('/rooms', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def create_room():
    result = supabase.table('rooms').insert(request.get_json()).execute()
    return jsonify(result.data[0]), 201


@beds_bp.route('/rooms/<room_id>', methods=['PUT', 'DELETE'])
@require_auth
@require_role('SUPER_ADMIN')
def manage_room(room_id):
    if request.method == 'DELETE':
        supabase.table('rooms').update({'is_active': False}).eq('id', room_id).execute()
        return jsonify({'message': 'Room deactivated'}), 200

    data = request.get_json()
    result = supabase.table('rooms').update(data).eq('id', room_id).execute()
    return jsonify(result.data[0]), 200


@beds_bp.route('/beds-crud', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def create_bed():
    result = supabase.table('beds').insert(request.get_json()).execute()
    return jsonify(result.data[0]), 201


@beds_bp.route('/beds-crud/<bed_id>', methods=['PUT', 'DELETE'])
@require_auth
@require_role('SUPER_ADMIN')
def manage_bed(bed_id):
    if request.method == 'DELETE':
        supabase.table('beds').delete().eq('id', bed_id).execute()
        return jsonify({'message': 'Bed deleted'}), 200

    data = request.get_json()
    result = supabase.table('beds').update(data).eq('id', bed_id).execute()
    return jsonify(result.data[0]), 200
