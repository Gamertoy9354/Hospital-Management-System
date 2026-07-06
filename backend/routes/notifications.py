from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from services.whatsapp_service import send_whatsapp_message
from supabase import create_client
import os
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@notifications_bp.route('/send', methods=['POST'])
@require_auth
def send_notification():
    data = request.get_json()
    channel = data.get('channel', 'WHATSAPP')
    phone = data.get('phone')
    message = data.get('message')
    patient_id = data.get('patient_id')

    if not phone or not message:
        return jsonify({'error': 'Phone and message required'}), 400

    sent = False
    if channel == 'WHATSAPP':
        sent = send_whatsapp_message(phone, message)

    supabase.table('message_log').insert({
        'patient_id': patient_id,
        'recipient_phone': phone,
        'channel': channel,
        'message_type': data.get('message_type', 'GENERAL'),
        'status': 'SENT' if sent else 'FAILED',
        'sent_at': datetime.utcnow().isoformat()
    }).execute()

    return jsonify({'sent': sent}), 200


@notifications_bp.route('/log', methods=['GET'])
@require_auth
@require_role('SUPER_ADMIN')
def get_message_log():
    patient_id = request.args.get('patient_id')
    limit = int(request.args.get('limit', 50))

    query = supabase.table('message_log') \
        .select('*') \
        .order('sent_at', desc=True) \
        .limit(limit)

    if patient_id:
        query = query.eq('patient_id', patient_id)

    return jsonify(query.execute().data), 200
