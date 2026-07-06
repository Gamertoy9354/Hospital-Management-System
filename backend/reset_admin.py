"""
Reset admin password using direct REST API (no supabase client needed).
Usage: python reset_admin.py
"""
import os
import bcrypt
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ['SUPABASE_URL']
SERVICE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

ADMIN_PHONE = '9999999999'
ADMIN_PASSWORD = 'admin123'

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Generate correct bcrypt hash
password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
print(f"Generated hash: {password_hash}")

# Check if admin exists
resp = requests.get(
    f'{SUPABASE_URL}/rest/v1/staff_profiles?phone=eq.{ADMIN_PHONE}',
    headers=headers
)
print(f"Search response: {resp.status_code}")

if resp.status_code == 200 and resp.json():
    # Update existing
    staff_id = resp.json()[0]['id']
    upd = requests.patch(
        f'{SUPABASE_URL}/rest/v1/staff_profiles?id=eq.{staff_id}',
        headers=headers,
        json={'password_hash': password_hash}
    )
    print(f"Update response: {upd.status_code}")
    print(f"✅ Updated admin password for phone: {ADMIN_PHONE}")
else:
    # Create new admin
    ins = requests.post(
        f'{SUPABASE_URL}/rest/v1/staff_profiles',
        headers=headers,
        json={
            'full_name': 'Super Admin',
            'phone': ADMIN_PHONE,
            'password_hash': password_hash,
            'role': 'SUPER_ADMIN',
            'department': 'Administration',
            'is_active': True
        }
    )
    print(f"Insert response: {ins.status_code} - {ins.text}")
    print(f"✅ Created admin account with phone: {ADMIN_PHONE}")

print(f"\nLogin credentials:")
print(f"  Phone:    {ADMIN_PHONE}")
print(f"  Password: {ADMIN_PASSWORD}")
