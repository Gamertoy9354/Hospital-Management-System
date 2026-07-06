from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from services.audit_service import log_action
from supabase import create_client
import os
import json
from datetime import datetime

patients_bp = Blueprint('patients', __name__, url_prefix='/api/patients')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


def generate_patient_uid():
    """Generate sequential patient UID in format PAT-YYYY-NNNNN."""
    year = datetime.now().year
    result = supabase.table('patient_profiles') \
        .select('patient_uid') \
        .ilike('patient_uid', f'PAT-{year}-%') \
        .order('created_at', desc=True) \
        .limit(1) \
        .execute()

    last_num = 0
    if result.data:
        last_num = int(result.data[0]['patient_uid'].split('-')[2])

    return f'PAT-{year}-{str(last_num + 1).zfill(5)}'


@patients_bp.route('/list', methods=['GET'])
@require_auth
def list_patients():
    """Return all patients, most recent first."""
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    offset = (page - 1) * per_page

    result = supabase.table('patient_profiles') \
        .select('id,patient_uid,full_name,date_of_birth,guardian_name,guardian_phone,blood_group,allergies,gender,created_at') \
        .order('created_at', desc=True) \
        .range(offset, offset + per_page - 1) \
        .execute()

    return jsonify(result.data), 200


@patients_bp.route('/search', methods=['GET'])
@require_auth
def search_patients():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify([]), 200

    result = supabase.table('patient_profiles') \
        .select('id,patient_uid,full_name,date_of_birth,guardian_name,guardian_phone,blood_group,allergies,gender') \
        .or_(
            f'full_name.ilike.%{q}%,patient_uid.ilike.%{q}%,'
            f'guardian_phone.ilike.%{q}%,guardian_name.ilike.%{q}%'
        ) \
        .limit(20) \
        .execute()

    return jsonify(result.data), 200


@patients_bp.route('/admitted', methods=['GET'])
@require_auth
def get_admitted_patients():
    result = supabase.table('admissions') \
        .select('patient_id, status, patient_profiles(id,patient_uid,full_name,date_of_birth,guardian_name,guardian_phone,blood_group,allergies,gender,created_at)') \
        .eq('status', 'ADMITTED') \
        .order('created_at', desc=True) \
        .execute()
    
    patients = []
    seen = set()
    for row in result.data:
        p = row.get('patient_profiles')
        if p and p['id'] not in seen:
            patients.append(p)
            seen.add(p['id'])
            
    return jsonify(patients), 200


@patients_bp.route('/pending', methods=['GET'])
@require_auth
def get_pending_patients():
    from datetime import date
    
    query = supabase.table('patient_visits') \
        .select('patient_id, status, patient_profiles(id,patient_uid,full_name,date_of_birth,guardian_name,guardian_phone,blood_group,allergies,gender,created_at)') \
        .eq('status', 'OPEN') \
        .gte('visit_date', f"{date.today().isoformat()}T00:00:00")
    
    # If the user is a doctor, filter by their upcoming visits? Or just all scheduled?
    if g.current_staff['role'] == 'DOCTOR':
        query = query.eq('doctor_id', g.current_staff['id'])
        
    result = query.order('visit_date', desc=True).execute()

    patients = []
    seen = set()
    for row in result.data:
        p = row.get('patient_profiles')
        if p and p['id'] not in seen:
            patients.append(p)
            seen.add(p['id'])
            
    return jsonify(patients), 200



@patients_bp.route('/<patient_id>', methods=['GET'])
@require_auth
def get_patient(patient_id):
    try:
        patient = supabase.table('patient_profiles') \
            .select('*') \
            .eq('id', patient_id) \
            .single() \
            .execute().data

        visits = supabase.table('patient_visits') \
            .select('*,staff_profiles(full_name),prescriptions(id,prescription_uid,status,version,drugs),patient_vitals(*),lab_reports(*)') \
            .eq('patient_id', patient_id) \
            .order('visit_date', desc=True) \
            .execute().data

        # Parse drugs JSON for prescriptions in visits
        if visits:
            for v in visits:
                if v.get('prescriptions'):
                    for rx in v['prescriptions']:
                        if isinstance(rx.get('drugs'), str):
                            try:
                                rx['drugs'] = json.loads(rx['drugs'])
                            except:
                                rx['drugs'] = []
                        elif not rx.get('drugs'):
                            rx['drugs'] = []

        admissions = supabase.table('admissions') \
            .select('*,beds(bed_number,rooms(room_number,wards(name,floors(name))))') \
            .eq('patient_id', patient_id) \
            .order('created_at', desc=True) \
            .execute().data

        return jsonify({
            'patient': patient,
            'visits': visits,
            'admissions': admissions
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patients_bp.route('/', methods=['POST'])
@require_auth
@require_role('RECEPTIONIST', 'SUPER_ADMIN')
def create_patient():
    try:
        data = request.get_json()

        # Build clean payload — only include non-empty fields
        payload = {
            'patient_uid': generate_patient_uid(),
            'full_name': data.get('full_name', '').strip(),
            'date_of_birth': data.get('date_of_birth'),
            'gender': data.get('gender'),
            'guardian_name': data.get('guardian_name', '').strip(),
            'guardian_phone': data.get('guardian_phone', '').strip(),
        }

        # Optional fields — only include if non-empty
        if data.get('blood_group'):
            payload['blood_group'] = data['blood_group']
        if data.get('guardian_relationship'):
            payload['guardian_relationship'] = data['guardian_relationship']
        if data.get('guardian_email'):
            payload['guardian_email'] = data['guardian_email']
        if data.get('address'):
            payload['address'] = data['address']
        if data.get('city'):
            payload['city'] = data['city']

        # JSON array fields
        payload['allergies'] = data.get('allergies', [])
        payload['chronic_conditions'] = data.get('chronic_conditions', [])

        if isinstance(payload['allergies'], str):
            payload['allergies'] = [s.strip() for s in payload['allergies'].split(',') if s.strip()]
        if isinstance(payload['chronic_conditions'], str):
            payload['chronic_conditions'] = [s.strip() for s in payload['chronic_conditions'].split(',') if s.strip()]

        result = supabase.table('patient_profiles').insert(payload).execute()
        patient = result.data[0]
        log_action(g.current_staff['id'], 'PATIENT_REGISTERED', 'patient', patient['id'])
        return jsonify(patient), 201

    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


@patients_bp.route('/<patient_id>', methods=['PUT'])
@require_auth
@require_role('RECEPTIONIST', 'SUPER_ADMIN')
def update_patient(patient_id):
    try:
        data = request.get_json()
        data['updated_at'] = datetime.utcnow().isoformat()

        # Clean empty strings for CHECK constraint fields
        if 'blood_group' in data and not data['blood_group']:
            data['blood_group'] = None

        result = supabase.table('patient_profiles') \
            .update(data) \
            .eq('id', patient_id) \
            .execute()

        log_action(g.current_staff['id'], 'PATIENT_UPDATED', 'patient', patient_id)
        return jsonify(result.data[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patients_bp.route('/<patient_id>/visits', methods=['GET'])
@require_auth
def get_patient_visits(patient_id):
    result = supabase.table('patient_visits') \
        .select('*,staff_profiles(full_name)') \
        .eq('patient_id', patient_id) \
        .order('visit_date', desc=True) \
        .execute()
    return jsonify(result.data), 200
