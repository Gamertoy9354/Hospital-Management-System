from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from supabase import create_client
import os
import traceback

supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Step 1: Verify JWT (only catch auth-related errors here)
        try:
            verify_jwt_in_request()
        except (NoAuthorizationError, InvalidHeaderError, ExpiredSignatureError, InvalidTokenError) as e:
            return jsonify({'error': f'Authentication required: {str(e)}'}), 401
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401

        # Step 2: Load staff profile
        try:
            staff_id = get_jwt_identity()
            result = supabase.table('staff_profiles') \
                .select('*') \
                .eq('id', staff_id) \
                .eq('is_active', True) \
                .single() \
                .execute()
            if not result.data:
                return jsonify({'error': 'Account not found or inactive'}), 401
            g.current_staff = result.data
        except Exception as e:
            return jsonify({'error': f'Failed to load staff profile: {str(e)}'}), 401

        # Step 3: Call the actual route handler (NOT inside auth try/except!)
        return f(*args, **kwargs)

    return decorated


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_staff'):
                return jsonify({'error': 'Authentication required'}), 401
            if g.current_staff['role'] not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
