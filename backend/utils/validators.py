import re
from datetime import datetime


def validate_phone(phone: str) -> bool:
    """Validate Indian phone number (10 digits)."""
    return bool(re.match(r'^\d{10}$', phone.strip()))


def validate_email(email: str) -> bool:
    """Basic email validation."""
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email.strip()))


def validate_date(date_str: str) -> bool:
    """Validate date string in YYYY-MM-DD format."""
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except (ValueError, TypeError):
        return False


def validate_required_fields(data: dict, fields: list) -> list:
    """Check that all required fields are present and non-empty."""
    missing = []
    for field in fields:
        if field not in data or not str(data[field]).strip():
            missing.append(field)
    return missing
