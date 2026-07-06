from flask import Blueprint, request, jsonify, g, send_file
from middleware.auth_middleware import require_auth, require_role
from services.prescription_engine import calculate_pediatric_dose, generate_prescription_uid
from services.audit_service import log_action
from services.ai_service import generate_prescription_insights
from services.pdf_service import generate_patient_pdf, generate_staff_pdf
from supabase import create_client
import os
import json
import base64
from io import BytesIO
from datetime import datetime, date

prescriptions_bp = Blueprint('prescriptions', __name__, url_prefix='/api/prescriptions')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@prescriptions_bp.route('/dose-suggestion', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'SUPER_ADMIN')
def dose_suggestion():
    data = request.get_json()
    return jsonify(calculate_pediatric_dose(
        data['drug_name'], float(data['weight_kg'])
    )), 200


@prescriptions_bp.route('/drug-search', methods=['GET'])
@require_auth
def drug_search():
    """Search drugs from drug master for prescription autocomplete."""
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify([]), 200

    try:
        result = supabase.table('drug_master') \
            .select('*') \
            .ilike('name', f'%{q}%') \
            .eq('is_active', True) \
            .limit(10) \
            .execute()
        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def process_next_appointment(drugs_list, patient_id, doctor_id):
    next_appt = next((d for d in drugs_list if d.get('name') == 'Next Appointment'), None)
    if next_appt and next_appt.get('instructions'):
        appt_date = next_appt['instructions']
        existing = supabase.table('patient_visits') \
            .select('id') \
            .eq('patient_id', patient_id) \
            .eq('doctor_id', doctor_id) \
            .eq('status', 'OPEN') \
            .gte('visit_date', f"{appt_date}T00:00:00") \
            .lte('visit_date', f"{appt_date}T23:59:59") \
            .execute()
        if not existing.data:
            supabase.table('patient_visits').insert({
                'patient_id': patient_id,
                'doctor_id': doctor_id,
                'visit_date': f"{appt_date}T00:00:00Z",
                'status': 'OPEN',
                'visit_type': 'OPD',
                'chief_complaint': 'Follow-up appointment'
            }).execute()


@prescriptions_bp.route('/', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'SUPER_ADMIN')
def create_prescription():
    """Create a new prescription.

    DB schema for 'prescriptions' table:
    id, prescription_uid, visit_id, patient_id, prescribed_by,
    diagnosis, notes, drugs (jsonb), status, version,
    parent_prescription_id, patient_weight_kg, patient_age_months,
    approved_at, approved_by, dispensed_at, dispensed_by,
    created_at, updated_at
    """
    try:
        data = request.get_json()

        uid = generate_prescription_uid()

        # Build drugs JSON array from frontend data
        drug_list = data.get('drugs', data.get('medicines', []))
        drugs_json = []
        for d in drug_list:
            drugs_json.append({
                'drug_id': d.get('drug_id'),
                'name': d.get('name', ''),
                'dosage_form': d.get('dosage_form', ''),
                'strength': d.get('strength', ''),
                'dose': d.get('dose', ''),
                'frequency': d.get('frequency', ''),
                'duration_days': int(d.get('duration_days', 0)) if d.get('duration_days') else None,
                'route': d.get('route', 'ORAL'),
                'instructions': d.get('instructions', ''),
                'price_per_unit': float(d['price_per_unit']) if d.get('price_per_unit') else None,
                'total_quantity': int(d['total_quantity']) if d.get('total_quantity') else 1,
                'is_fee': d.get('is_fee', False)
            })

        rx = {
            'prescription_uid': uid,
            'patient_id': data['patient_id'],
            'visit_id': data['visit_id'],
            'prescribed_by': g.current_staff['id'],
            'status': data.get('status', 'DRAFT'),
            'diagnosis': data.get('diagnosis'),
            'notes': data.get('notes'),
            'drugs': json.dumps(drugs_json),
            'version': 1,
        }

        if data.get('patient_weight_kg'):
            rx['patient_weight_kg'] = data['patient_weight_kg']
        if data.get('patient_age_months'):
            rx['patient_age_months'] = data['patient_age_months']

        rx_result = supabase.table('prescriptions').insert(rx).execute()
        rx_id = rx_result.data[0]['id']

        log_action(g.current_staff['id'], 'PRESCRIPTION_CREATED', 'prescription', rx_id)
        process_next_appointment(drug_list, data['patient_id'], g.current_staff['id'])

        return jsonify({'id': rx_id, 'prescription_uid': uid}), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to create prescription: {str(e)}'}), 500


@prescriptions_bp.route('/<rx_id>/approve', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'SUPER_ADMIN')
def approve_prescription(rx_id):
    try:
        supabase.table('prescriptions') \
            .update({
                'status': 'APPROVED',
                'approved_at': datetime.utcnow().isoformat(),
                'approved_by': g.current_staff['id']
            }) \
            .eq('id', rx_id) \
            .execute()

        log_action(g.current_staff['id'], 'PRESCRIPTION_APPROVED', 'prescription', rx_id)
        return jsonify({'message': 'Approved'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@prescriptions_bp.route('/<rx_id>', methods=['GET'])
@require_auth
def get_prescription(rx_id):
    try:
        rx = supabase.table('prescriptions') \
            .select('*,staff_profiles!prescriptions_prescribed_by_fkey(full_name,department)') \
            .eq('id', rx_id) \
            .single() \
            .execute().data

        # Parse drugs JSON if it's a string
        if rx and isinstance(rx.get('drugs'), str):
            rx['drugs'] = json.loads(rx['drugs'])

        return jsonify(rx), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@prescriptions_bp.route('/<rx_id>', methods=['PUT'])
@require_auth
@require_role('DOCTOR', 'PHARMACIST', 'SUPER_ADMIN')
def update_prescription(rx_id):
    try:
        data = request.get_json()
        current = supabase.table('prescriptions') \
            .select('version, patient_id') \
            .eq('id', rx_id) \
            .single() \
            .execute().data

        new_version = (current.get('version') or 0) + 1

        update_payload = {
            'version': new_version,
            'updated_at': datetime.utcnow().isoformat()
        }

        if 'diagnosis' in data:
            update_payload['diagnosis'] = data['diagnosis']
        if 'notes' in data:
            update_payload['notes'] = data['notes']
        if 'status' in data:
            update_payload['status'] = data['status']

        # Update drugs if provided
        drug_list = data.get('drugs', data.get('medicines'))
        if drug_list is not None:
            drugs_json = []
            for d in drug_list:
                drugs_json.append({
                    'drug_id': d.get('drug_id'),
                    'name': d.get('name', ''),
                    'dosage_form': d.get('dosage_form', ''),
                    'strength': d.get('strength', ''),
                    'dose': d.get('dose', ''),
                    'frequency': d.get('frequency', ''),
                    'duration_days': int(d.get('duration_days', 0)) if d.get('duration_days') else None,
                    'route': d.get('route', 'ORAL'),
                    'instructions': d.get('instructions', ''),
                    'price_per_unit': float(d['price_per_unit']) if d.get('price_per_unit') else None,
                    'total_quantity': int(d['total_quantity']) if d.get('total_quantity') else 1,
                    'is_fee': d.get('is_fee', False)
                })
            update_payload['drugs'] = json.dumps(drugs_json)

        supabase.table('prescriptions') \
            .update(update_payload) \
            .eq('id', rx_id) \
            .execute()

        log_action(g.current_staff['id'], 'PRESCRIPTION_UPDATED', 'prescription', rx_id)

        if 'drugs' in data:
            process_next_appointment(data['drugs'], current['patient_id'], g.current_staff['id'])

        return jsonify({'message': 'Updated', 'version': new_version}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@prescriptions_bp.route('/patient/<patient_id>', methods=['GET'])
@require_auth
def get_patient_prescriptions(patient_id):
    try:
        result = supabase.table('prescriptions') \
            .select('*,staff_profiles!prescriptions_prescribed_by_fkey(full_name)') \
            .eq('patient_id', patient_id) \
            .order('created_at', desc=True) \
            .execute()

        # Parse drugs JSON
        for rx in result.data:
            if isinstance(rx.get('drugs'), str):
                rx['drugs'] = json.loads(rx['drugs'])

        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@prescriptions_bp.route('/active', methods=['GET'])
@require_auth
def get_active_prescriptions():
    """Get all active/pending prescriptions — for pharmacist."""
    try:
        status = request.args.get('status', 'APPROVED')
        result = supabase.table('prescriptions') \
            .select('*,staff_profiles!prescriptions_prescribed_by_fkey(full_name),patient_profiles(full_name,patient_uid,guardian_phone)') \
            .eq('status', status) \
            .order('created_at', desc=True) \
            .limit(50) \
            .execute()

        for rx in result.data:
            if isinstance(rx.get('drugs'), str):
                rx['drugs'] = json.loads(rx['drugs'])

        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@prescriptions_bp.route('/<rx_id>/dispense', methods=['POST'])
@require_auth
@require_role('PHARMACIST', 'SUPER_ADMIN')
def dispense_prescription(rx_id):
    try:
        supabase.table('prescriptions') \
            .update({
                'status': 'DISPENSED',
                'dispensed_at': datetime.utcnow().isoformat(),
                'dispensed_by': g.current_staff['id']
            }) \
            .eq('id', rx_id) \
            .execute()

        log_action(g.current_staff['id'], 'PRESCRIPTION_DISPENSED', 'prescription', rx_id)
        return jsonify({'message': 'Marked as dispensed'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────
# AI INSIGHTS
# ─────────────────────────────────────────────────
@prescriptions_bp.route('/<rx_id>/ai-insights', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'SUPER_ADMIN')
def generate_ai_insights(rx_id):
    """Generate AI-powered prescription details using NVIDIA API."""
    try:
        # Fetch prescription
        rx = supabase.table('prescriptions') \
            .select('*') \
            .eq('id', rx_id) \
            .single().execute().data

        if not rx:
            return jsonify({'error': 'Prescription not found'}), 404

        # Fetch patient
        patient = supabase.table('patient_profiles') \
            .select('*') \
            .eq('id', rx['patient_id']) \
            .single().execute().data

        # Parse drugs
        drugs = json.loads(rx['drugs']) if isinstance(rx['drugs'], str) else rx['drugs']

        # Calculate age display
        age_display = 'Unknown'
        if patient.get('date_of_birth'):
            dob = datetime.strptime(patient['date_of_birth'], '%Y-%m-%d')
            diff = datetime.now() - dob
            years = diff.days // 365
            months = (diff.days % 365) // 30
            age_display = f"{years}y {months}m" if years > 0 else f"{months}m"

        # Get vitals if available
        weight = rx.get('patient_weight_kg', 'Unknown')

        patient_data = {
            'full_name': patient.get('full_name', ''),
            'age_display': age_display,
            'weight_kg': weight,
            'blood_group': patient.get('blood_group', 'Unknown'),
            'gender': patient.get('gender', 'Unknown'),
            'allergies': patient.get('allergies', []),
        }

        insights = generate_prescription_insights(
            patient_data,
            rx.get('diagnosis', ''),
            drugs,
            rx.get('notes', '')
        )

        # Save insights to prescription
        supabase.table('prescriptions') \
            .update({'notes': (rx.get('notes') or '') + '\n\n--- AI INSIGHTS ---\n' + insights}) \
            .eq('id', rx_id) \
            .execute()

        return jsonify({'insights': insights}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'AI generation failed: {str(e)}'}), 500


# ─────────────────────────────────────────────────
# PDF GENERATION
# ─────────────────────────────────────────────────
def _get_hospital_config():
    """Fetch hospital config as a flat dict."""
    result = supabase.table('hospital_config').select('key,value').execute()
    cfg = {}
    for row in result.data:
        cfg[row['key']] = row['value']
    return cfg


@prescriptions_bp.route('/<rx_id>/generate-pdf', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'SUPER_ADMIN')
def generate_pdfs(rx_id):
    """Generate both patient and staff PDFs, store in Supabase, save URLs."""
    try:
        # Fetch prescription with doctor info
        rx = supabase.table('prescriptions') \
            .select('*,staff_profiles!prescriptions_prescribed_by_fkey(full_name,department)') \
            .eq('id', rx_id) \
            .single().execute().data

        if not rx:
            return jsonify({'error': 'Prescription not found'}), 404

        # Fetch patient
        patient = supabase.table('patient_profiles') \
            .select('*') \
            .eq('id', rx['patient_id']) \
            .single().execute().data

        # Parse drugs
        drugs = json.loads(rx['drugs']) if isinstance(rx['drugs'], str) else rx['drugs']

        # Hospital config
        config = _get_hospital_config()
        consultation_fee = float(config.get('consultation_fee', 0))

        # Calculate medicine total using total_quantity
        medicine_total = sum(float(d.get('price_per_unit', 0) or 0) * float(d.get('total_quantity', 1) or 1) for d in drugs)
        grand_total = medicine_total + consultation_fee

        # Age display
        age_display = 'Unknown'
        if patient.get('date_of_birth'):
            dob = datetime.strptime(patient['date_of_birth'], '%Y-%m-%d')
            diff = datetime.now() - dob
            years = diff.days // 365
            months = (diff.days % 365) // 30
            age_display = f"{years}y {months}m" if years > 0 else f"{months}m"

        # Fetch visit type and doctor
        visit_type = 'OPD'
        visit_doctor = {}
        admission_fee = 0
        admitted_days = 0
        if rx.get('visit_id'):
            try:
                visit = supabase.table('patient_visits').select('visit_type, doctor_id, staff_profiles(full_name, department)').eq('id', rx['visit_id']).single().execute().data
                visit_type = visit.get('visit_type', 'OPD')
                visit_doctor = visit.get('staff_profiles', {}) or {}
                
                # Check for admission
                admission_res = supabase.table('admissions').select('created_at, discharge_date, discharge_summary, status').eq('visit_id', rx['visit_id']).order('created_at', desc=True).limit(1).execute().data
                if admission_res:
                    adm = admission_res[0]
                    if adm.get('status') == 'DISCHARGED':
                        summary = adm.get('discharge_summary', '') or ''
                        import re
                        match = re.search(r'\[FEE:([\d\.]+)\]', summary)
                        if match:
                            admission_fee = float(match.group(1))
                        
                        if adm.get('created_at') and adm.get('discharge_date'):
                            d1 = datetime.fromisoformat(adm['created_at'].replace('Z', '+00:00')[:19])
                            d2 = datetime.fromisoformat(adm['discharge_date'].replace('Z', '+00:00')[:19])
                            admitted_days = max(1, (d2 - d1).days)
            except Exception as e:
                print(f"Error fetching visit/admission: {e}")

        grand_total += admission_fee

        # Extract AI insights from notes (after delimiter)
        ai_insights = ''
        notes_clean = rx.get('notes', '') or ''
        if '--- AI INSIGHTS ---' in notes_clean:
            parts = notes_clean.split('--- AI INSIGHTS ---', 1)
            notes_clean = parts[0].strip()
            ai_insights = parts[1].strip()

        # Use the actual visit doctor if available, otherwise fallback to whoever generated it
        doctor = visit_doctor if visit_doctor.get('full_name') else rx.get('staff_profiles', {})

        rx_data = {
            'prescription_uid': rx.get('prescription_uid', ''),
            'prescription_date': datetime.fromisoformat(rx['created_at'].replace('Z', '+00:00')).strftime('%d-%b-%Y %I:%M %p') if rx.get('created_at') else datetime.now().strftime('%d-%b-%Y %I:%M %p'),
            'patient_name': patient.get('full_name', ''),
            'patient_uid': patient.get('patient_uid', ''),
            'patient_age': age_display,
            'gender': patient.get('gender', ''),
            'weight': rx.get('patient_weight_kg', ''),
            'blood_group': patient.get('blood_group', ''),
            'guardian_name': patient.get('guardian_name', ''),
            'guardian_phone': patient.get('guardian_phone', ''),
            'allergies': ', '.join(patient.get('allergies', [])) if patient.get('allergies') else '',
            'diagnosis': rx.get('diagnosis', ''),
            'notes': notes_clean,
            'medicines': drugs,
            'ai_insights': ai_insights,
            'doctor_name': doctor.get('full_name', ''),
            'doctor_department': doctor.get('department', ''),
            'visit_type': visit_type,
            'medicine_total': medicine_total,
            'consultation_fee': consultation_fee,
            'admission_fee': admission_fee,
            'admitted_days': admitted_days,
            'grand_total': grand_total,
            'payment_status': rx.get('status', 'UNPAID'),
        }

        # Generate PDFs
        patient_pdf = generate_patient_pdf(rx_data, config)
        staff_pdf = generate_staff_pdf(rx_data, config)

        uid = rx.get('prescription_uid', rx_id)

        # Upload to Supabase Storage
        patient_path = f"prescriptions/{uid}_patient.pdf"
        staff_path = f"prescriptions/{uid}_staff.pdf"

        for path, pdf_bytes in [(patient_path, patient_pdf), (staff_path, staff_pdf)]:
            try:
                supabase.storage.from_('medical-files').remove([path])
            except:
                pass
            supabase.storage.from_('medical-files').upload(
                path, pdf_bytes,
                {'content-type': 'application/pdf'}
            )

        patient_url = supabase.storage.from_('medical-files').get_public_url(patient_path)
        staff_url = supabase.storage.from_('medical-files').get_public_url(staff_path)

        # Save URLs to prescription record
        supabase.table('prescriptions').update({
            'status': 'APPROVED',
            'approved_at': datetime.utcnow().isoformat(),
            'approved_by': g.current_staff['id'],
        }).eq('id', rx_id).execute()

        log_action(g.current_staff['id'], 'PRESCRIPTION_PDF_GENERATED', 'prescription', rx_id)

        return jsonify({
            'message': 'PDFs generated successfully',
            'patient_pdf_url': patient_url,
            'staff_pdf_url': staff_url,
            'medicine_total': medicine_total,
            'consultation_fee': consultation_fee,
            'grand_total': grand_total,
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500


# ─────────────────────────────────────────────────
# DOWNLOAD FILE
# ─────────────────────────────────────────────────
@prescriptions_bp.route('/<rx_id>/pdf', methods=['GET'])
@require_auth
def download_pdf(rx_id):
    try:
        rx = supabase.table('prescriptions').select('prescription_uid').eq('id', rx_id).single().execute().data
        if not rx:
            return jsonify({'error': 'Not found'}), 404
            
        uid = rx['prescription_uid']
        res = supabase.storage.from_('medical-files').download(f"prescriptions/{uid}_staff.pdf")
        
        return send_file(
            BytesIO(res),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"{uid}_staff.pdf"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─────────────────────────────────────────────────
# PAYMENT & STOCK DEDUCTION
# ─────────────────────────────────────────────────
@prescriptions_bp.route('/<rx_id>/confirm-payment', methods=['POST'])
@require_auth
@require_role('RECEPTIONIST', 'SUPER_ADMIN')
def confirm_payment(rx_id):
    """Confirm payment: mark prescription as PAID, deduct stock from drug_master."""
    try:
        rx = supabase.table('prescriptions') \
            .select('*') \
            .eq('id', rx_id) \
            .single().execute().data

        if not rx:
            return jsonify({'error': 'Prescription not found'}), 404

        drugs = json.loads(rx['drugs']) if isinstance(rx['drugs'], str) else rx['drugs']

        # Deduct stock for each drug
        stock_updates = []
        for d in drugs:
            drug_id = d.get('drug_id')
            if not drug_id:
                continue
            try:
                current = supabase.table('drug_master') \
                    .select('stock_quantity,name') \
                    .eq('id', drug_id) \
                    .single().execute().data

                current_stock = current.get('stock_quantity', 0) or 0
                qty_to_deduct = int(d.get('total_quantity', 1) or 1)
                new_stock = max(0, current_stock - qty_to_deduct)

                supabase.table('drug_master') \
                    .update({'stock_quantity': new_stock}) \
                    .eq('id', drug_id) \
                    .execute()

                stock_updates.append({
                    'drug': current.get('name', drug_id),
                    'previous': current_stock,
                    'new': new_stock
                })
            except Exception as e:
                stock_updates.append({'drug': drug_id, 'error': str(e)})

        # Mark as DISPENSED (payment confirmed)
        supabase.table('prescriptions').update({
            'status': 'DISPENSED',
            'dispensed_at': datetime.utcnow().isoformat(),
            'dispensed_by': g.current_staff['id']
        }).eq('id', rx_id).execute()

        log_action(g.current_staff['id'], 'PAYMENT_CONFIRMED', 'prescription', rx_id)

        return jsonify({
            'message': 'Payment confirmed, stock updated',
            'stock_updates': stock_updates
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Payment confirmation failed: {str(e)}'}), 500


# ─────────────────────────────────────────────────
# BILLING SEARCH (for receptionist)
# ─────────────────────────────────────────────────
@prescriptions_bp.route('/billing/search', methods=['GET'])
@require_auth
@require_role('RECEPTIONIST', 'SUPER_ADMIN')
def billing_search():
    """Search prescriptions for billing by patient UID or name."""
    try:
        q = request.args.get('q', '').strip()
        if len(q) < 2:
            return jsonify([]), 200

        # Search by patient UID or name first
        patients = supabase.table('patient_profiles') \
            .select('id,full_name,patient_uid,guardian_phone') \
            .or_(f"patient_uid.ilike.%{q}%,full_name.ilike.%{q}%") \
            .limit(10).execute().data

        if not patients:
            return jsonify([]), 200

        patient_ids = [p['id'] for p in patients]
        patient_map = {p['id']: p for p in patients}

        # Get prescriptions for matched patients (APPROVED status = ready for billing)
        results = []
        for pid in patient_ids:
            rxs = supabase.table('prescriptions') \
                .select('*,staff_profiles!prescriptions_prescribed_by_fkey(full_name,department)') \
                .eq('patient_id', pid) \
                .in_('status', ['APPROVED', 'DISPENSED']) \
                .order('created_at', desc=True) \
                .limit(10).execute().data

            for rx in rxs:
                if isinstance(rx.get('drugs'), str):
                    rx['drugs'] = json.loads(rx['drugs'])
                rx['patient'] = patient_map.get(pid, {})

                # Fetch real doctor from visit
                if rx.get('visit_id'):
                    try:
                        visit = supabase.table('patient_visits') \
                            .select('doctor_id, staff_profiles(full_name, department)') \
                            .eq('id', rx['visit_id']).single().execute().data
                        if visit and visit.get('staff_profiles'):
                            rx['staff_profiles'] = visit.get('staff_profiles')
                    except Exception:
                        pass

                # Calculate totals
                drugs = rx.get('drugs', [])
                config = _get_hospital_config()
                consultation_fee = float(config.get('consultation_fee', 0))
                medicine_total = sum(float(d.get('price_per_unit', 0) or 0) * float(d.get('total_quantity', 1) or 1) for d in drugs)
                rx['medicine_total'] = medicine_total
                rx['consultation_fee'] = consultation_fee
                rx['grand_total'] = medicine_total + consultation_fee

                results.append(rx)

        return jsonify(results), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
