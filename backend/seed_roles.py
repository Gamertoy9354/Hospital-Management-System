import os
import json
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

users = [
    {'phone': '1111111111', 'name': 'Demo Receptionist', 'role': 'RECEPTIONIST'},
    {'phone': '2222222222', 'name': 'Demo Pharmacist', 'role': 'PHARMACIST'},
    {'phone': '3333333333', 'name': 'Demo Nurse', 'role': 'NURSE'}
]

for u in users:
    try:
        user_resp = sb.auth.admin.create_user({'phone': '+91' + u['phone'], 'password': 'password123', 'phone_confirm': True})
        sb.table('staff_profiles').update({'full_name': u['name'], 'role': u['role'], 'is_active': True}).eq('id', user_resp.user.id).execute()
        print(f"Created {u['role']} - Phone: {u['phone']} / Password: password123")
    except Exception as e:
        print(f"Failed {u['name']}: {e}")
