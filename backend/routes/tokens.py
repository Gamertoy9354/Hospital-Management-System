from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from supabase import create_client
import os
from datetime import date, datetime

tokens_bp = Blueprint('tokens', __name__, url_prefix='/api/tokens')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@tokens_bp.route('/issue', methods=['POST'])
@require_auth
@require_role('RECEPTIONIST', 'SUPER_ADMIN')
def issue_token():
    data = request.get_json()
    today = date.today().isoformat()
    department = data['department']

    existing = supabase.table('opd_tokens') \
        .select('token_number') \
        .eq('token_date', today) \
        .eq('department', department) \
        .order('token_number', desc=True) \
        .limit(1) \
        .execute()

    next_num = (existing.data[0]['token_number'] + 1) if existing.data else 1

    token = supabase.table('opd_tokens').insert({
        'token_number': next_num,
        'token_date': today,
        'department': department,
        'doctor_id': data.get('doctor_id'),
        'patient_id': data.get('patient_id'),
        'patient_name': data.get('patient_name'),
        'guardian_phone': data.get('guardian_phone'),
        'issued_by': g.current_staff['id'],
        'status': 'WAITING'
    }).execute()

    return jsonify({
        'token_number': next_num,
        'token_id': token.data[0]['id']
    }), 201


@tokens_bp.route('/today', methods=['GET'])
@require_auth
def get_today_tokens():
    department = request.args.get('department')
    today = date.today().isoformat()

    query = supabase.table('opd_tokens') \
        .select('*') \
        .eq('token_date', today)

    if department:
        query = query.eq('department', department)

    return jsonify(query.order('token_number').execute().data), 200


@tokens_bp.route('/<token_id>/call', methods=['POST'])
@require_auth
def call_token(token_id):
    supabase.table('opd_tokens').update({
        'status': 'IN_PROGRESS',
        'called_at': datetime.utcnow().isoformat()
    }).eq('id', token_id).execute()
    return jsonify({'message': 'Token called'}), 200


@tokens_bp.route('/<token_id>/complete', methods=['POST'])
@require_auth
def complete_token(token_id):
    supabase.table('opd_tokens').update({
        'status': 'COMPLETED',
        'completed_at': datetime.utcnow().isoformat()
    }).eq('id', token_id).execute()
    return jsonify({'message': 'Done'}), 200


@tokens_bp.route('/<token_id>/skip', methods=['POST'])
@require_auth
@require_role('RECEPTIONIST', 'SUPER_ADMIN')
def skip_token(token_id):
    supabase.table('opd_tokens').update({
        'status': 'SKIPPED'
    }).eq('id', token_id).execute()
    return jsonify({'message': 'Skipped'}), 200


@tokens_bp.route('/queue-display', methods=['GET'])
def queue_display():
    """No auth — for TV display screen."""
    today = date.today().isoformat()
    department = request.args.get('department')

    q_in = supabase.table('opd_tokens') \
        .select('token_number,patient_name,department') \
        .eq('token_date', today) \
        .eq('status', 'IN_PROGRESS')

    q_wait = supabase.table('opd_tokens') \
        .select('token_number,patient_name,department') \
        .eq('token_date', today) \
        .eq('status', 'WAITING')

    if department:
        q_in = q_in.eq('department', department)
        q_wait = q_wait.eq('department', department)

    return jsonify({
        'current': q_in.execute().data,
        'next': q_wait.order('token_number').limit(5).execute().data
    }), 200
