from dotenv import load_dotenv
load_dotenv()
import os, requests

url = os.environ['SUPABASE_URL']
key = os.environ['SUPABASE_SERVICE_ROLE_KEY']

# Use the SQL endpoint to check constraints
headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Try to find valid statuses by checking which values are accepted
# The error said: prescriptions_status_check
# Let's try common status values
from supabase import create_client
sb = create_client(url, key)

# Get existing prescription to test
rx = sb.table('prescriptions').select('id,status').limit(1).single().execute().data
print("Current:", rx)

# Try setting DISPENSED
test_statuses = ['DRAFT', 'PENDING', 'APPROVED', 'DISPENSED', 'COMPLETED', 'CANCELLED', 'PAID']
for s in test_statuses:
    try:
        sb.table('prescriptions').update({'status': s}).eq('id', rx['id']).execute()
        print(f"  {s}: OK")
    except Exception as e:
        err = str(e)
        if 'status_check' in err:
            print(f"  {s}: REJECTED")
        else:
            print(f"  {s}: ERROR - {err[:80]}")

# Restore original
sb.table('prescriptions').update({'status': rx['status']}).eq('id', rx['id']).execute()
print("Restored to:", rx['status'])
