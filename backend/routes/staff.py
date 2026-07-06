from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from services.audit_service import log_action
from supabase import create_client
import os
import bcrypt

staff_bp = Blueprint('staff', __name__, url_prefix='/api/staff')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@staff_bp.route('/', methods=['GET'])
@require_auth
@require_role('SUPER_ADMIN')
def get_all_staff():
    try:
        result = supabase.table('staff_profiles') \
            .select('id,full_name,role,department,specialization,qualification,phone,is_active,created_at') \
            .order('created_at', desc=True) \
            .execute()
        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@staff_bp.route('/', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def create_staff():
    try:
        data = request.get_json()
        password = data.pop('password', None)

        if not password:
            return jsonify({'error': 'Password is required'}), 400

        # Hash password with bcrypt
        password_hash = bcrypt.hashpw(
            password.encode(), bcrypt.gensalt()
        ).decode()

        # Build clean payload
        payload = {
            'full_name': data.get('full_name', '').strip(),
            'phone': data.get('phone', '').strip(),
            'role': data.get('role', 'DOCTOR'),
            'password_hash': password_hash,
            'is_active': True
        }

        # Optional fields — only include if non-empty
        if data.get('department'):
            payload['department'] = data['department']
        if data.get('specialization'):
            payload['specialization'] = data['specialization']
        if data.get('qualification'):
            payload['qualification'] = data['qualification']

        result = supabase.table('staff_profiles').insert(payload).execute()
        staff = result.data[0]
        log_action(g.current_staff['id'], 'STAFF_CREATED', 'staff', staff['id'])

        # Remove password_hash from response
        staff.pop('password_hash', None)
        return jsonify(staff), 201

    except Exception as e:
        return jsonify({'error': f'Failed to create staff: {str(e)}'}), 500


@staff_bp.route('/<staff_id>', methods=['PUT'])
@require_auth
@require_role('SUPER_ADMIN')
def update_staff(staff_id):
    try:
        data = request.get_json()

        # If password is being changed, hash it
        if 'password' in data:
            password = data.pop('password')
            if password:
                data['password_hash'] = bcrypt.hashpw(
                    password.encode(), bcrypt.gensalt()
                ).decode()

        # Clean empty strings for optional fields
        for key in ['department', 'specialization', 'qualification']:
            if key in data and not data[key]:
                data[key] = None

        result = supabase.table('staff_profiles') \
            .update(data) \
            .eq('id', staff_id) \
            .execute()

        log_action(g.current_staff['id'], 'STAFF_UPDATED', 'staff', staff_id)
        staff = result.data[0]
        staff.pop('password_hash', None)
        return jsonify(staff), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@staff_bp.route('/<staff_id>/toggle', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def toggle_staff(staff_id):
    try:
        current = supabase.table('staff_profiles') \
            .select('is_active') \
            .eq('id', staff_id) \
            .single() \
            .execute().data

        new_status = not current['is_active']
        supabase.table('staff_profiles') \
            .update({'is_active': new_status}) \
            .eq('id', staff_id) \
            .execute()

        log_action(
            g.current_staff['id'],
            'STAFF_DEACTIVATED' if not new_status else 'STAFF_ACTIVATED',
            'staff', staff_id
        )
        return jsonify({'is_active': new_status}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@staff_bp.route('/doctors', methods=['GET'])
@require_auth
def get_doctors():
    """Get all active doctors — used for dropdowns."""
    result = supabase.table('staff_profiles') \
        .select('id,full_name,department') \
        .eq('role', 'DOCTOR') \
        .eq('is_active', True) \
        .execute()
    return jsonify(result.data), 200
