from flask import Blueprint, request, jsonify, g
from middleware.auth_middleware import require_auth, require_role
from services.audit_service import log_action
from supabase import create_client
import os
from datetime import datetime

lab_bp = Blueprint('lab_reports', __name__, url_prefix='/api/lab-reports')
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)


@lab_bp.route('/', methods=['POST'])
@require_auth
@require_role('DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN')
def upload_lab_report():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    patient_id = request.form.get('patient_id')
    visit_id = request.form.get('visit_id')
    report_name = request.form.get('report_name', 'Lab Report')
    lab_name = request.form.get('lab_name', '')
    report_date = request.form.get('report_date', datetime.utcnow().strftime('%Y-%m-%d'))
    notes = request.form.get('notes', '')

    file_bytes = file.read()
    ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'pdf'
    file_path = f"lab-reports/{patient_id}/{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{ext}"

    supabase.storage.from_('medical-files').upload(
        file_path, file_bytes,
        {'content-type': file.content_type or 'application/pdf'}
    )

    file_url = supabase.storage.from_('medical-files').get_public_url(file_path)

    result = supabase.table('lab_reports').insert({
        'patient_id': patient_id,
        'visit_id': visit_id,
        'report_name': report_name,
        'lab_name': lab_name,
        'report_date': report_date,
        'file_url': file_url,
        'notes': notes,
        'uploaded_by': g.current_staff['id']
    }).execute()

    log_action(g.current_staff['id'], 'LAB_REPORT_UPLOADED', 'lab_report', result.data[0]['id'])
    return jsonify(result.data[0]), 201


@lab_bp.route('/patient/<patient_id>', methods=['GET'])
@require_auth
def get_patient_reports(patient_id):
    result = supabase.table('lab_reports') \
        .select('*,staff_profiles(full_name)') \
        .eq('patient_id', patient_id) \
        .order('created_at', desc=True) \
        .execute()
    return jsonify(result.data), 200
