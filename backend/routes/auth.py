from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from services.audit_service import log_action
from supabase import create_client
import os
import bcrypt

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)

# ── DEV MODE: Set to True to skip OTP verification ──
SKIP_OTP = True


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    if not phone or not password:
        return jsonify({'error': 'Phone and password required'}), 400

    result = supabase.table('staff_profiles') \
        .select('*') \
        .eq('phone', phone) \
        .eq('is_active', True) \
        .execute()

    if not result.data:
        return jsonify({'error': 'Invalid credentials'}), 401

    staff = result.data[0]

    if not bcrypt.checkpw(password.encode(), staff['password_hash'].encode()):
        return jsonify({'error': 'Invalid credentials'}), 401

    if SKIP_OTP:
        # ── DEV: Skip OTP, issue tokens directly ──
        access_token = create_access_token(identity=staff['id'])
        refresh_token = create_refresh_token(identity=staff['id'])
        log_action(staff['id'], 'LOGIN', 'staff', staff['id'])

        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'staff': {
                'id': staff['id'],
                'full_name': staff['full_name'],
                'role': staff['role'],
                'department': staff.get('department'),
                'phone': staff['phone']
            },
            'skip_otp': True
        }), 200
    else:
        # ── PRODUCTION: Send OTP ──
        from services.sms_service import send_otp
        if not send_otp(phone):
            return jsonify({'error': 'Failed to send OTP. Try again.'}), 500
        return jsonify({'message': 'OTP sent', 'phone': phone}), 200


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp_route():
    if SKIP_OTP:
        return jsonify({'error': 'OTP verification disabled in dev mode'}), 400

    from services.sms_service import verify_otp
    data = request.get_json()
    phone = data.get('phone', '').strip()
    otp = data.get('otp', '').strip()

    if not verify_otp(phone, otp):
        return jsonify({'error': 'Invalid or expired OTP'}), 401

    staff = supabase.table('staff_profiles') \
        .select('id,full_name,role,department,phone') \
        .eq('phone', phone) \
        .eq('is_active', True) \
        .single() \
        .execute().data

    access_token = create_access_token(identity=staff['id'])
    refresh_token = create_refresh_token(identity=staff['id'])
    log_action(staff['id'], 'LOGIN', 'staff', staff['id'])

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'staff': staff
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    return jsonify({
        'access_token': create_access_token(identity=identity)
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    log_action(get_jwt_identity(), 'LOGOUT', 'staff', get_jwt_identity())
    return jsonify({'message': 'Logged out'}), 200
