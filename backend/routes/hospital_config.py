from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from supabase import create_client
import os

config_bp = Blueprint('hospital_config', __name__, url_prefix='/api/hospital-config')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@config_bp.route('/public', methods=['GET'])
def get_public_config():
    """No auth — returns name, logo, tagline only."""
    result = supabase.table('hospital_config') \
        .select('key,value') \
        .in_('key', [
            'hospital_name', 'logo_url', 'tagline',
            'address', 'phone', 'email'
        ]) \
        .execute()
    return jsonify(result.data), 200


@config_bp.route('/', methods=['GET'])
@require_auth
@require_role('SUPER_ADMIN')
def get_all_config():
    result = supabase.table('hospital_config').select('*').execute()
    return jsonify(result.data), 200


@config_bp.route('/', methods=['PUT'])
@require_auth
@require_role('SUPER_ADMIN')
def update_config():
    updates = request.get_json()
    payload = [{'key': k, 'value': str(v)} for k, v in updates.items()]
    if payload:
        supabase.table('hospital_config').upsert(payload, on_conflict='key').execute()
    return jsonify({'message': 'Config updated'}), 200


@config_bp.route('/logo', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def upload_logo():
    if 'logo' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    try:
        file = request.files['logo']
        file_bytes = file.read()
        path = 'hospital-logo/logo.png'

        # Remove existing file first (ignore errors if it doesn't exist)
        try:
            supabase.storage.from_('medical-files').remove([path])
        except:
            pass

        # Upload fresh
        supabase.storage.from_('medical-files').upload(
            path, file_bytes,
            {'content-type': file.content_type or 'image/png'}
        )

        url = supabase.storage.from_('medical-files').get_public_url(path)

        # Add cache-buster so browsers show the new logo immediately
        import time
        url_with_bust = f"{url}?t={int(time.time())}"

        supabase.table('hospital_config').upsert({
            'key': 'logo_url',
            'value': url_with_bust
        }, on_conflict='key').execute()

        return jsonify({'logo_url': url_with_bust}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Logo upload failed: {str(e)}'}), 500
