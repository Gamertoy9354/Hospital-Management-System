import requests
import os
import secrets
from datetime import datetime, timedelta


def _get_supabase():
    """Lazy init supabase client to avoid import-time errors."""
    from supabase import create_client
    return create_client(
        os.environ.get('SUPABASE_URL'),
        os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    )


def send_otp(phone: str) -> bool:
    """Generate and send OTP via MSG91."""
    otp = str(secrets.randbelow(900000) + 100000)
    expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

    supabase = _get_supabase()
    supabase.table('otp_store').upsert({
        'phone': phone,
        'otp': otp,
        'expires_at': expires
    }).execute()

    auth_key = os.environ.get('MSG91_AUTH_KEY')
    template_id = os.environ.get('MSG91_TEMPLATE_ID')

    if not auth_key or not template_id:
        print(f"[DEV] OTP for {phone}: {otp}  (SMS not configured)")
        return True  # In dev mode, pretend it was sent

    url = "https://api.msg91.com/api/v5/otp"
    payload = {
        "template_id": template_id,
        "mobile": f"91{phone}",
        "authkey": auth_key,
        "otp": otp
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception:
        return False


def verify_otp(phone: str, otp: str) -> bool:
    """Verify OTP against stored value."""
    supabase = _get_supabase()
    result = supabase.table('otp_store') \
        .select('*') \
        .eq('phone', phone) \
        .execute()

    if not result.data:
        return False

    record = result.data[0]
    if record['otp'] != otp:
        return False

    if datetime.fromisoformat(record['expires_at'].replace('Z', '+00:00').replace('+00:00', '')) < datetime.utcnow():
        return False

    supabase.table('otp_store').delete().eq('phone', phone).execute()
    return True
