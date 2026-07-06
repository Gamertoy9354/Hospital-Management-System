from supabase import create_client
import os

supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


def log_action(staff_id, action, entity_type=None, entity_id=None,
               old_value=None, new_value=None, ip_address=None):
    """Log an audit trail entry for any significant action."""
    try:
        supabase.table('audit_log').insert({
            'performed_by': staff_id,
            'action': action,
            'entity_type': entity_type,
            'entity_id': str(entity_id) if entity_id else None,
            'old_value': old_value,
            'new_value': new_value,
            'ip_address': ip_address
        }).execute()
    except Exception:
        pass  # Audit logging should never break the main flow
