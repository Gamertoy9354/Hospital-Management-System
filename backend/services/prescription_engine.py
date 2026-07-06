from supabase import create_client
import os
from datetime import datetime

supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


def calculate_pediatric_dose(drug_name: str, weight_kg: float) -> dict:
    """Calculate weight-based pediatric dosing with max dose capping."""
    result = supabase.table('drug_master') \
        .select('*') \
        .ilike('name', f'%{drug_name}%') \
        .eq('is_active', True) \
        .execute()

    if not result.data:
        return {'suggested': None, 'warning': None}

    drug = result.data[0]

    if not drug.get('dose_per_kg_mg'):
        return {
            'suggested': drug.get('standard_dosage'),
            'warning': None,
            'form': drug.get('form'),
            'route': drug.get('route'),
            'common_frequency': drug.get('common_frequency'),
            'common_duration': drug.get('common_duration')
        }

    calculated = float(drug['dose_per_kg_mg']) * weight_kg
    warning = None

    if drug.get('max_dose_mg') and calculated > float(drug['max_dose_mg']):
        calculated = float(drug['max_dose_mg'])
        warning = f"Dose capped at maximum: {drug['max_dose_mg']}mg"

    return {
        'suggested': f"{round(calculated, 1)}mg",
        'max_dose': drug.get('max_dose_mg'),
        'form': drug.get('form'),
        'route': drug.get('route'),
        'common_frequency': drug.get('common_frequency'),
        'common_duration': drug.get('common_duration'),
        'warning': warning
    }


def generate_prescription_uid() -> str:
    """Generate sequential prescription UID in format RX-YYYY-NNNNN."""
    year = datetime.now().year
    result = supabase.table('prescriptions') \
        .select('prescription_uid') \
        .ilike('prescription_uid', f'RX-{year}-%') \
        .order('created_at', desc=True) \
        .limit(1) \
        .execute()

    last_num = 0
    if result.data:
        last_num = int(result.data[0]['prescription_uid'].split('-')[2])

    return f"RX-{year}-{str(last_num + 1).zfill(5)}"
