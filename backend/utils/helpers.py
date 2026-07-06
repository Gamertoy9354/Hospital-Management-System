from datetime import datetime, date
import pytz

IST = pytz.timezone('Asia/Kolkata')


def format_ist(dt_str: str) -> str:
    """Convert UTC timestamp string to IST formatted string."""
    if not dt_str:
        return ''
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        ist_dt = dt.astimezone(IST)
        return ist_dt.strftime('%d %b %Y, %I:%M %p')
    except Exception:
        return dt_str


def calculate_age(dob: str) -> dict:
    """Calculate age from date of birth string."""
    try:
        birth = date.fromisoformat(str(dob))
        today = date.today()
        years = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
        months = (today.month - birth.month) % 12
        return {'years': years, 'months': months, 'display': f'{years}y {months}m' if years > 0 else f'{months}m'}
    except Exception:
        return {'years': 0, 'months': 0, 'display': 'N/A'}
