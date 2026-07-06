from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from supabase import create_client
import os
from datetime import date, datetime
from collections import Counter

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@dashboard_bp.route('/stats', methods=['GET'])
@require_auth
def get_dashboard_stats():
    today = date.today().isoformat()

    # Today's OPD tokens
    try:
        tokens = supabase.table('opd_tokens') \
            .select('status') \
            .eq('token_date', today) \
            .execute()
        token_counts = Counter(t['status'] for t in tokens.data)
        token_data = tokens.data
    except:
        token_counts = Counter()
        token_data = []

    # Bed summary
    try:
        beds = supabase.table('beds').select('status').execute()
        bed_counts = Counter(b['status'] for b in beds.data)
        bed_data = beds.data
    except:
        bed_counts = Counter()
        bed_data = []

    # Today's visits
    try:
        visits = supabase.table('patient_visits') \
            .select('status') \
            .eq('visit_date', today) \
            .execute()
        visit_counts = Counter(v['status'] for v in visits.data)
        visit_data = visits.data
    except:
        visit_counts = Counter()
        visit_data = []

    # Active admissions
    try:
        admissions = supabase.table('admissions') \
            .select('id') \
            .eq('status', 'ADMITTED') \
            .execute()
        admitted_count = len(admissions.data)
    except:
        admitted_count = 0

    # Pending prescriptions
    try:
        pending_rx = supabase.table('prescriptions') \
            .select('id') \
            .eq('status', 'DRAFT') \
            .execute()
        pending_count = len(pending_rx.data)
    except:
        pending_count = 0

    return jsonify({
        'today_tokens': {
            'total': len(token_data),
            'waiting': token_counts.get('WAITING', 0),
            'in_progress': token_counts.get('IN_PROGRESS', 0),
            'completed': token_counts.get('COMPLETED', 0),
            'skipped': token_counts.get('SKIPPED', 0)
        },
        'beds': {
            'total': len(bed_data),
            'available': bed_counts.get('AVAILABLE', 0),
            'occupied': bed_counts.get('OCCUPIED', 0),
            'housekeeping': bed_counts.get('HOUSEKEEPING', 0),
            'reserved': bed_counts.get('RESERVED', 0)
        },
        'today_visits': {
            'total': len(visit_data),
            'open': visit_counts.get('OPEN', 0),
            'completed': visit_counts.get('COMPLETED', 0)
        },
        'admitted_patients': admitted_count,
        'pending_prescriptions': pending_count
    }), 200


@dashboard_bp.route('/recent-patients', methods=['GET'])
@require_auth
def get_recent_patients():
    try:
        limit = int(request.args.get('limit', 5))
        result = supabase.table('patient_visits') \
            .select('id,visit_date,visit_type,chief_complaint,status,patient_profiles(id,full_name,patient_uid,date_of_birth,guardian_phone)') \
            .order('created_at', desc=True) \
            .limit(limit) \
            .execute()
        return jsonify(result.data), 200
    except Exception as e:
        import traceback
        error_msg = f"Dashboard Error: {str(e)}"
        print(f"❌ {error_msg}\n{traceback.format_exc()}")
        return jsonify({'error': error_msg, 'details': str(e)}), 500


@dashboard_bp.route('/audit', methods=['GET'])
@require_auth
@require_role('SUPER_ADMIN')
def get_audit_log():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 25))
    action_filter = request.args.get('action')
    entity_filter = request.args.get('entity_type')
    search = request.args.get('search', '').strip()

    offset = (page - 1) * limit

    query = supabase.table('audit_log') \
        .select('*,staff_profiles(full_name)') \
        .order('created_at', desc=True)

    if action_filter:
        query = query.eq('action', action_filter)
    if entity_filter:
        query = query.eq('entity_type', entity_filter)

    result = query.range(offset, offset + limit - 1).execute()
    return jsonify(result.data), 200


@dashboard_bp.route('/departments', methods=['GET'])
@require_auth
def get_departments():
    result = supabase.table('departments') \
        .select('*') \
        .eq('is_active', True) \
        .order('name') \
        .execute()
    return jsonify(result.data), 200


@dashboard_bp.route('/departments', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def create_department():
    data = request.get_json()
    result = supabase.table('departments').insert(data).execute()
    return jsonify(result.data[0]), 201


@dashboard_bp.route('/drug-master', methods=['GET'])
@require_auth
def get_drugs():
    q = request.args.get('q', '').strip()

    query = supabase.table('drug_master') \
        .select('*') \
        .order('name')

    if q:
        query = query.ilike('name', f'%{q}%')

    result = query.execute()
    return jsonify(result.data), 200


@dashboard_bp.route('/drug-master', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def create_drug():
    data = request.get_json()
    # Convert numeric fields
    for field in ['adult_dose_mg', 'stock_quantity', 'price_per_unit']:
        if field in data and data[field] in ('', None):
            data.pop(field, None)
        elif field in data:
            data[field] = float(data[field]) if field == 'price_per_unit' else int(float(data[field]))
    result = supabase.table('drug_master').insert(data).execute()
    return jsonify(result.data[0]), 201


@dashboard_bp.route('/drug-master/<drug_id>', methods=['PUT'])
@require_auth
@require_role('SUPER_ADMIN')
def update_drug(drug_id):
    data = request.get_json()
    for field in ['adult_dose_mg', 'stock_quantity', 'price_per_unit']:
        if field in data and data[field] in ('', None):
            data[field] = None
        elif field in data:
            data[field] = float(data[field]) if field == 'price_per_unit' else int(float(data[field]))
    result = supabase.table('drug_master') \
        .update(data) \
        .eq('id', drug_id) \
        .execute()
    return jsonify(result.data[0]), 200


@dashboard_bp.route('/drug-master/<drug_id>/toggle', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def toggle_drug(drug_id):
    current = supabase.table('drug_master') \
        .select('is_active') \
        .eq('id', drug_id) \
        .single() \
        .execute().data

    new_status = not current['is_active']
    supabase.table('drug_master') \
        .update({'is_active': new_status}) \
        .eq('id', drug_id) \
        .execute()

    return jsonify({'is_active': new_status}), 200


@dashboard_bp.route('/drug-master/seed', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def seed_drugs():
    """Seed demo drugs with Indian MRP prices and stock quantities."""
    try:
        # Clear existing drugs first
        existing = supabase.table('drug_master').select('id').execute().data
        for row in existing:
            supabase.table('drug_master').delete().eq('id', row['id']).execute()

        DRUGS = [
            # --- Analgesics / Antipyretics ---
            {"name": "Paracetamol 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Analgesic", "manufacturer": "Cipla", "price_per_unit": 1.50, "stock_quantity": 5000},
            {"name": "Paracetamol Syrup", "dosage_form": "SYRUP", "strength": "120mg/5ml", "adult_dose_mg": 500, "category": "Analgesic", "manufacturer": "GSK", "price_per_unit": 45.00, "stock_quantity": 300},
            {"name": "Paracetamol Drops", "dosage_form": "DROPS", "strength": "100mg/ml", "category": "Analgesic", "manufacturer": "Abbott", "price_per_unit": 35.00, "stock_quantity": 200},
            {"name": "Ibuprofen 400mg", "dosage_form": "TABLET", "strength": "400mg", "adult_dose_mg": 400, "category": "NSAID", "manufacturer": "Abbott", "price_per_unit": 3.50, "stock_quantity": 3000},
            {"name": "Ibuprofen Syrup", "dosage_form": "SYRUP", "strength": "100mg/5ml", "adult_dose_mg": 400, "category": "NSAID", "manufacturer": "FDC", "price_per_unit": 55.00, "stock_quantity": 250},
            {"name": "Mefenamic Acid 250mg", "dosage_form": "TABLET", "strength": "250mg", "adult_dose_mg": 500, "category": "NSAID", "manufacturer": "Blue Cross", "price_per_unit": 4.00, "stock_quantity": 2000},
            {"name": "Diclofenac 50mg", "dosage_form": "TABLET", "strength": "50mg", "adult_dose_mg": 50, "category": "NSAID", "manufacturer": "Novartis", "price_per_unit": 2.50, "stock_quantity": 2500},
            {"name": "Aspirin 325mg", "dosage_form": "TABLET", "strength": "325mg", "adult_dose_mg": 325, "category": "Analgesic", "manufacturer": "USV", "price_per_unit": 1.00, "stock_quantity": 4000},
            # --- Antibiotics ---
            {"name": "Amoxicillin 500mg", "dosage_form": "CAPSULE", "strength": "500mg", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Cipla", "price_per_unit": 6.00, "stock_quantity": 3000},
            {"name": "Amoxicillin Syrup", "dosage_form": "SYRUP", "strength": "250mg/5ml", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Cipla", "price_per_unit": 65.00, "stock_quantity": 200},
            {"name": "Amoxicillin+Clavulanate 625mg", "dosage_form": "TABLET", "strength": "625mg", "adult_dose_mg": 625, "category": "Antibiotic", "manufacturer": "GSK", "price_per_unit": 22.00, "stock_quantity": 2000},
            {"name": "Azithromycin 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Alkem", "price_per_unit": 30.00, "stock_quantity": 1500},
            {"name": "Azithromycin Syrup", "dosage_form": "SYRUP", "strength": "200mg/5ml", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Pfizer", "price_per_unit": 85.00, "stock_quantity": 150},
            {"name": "Cefixime 200mg", "dosage_form": "TABLET", "strength": "200mg", "adult_dose_mg": 200, "category": "Antibiotic", "manufacturer": "Mankind", "price_per_unit": 18.00, "stock_quantity": 2000},
            {"name": "Cefixime Syrup", "dosage_form": "SYRUP", "strength": "100mg/5ml", "adult_dose_mg": 200, "category": "Antibiotic", "manufacturer": "Mankind", "price_per_unit": 75.00, "stock_quantity": 180},
            {"name": "Cephalexin 500mg", "dosage_form": "CAPSULE", "strength": "500mg", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Ranbaxy", "price_per_unit": 12.00, "stock_quantity": 1500},
            {"name": "Ciprofloxacin 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Cipla", "price_per_unit": 8.00, "stock_quantity": 2500},
            {"name": "Metronidazole 400mg", "dosage_form": "TABLET", "strength": "400mg", "adult_dose_mg": 400, "category": "Antibiotic", "manufacturer": "Abbott", "price_per_unit": 3.00, "stock_quantity": 3000},
            {"name": "Doxycycline 100mg", "dosage_form": "CAPSULE", "strength": "100mg", "adult_dose_mg": 100, "category": "Antibiotic", "manufacturer": "Sun Pharma", "price_per_unit": 7.00, "stock_quantity": 2000},
            {"name": "Ofloxacin 200mg", "dosage_form": "TABLET", "strength": "200mg", "adult_dose_mg": 200, "category": "Antibiotic", "manufacturer": "Cipla", "price_per_unit": 6.50, "stock_quantity": 2000},
            {"name": "Cotrimoxazole DS", "dosage_form": "TABLET", "strength": "DS", "adult_dose_mg": 960, "category": "Antibiotic", "manufacturer": "Abbott", "price_per_unit": 4.00, "stock_quantity": 1500},
            {"name": "Ceftriaxone 1g", "dosage_form": "INJECTION", "strength": "1g", "adult_dose_mg": 1000, "category": "Antibiotic", "manufacturer": "Aristo", "price_per_unit": 55.00, "stock_quantity": 500},
            {"name": "Gentamicin 80mg", "dosage_form": "INJECTION", "strength": "80mg/2ml", "adult_dose_mg": 80, "category": "Antibiotic", "manufacturer": "Cipla", "price_per_unit": 12.00, "stock_quantity": 400},
            # --- Antihistamines ---
            {"name": "Cetirizine 10mg", "dosage_form": "TABLET", "strength": "10mg", "adult_dose_mg": 10, "category": "Antihistamine", "manufacturer": "Dr. Reddy's", "price_per_unit": 2.00, "stock_quantity": 4000},
            {"name": "Cetirizine Syrup", "dosage_form": "SYRUP", "strength": "5mg/5ml", "adult_dose_mg": 10, "category": "Antihistamine", "manufacturer": "Cipla", "price_per_unit": 40.00, "stock_quantity": 250},
            {"name": "Levocetirizine 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 5, "category": "Antihistamine", "manufacturer": "Sun Pharma", "price_per_unit": 3.50, "stock_quantity": 3000},
            {"name": "Chlorpheniramine 4mg", "dosage_form": "TABLET", "strength": "4mg", "adult_dose_mg": 4, "category": "Antihistamine", "manufacturer": "Wallace", "price_per_unit": 1.50, "stock_quantity": 3000},
            {"name": "Montelukast 10mg", "dosage_form": "TABLET", "strength": "10mg", "adult_dose_mg": 10, "category": "Anti-allergy", "manufacturer": "Sun Pharma", "price_per_unit": 8.00, "stock_quantity": 1500},
            # --- GI / Antacids ---
            {"name": "Omeprazole 20mg", "dosage_form": "CAPSULE", "strength": "20mg", "adult_dose_mg": 20, "category": "Antacid/PPI", "manufacturer": "Dr. Reddy's", "price_per_unit": 5.00, "stock_quantity": 3000},
            {"name": "Pantoprazole 40mg", "dosage_form": "TABLET", "strength": "40mg", "adult_dose_mg": 40, "category": "Antacid/PPI", "manufacturer": "Alkem", "price_per_unit": 7.00, "stock_quantity": 2500},
            {"name": "Ranitidine 150mg", "dosage_form": "TABLET", "strength": "150mg", "adult_dose_mg": 150, "category": "Antacid/H2", "manufacturer": "Cadila", "price_per_unit": 3.00, "stock_quantity": 2000},
            {"name": "Domperidone 10mg", "dosage_form": "TABLET", "strength": "10mg", "adult_dose_mg": 10, "category": "Anti-emetic", "manufacturer": "Torrent", "price_per_unit": 2.50, "stock_quantity": 2500},
            {"name": "Ondansetron 4mg", "dosage_form": "TABLET", "strength": "4mg", "adult_dose_mg": 4, "category": "Anti-emetic", "manufacturer": "Sun Pharma", "price_per_unit": 8.00, "stock_quantity": 1500},
            {"name": "ORS Powder", "dosage_form": "POWDER", "strength": "1 sachet", "category": "Rehydration", "manufacturer": "FDC", "price_per_unit": 12.00, "stock_quantity": 2000},
            {"name": "Zinc Sulphate 20mg", "dosage_form": "TABLET", "strength": "20mg", "adult_dose_mg": 20, "category": "Supplement", "manufacturer": "FDC", "price_per_unit": 2.00, "stock_quantity": 3000},
            {"name": "Lactulose Syrup", "dosage_form": "SYRUP", "strength": "10g/15ml", "category": "Laxative", "manufacturer": "Abbott", "price_per_unit": 120.00, "stock_quantity": 100},
            # --- Cough & Respiratory ---
            {"name": "Ambroxol Syrup", "dosage_form": "SYRUP", "strength": "30mg/5ml", "adult_dose_mg": 30, "category": "Mucolytic", "manufacturer": "Cipla", "price_per_unit": 50.00, "stock_quantity": 300},
            {"name": "Dextromethorphan Syrup", "dosage_form": "SYRUP", "strength": "10mg/5ml", "adult_dose_mg": 30, "category": "Antitussive", "manufacturer": "Abbott", "price_per_unit": 60.00, "stock_quantity": 200},
            {"name": "Salbutamol Syrup", "dosage_form": "SYRUP", "strength": "2mg/5ml", "adult_dose_mg": 4, "category": "Bronchodilator", "manufacturer": "Cipla", "price_per_unit": 35.00, "stock_quantity": 250},
            {"name": "Salbutamol Inhaler", "dosage_form": "INHALER", "strength": "100mcg/puff", "category": "Bronchodilator", "manufacturer": "Cipla", "price_per_unit": 125.00, "stock_quantity": 150},
            # --- Steroids ---
            {"name": "Prednisolone 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 20, "category": "Steroid", "manufacturer": "Cadila", "price_per_unit": 3.00, "stock_quantity": 2000},
            {"name": "Prednisolone Syrup", "dosage_form": "SYRUP", "strength": "5mg/5ml", "adult_dose_mg": 20, "category": "Steroid", "manufacturer": "Cadila", "price_per_unit": 45.00, "stock_quantity": 200},
            {"name": "Dexamethasone 0.5mg", "dosage_form": "TABLET", "strength": "0.5mg", "adult_dose_mg": 4, "category": "Steroid", "manufacturer": "Zydus", "price_per_unit": 2.50, "stock_quantity": 1500},
            {"name": "Hydrocortisone 100mg", "dosage_form": "INJECTION", "strength": "100mg", "adult_dose_mg": 100, "category": "Steroid", "manufacturer": "Pfizer", "price_per_unit": 30.00, "stock_quantity": 300},
            # --- Vitamins & Supplements ---
            {"name": "Multivitamin Syrup", "dosage_form": "SYRUP", "strength": "Multi", "category": "Supplement", "manufacturer": "Abbott", "price_per_unit": 85.00, "stock_quantity": 300},
            {"name": "Iron Syrup (Ferrous Ascorbate)", "dosage_form": "SYRUP", "strength": "30mg/5ml", "adult_dose_mg": 100, "category": "Supplement", "manufacturer": "Emcure", "price_per_unit": 70.00, "stock_quantity": 250},
            {"name": "Calcium + Vitamin D3", "dosage_form": "TABLET", "strength": "500mg+250IU", "adult_dose_mg": 500, "category": "Supplement", "manufacturer": "Abbott", "price_per_unit": 7.00, "stock_quantity": 2000},
            {"name": "Vitamin B Complex", "dosage_form": "TABLET", "strength": "Multi", "category": "Supplement", "manufacturer": "Abbott", "price_per_unit": 2.00, "stock_quantity": 3000},
            {"name": "Vitamin C 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Supplement", "manufacturer": "Limee", "price_per_unit": 3.50, "stock_quantity": 3000},
            {"name": "Folic Acid 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 5, "category": "Supplement", "manufacturer": "GSK", "price_per_unit": 1.00, "stock_quantity": 5000},
            # --- Antihypertensives ---
            {"name": "Amlodipine 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 5, "category": "Antihypertensive", "manufacturer": "Pfizer", "price_per_unit": 4.00, "stock_quantity": 2000},
            {"name": "Enalapril 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 5, "category": "ACE Inhibitor", "manufacturer": "Cadila", "price_per_unit": 5.00, "stock_quantity": 1500},
            {"name": "Losartan 50mg", "dosage_form": "TABLET", "strength": "50mg", "adult_dose_mg": 50, "category": "ARB", "manufacturer": "Cipla", "price_per_unit": 6.00, "stock_quantity": 1500},
            {"name": "Atenolol 50mg", "dosage_form": "TABLET", "strength": "50mg", "adult_dose_mg": 50, "category": "Beta Blocker", "manufacturer": "Abbott", "price_per_unit": 3.50, "stock_quantity": 2000},
            # --- Anti-diabetic ---
            {"name": "Metformin 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Anti-diabetic", "manufacturer": "USV", "price_per_unit": 2.50, "stock_quantity": 3000},
            {"name": "Glimepiride 1mg", "dosage_form": "TABLET", "strength": "1mg", "adult_dose_mg": 1, "category": "Anti-diabetic", "manufacturer": "Sanofi", "price_per_unit": 4.00, "stock_quantity": 1500},
            # --- Topical ---
            {"name": "Clotrimazole Cream 1%", "dosage_form": "CREAM", "strength": "1%", "category": "Antifungal", "manufacturer": "Bayer", "price_per_unit": 45.00, "stock_quantity": 300},
            {"name": "Mupirocin Ointment 2%", "dosage_form": "OINTMENT", "strength": "2%", "category": "Antibiotic Topical", "manufacturer": "GSK", "price_per_unit": 110.00, "stock_quantity": 200},
            {"name": "Betamethasone Cream", "dosage_form": "CREAM", "strength": "0.05%", "category": "Steroid Topical", "manufacturer": "GSK", "price_per_unit": 55.00, "stock_quantity": 250},
            {"name": "Silver Sulfadiazine Cream", "dosage_form": "CREAM", "strength": "1%", "category": "Burn Care", "manufacturer": "Dr. Reddy's", "price_per_unit": 65.00, "stock_quantity": 150},
            # --- Eye / Ear Drops ---
            {"name": "Ciprofloxacin Eye Drops", "dosage_form": "DROPS", "strength": "0.3%", "category": "Antibiotic Eye", "manufacturer": "Cipla", "price_per_unit": 30.00, "stock_quantity": 300},
            {"name": "Ofloxacin Ear Drops", "dosage_form": "DROPS", "strength": "0.3%", "category": "Antibiotic Ear", "manufacturer": "FDC", "price_per_unit": 35.00, "stock_quantity": 300},
            {"name": "Tobramycin Eye Drops", "dosage_form": "DROPS", "strength": "0.3%", "category": "Antibiotic Eye", "manufacturer": "Novartis", "price_per_unit": 60.00, "stock_quantity": 200},
            # --- Injectables ---
            {"name": "Ranitidine Injection", "dosage_form": "INJECTION", "strength": "50mg/2ml", "adult_dose_mg": 50, "category": "Antacid/H2", "manufacturer": "Neon", "price_per_unit": 8.00, "stock_quantity": 500},
            {"name": "Midazolam 5mg", "dosage_form": "INJECTION", "strength": "5mg/ml", "adult_dose_mg": 5, "category": "Sedative", "manufacturer": "Neon", "price_per_unit": 22.00, "stock_quantity": 200},
            {"name": "Adrenaline 1mg", "dosage_form": "INJECTION", "strength": "1mg/ml", "adult_dose_mg": 1, "category": "Emergency", "manufacturer": "Neon", "price_per_unit": 15.00, "stock_quantity": 300},
            {"name": "Atropine 0.6mg", "dosage_form": "INJECTION", "strength": "0.6mg/ml", "adult_dose_mg": 0.6, "category": "Emergency", "manufacturer": "Neon", "price_per_unit": 10.00, "stock_quantity": 300},
            # --- Anti-seizure ---
            {"name": "Phenytoin 100mg", "dosage_form": "TABLET", "strength": "100mg", "adult_dose_mg": 300, "category": "Anti-epileptic", "manufacturer": "Abbott", "price_per_unit": 3.50, "stock_quantity": 1000},
            {"name": "Sodium Valproate 200mg", "dosage_form": "TABLET", "strength": "200mg", "adult_dose_mg": 600, "category": "Anti-epileptic", "manufacturer": "Sun Pharma", "price_per_unit": 5.00, "stock_quantity": 800},
        ]

        count = 0
        for drug in DRUGS:
            payload = {k: v for k, v in drug.items() if v is not None}
            payload['is_active'] = True
            try:
                supabase.table('drug_master').insert(payload).execute()
                count += 1
            except:
                pass

        return jsonify({
            'message': f'Seeded {count} drugs with Indian MRP pricing',
            'count': count
        }), 200

    except Exception as e:
        return jsonify({'error': f'Seed failed: {str(e)}'}), 500



@dashboard_bp.route('/clear-all-data', methods=['POST'])
@require_auth
@require_role('SUPER_ADMIN')
def clear_all_data():
    """FULL nuclear wipe — clears ALL data including infrastructure.
    Only preserves the currently logged-in admin so they don't get locked out.
    Tables are deleted in strict foreign-key-safe order (deepest children first)."""
    try:
        cleared = {}
        current_staff_id = g.current_staff['id']

        # ── Phase 1: Clinical / transactional data (children first) ──
        phase1 = [
            'admission_notes',
            'admissions',
            'lab_reports',
            'prescriptions',
            'patient_vitals',
            'opd_tokens',
            'patient_visits',
            'patient_profiles',
            'audit_log',
        ]

        for table in phase1:
            try:
                rows = supabase.table(table).select('id').execute().data
                if rows:
                    for row in rows:
                        supabase.table(table).delete().eq('id', row['id']).execute()
                cleared[table] = len(rows)
            except Exception as e:
                cleared[table] = f'skipped ({str(e)[:60]})'

        # ── Phase 2: Infrastructure (beds → rooms → wards → floors) ──
        infra_tables = ['beds', 'rooms', 'wards', 'floors']
        for table in infra_tables:
            try:
                rows = supabase.table(table).select('id').execute().data
                if rows:
                    for row in rows:
                        supabase.table(table).delete().eq('id', row['id']).execute()
                cleared[table] = len(rows)
            except Exception as e:
                cleared[table] = f'skipped ({str(e)[:60]})'

        # ── Phase 3: Staff (keep current admin) ──
        try:
            staff = supabase.table('staff_profiles').select('id').execute().data
            count = 0
            for s in staff:
                if s['id'] != current_staff_id:
                    supabase.table('staff_profiles').delete().eq('id', s['id']).execute()
                    count += 1
            cleared['staff_profiles'] = f'{count} deleted (kept current admin)'
        except Exception as e:
            cleared['staff_profiles'] = f'skipped ({str(e)[:60]})'

        # ── Phase 4: Hospital config only (preserve departments & drugs) ──
        config_tables = ['hospital_config']
        for table in config_tables:
            try:
                rows = supabase.table(table).select('id').execute().data
                if rows:
                    for row in rows:
                        supabase.table(table).delete().eq('id', row['id']).execute()
                cleared[table] = len(rows)
            except Exception as e:
                cleared[table] = f'skipped ({str(e)[:60]})'

        cleared['departments'] = 'preserved'
        cleared['drug_master'] = 'preserved'

        return jsonify({
            'message': 'System wipe completed. Admin account, departments, and drugs were preserved.',
            'cleared': cleared
        }), 200

    except Exception as e:
        return jsonify({'error': f'Clear failed: {str(e)}'}), 500
