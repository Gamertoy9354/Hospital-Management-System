"""
PDF Service — MedScript-style prescription PDFs.
Two variants:
  PATIENT copy — Clean clinical prescription
  STAFF copy   — Same layout + billing section at bottom with totals
Inspired by MedScript-Lite (https://github.com/agnibho/MedScript-Lite)
"""
from io import BytesIO
from xhtml2pdf import pisa
from jinja2 import Template
from datetime import datetime
import re

# ──────────────────────────────────────────────────
# PATIENT COPY — Clean MedScript-style
# ──────────────────────────────────────────────────
PATIENT_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 15mm 12mm 25mm 12mm; }
body { font-family: Helvetica, sans-serif; margin: 0; padding: 0; color: #111; font-size: 12px; }
.header-area { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 10px; }
.header-table { width: 100%; border-collapse: collapse; }
.header-table td { vertical-align: top; padding: 2px 0; }
.doc-name { font-size: 20px; font-weight: bold; color: #111; margin: 0; }
.doc-qual { font-size: 13px; color: #333; margin: 2px 0; }
.doc-reg { font-size: 11px; color: #666; }
.hosp-name { font-size: 14px; font-weight: bold; text-align: right; }
.hosp-detail { font-size: 10px; color: #555; text-align: right; line-height: 1.5; }
.meta-row { text-align: right; font-size: 10px; color: #888; margin-bottom: 8px; }
.patient-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.patient-table td { padding: 3px 6px; font-size: 12px; }
.patient-table .lbl { font-weight: bold; width: 70px; }
.allergy { color: #c00; font-weight: bold; font-size: 11px; padding: 4px 8px; background: #fff0f0; border: 1px solid #fcc; margin-bottom: 8px; }
.two-col { width: 100%; border-collapse: collapse; }
.two-col td { vertical-align: top; padding: 8px; }
.col-left { width: 35%; border-right: 2px solid #999; }
.col-right { width: 65%; }
.col-head { font-weight: bold; font-size: 13px; text-align: center; padding-bottom: 6px; border-bottom: 1px solid #ddd; margin-bottom: 8px; }
.dx { font-weight: bold; font-size: 13px; margin: 4px 0; }
.notes-text { font-size: 11px; color: #444; white-space: pre-wrap; margin-top: 6px; line-height: 1.5; }
.rx-symbol { font-size: 24px; font-weight: bold; color: #111; }
.med-list { list-style: none; padding: 0; margin: 0; counter-reset: med; }
.med-list li { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee; counter-increment: med; }
.med-list li::before { content: counter(med) ". "; font-weight: bold; color: #333; }
.med-name { font-weight: bold; font-size: 13px; }
.med-detail { font-size: 11px; color: #555; font-style: italic; }
.med-price { font-size: 10px; color: #888; float: right; }

.ai-note-wrapper { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; }
.ai-note { background: #f8fdf8; border: 1px solid #cec; padding: 10px 12px; font-size: 11px; color: #444; line-height: 1.5; border-radius: 4px; }
.ai-note strong { color: #222; font-weight: bold; }

.total-box { margin-top: 10px; text-align: right; font-size: 12px; padding: 6px 10px; background: #f5f5f5; border: 1px solid #ddd; }
.total-box .grand { font-size: 14px; font-weight: bold; color: #111; }
.footer-area { border-top: 2px solid #111; padding-top: 8px; margin-top: 20px; }
.footer-table { width: 100%; }
.footer-table td { vertical-align: top; font-size: 11px; }
.sig-area { text-align: right; }
.sig-line { border-top: 1px solid #333; display: inline-block; width: 160px; text-align: center; padding-top: 4px; font-size: 11px; }
.footer-note { font-size: 9px; color: #aaa; text-align: center; margin-top: 10px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header-area">
<table class="header-table">
<tr>
{% if logo_url %}
<td style="width:15%; text-align: left; padding-right: 15px;">
<img src="{{ logo_url }}" style="max-height:60px;" alt="Logo">
</td>
{% endif %}
<td style="width:{% if logo_url %}45%{% else %}60%{% endif %}">
<p class="doc-name">Dr. {{ doctor_name }}</p>
<p class="doc-qual">{{ doctor_department }}</p>
{% if registration_number %}<p class="doc-reg">Reg: {{ registration_number }}</p>{% endif %}
</td>
<td style="width:40%">
<p class="hosp-name">{{ hospital_name }}</p>
<div class="hosp-detail">
{% if tagline %}{{ tagline }}<br>{% endif %}
{{ address }}<br>
{% if phone %}Tel: {{ phone }}{% endif %}
{% if email %} | {{ email }}{% endif %}
</div>
</td>
</tr>
</table>
</div>

<!-- META -->
<div class="meta-row">
<strong>ID:</strong> {{ prescription_uid }} &nbsp;&nbsp;
<strong>PID:</strong> {{ patient_uid }} &nbsp;&nbsp;
<strong>Date:</strong> {{ prescription_date }}
</div>

<!-- PATIENT INFO -->
<table class="patient-table">
<tr>
<td class="lbl">Name:</td><td>{{ patient_name }}</td>
<td class="lbl">Age:</td><td>{{ patient_age }}</td>
<td class="lbl">Sex:</td><td>{{ gender }}</td>
</tr>
<tr>
<td class="lbl">Weight:</td><td>{{ weight }} kg</td>
<td class="lbl">Blood:</td><td>{{ blood_group }}</td>
<td class="lbl">Phone:</td><td>{{ guardian_phone }}</td>
</tr>
{% if admitted_days %}
<tr>
<td class="lbl">Admission:</td><td colspan="7" style="color: #6d28d9; font-weight: bold;">Discharged after {{ admitted_days }} days of IPD Care</td>
</tr>
{% endif %}
</table>
{% if allergies %}<div class="allergy">Alert ALLERGIES: {{ allergies }}</div>{% endif %}

<!-- TWO COLUMN BODY -->
<table class="two-col">
<tr>
<!-- LEFT: Clinical Notes -->
<td class="col-left">
<div class="col-head">Clinical Notes</div>
{% if diagnosis %}<p class="dx">{{ diagnosis }}</p>{% endif %}
{% if notes %}<div class="notes-text">{{ notes }}</div>{% endif %}
</td>

<!-- RIGHT: Medications -->
<td class="col-right">
<div class="col-head"><span class="rx-symbol">Rx</span> Medications</div>
<ol class="med-list">
{% for med in medicines %}
{% if med.name != 'Next Appointment' %}
<li>
<span class="med-name">{{ med.name }}</span>
{% if med.price_per_unit %}<span class="med-price">Rs. {{ '%.2f'|format(med.price_per_unit|default(0)|float) }}</span>{% endif %}
<br>
<span class="med-detail">
{{ med.dosage_form }} {{ med.strength }} - {{ med.dose }} | {{ med.frequency }} | {{ med.duration_days }} days | Qty: {{ med.total_quantity | default(1) }} | {{ med.route }}
{% if med.instructions %} - {{ med.instructions }}{% endif %}
</span>
</li>
{% endif %}
{% endfor %}
</ol>

{% for med in medicines %}
{% if med.name == 'Next Appointment' %}
<div style="margin-top: 15px; padding: 12px; background: #fdf2f8; border-radius: 8px; border-left: 4px solid #be185d;">
    <strong style="color: #be185d; font-size: 13px; text-transform: uppercase;">📅 Scheduled Following Visit</strong>
    <div style="margin-top: 4px; font-size: 14px; color: #831843; font-weight: 600;">
        Next Appointment: {{ med.instructions }}
    </div>
</div>
{% endif %}
{% endfor %}

{% if additional %}<div class="notes-text">{{ additional }}</div>{% endif %}

<div class="total-box">
Medicine: Rs. {{ '%.2f'|format(medicine_total) }}<br>
Consultation: Rs. {{ '%.2f'|format(consultation_fee) }}<br>
{% if admission_fee %}
Admission Fee: Rs. {{ '%.2f'|format(admission_fee) }}<br>
{% endif %}
<span class="grand">Total: Rs. {{ '%.2f'|format(grand_total) }}</span>
</div>
</td>
</tr>
</table>

{% if ai_insights %}
<div class="ai-note-wrapper">
<div class="ai-note">
<strong>Clinical Insight:</strong> {{ ai_short }}
</div>
</div>
{% endif %}

<!-- FOOTER -->
<div class="footer-area">
<table class="footer-table">
<tr>
<td>{{ prescription_date }}</td>
<td class="sig-area">
<div class="sig-line">Signature</div><br>
<small>Dr. {{ doctor_name }}, {{ doctor_department }}</small>
</td>
</tr>
</table>
</div>
<div class="footer-note">{{ prescription_footer or 'Get well soon!' }} | {{ hospital_name }} HMS</div>

</body>
</html>"""


# ──────────────────────────────────────────────────
# STAFF COPY — Same layout + billing stamp
# ──────────────────────────────────────────────────
STAFF_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 15mm 12mm 25mm 12mm; }
body { font-family: Helvetica, sans-serif; margin: 0; padding: 0; color: #111; font-size: 12px; }
.header-area { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 10px; }
.header-table { width: 100%; border-collapse: collapse; }
.header-table td { vertical-align: top; padding: 2px 0; }
.doc-name { font-size: 20px; font-weight: bold; color: #111; margin: 0; }
.doc-qual { font-size: 13px; color: #333; margin: 2px 0; }
.doc-reg { font-size: 11px; color: #666; }
.hosp-name { font-size: 14px; font-weight: bold; text-align: right; }
.hosp-detail { font-size: 10px; color: #555; text-align: right; line-height: 1.5; }
.staff-badge { text-align: center; margin-bottom: 8px; }
.staff-badge span { background: #111; color: #fff; padding: 2px 14px; font-size: 10px; font-weight: bold; letter-spacing: 1px; }
.meta-row { text-align: right; font-size: 10px; color: #888; margin-bottom: 8px; }
.patient-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.patient-table td { padding: 3px 6px; font-size: 12px; }
.patient-table .lbl { font-weight: bold; width: 70px; }
.allergy { color: #c00; font-weight: bold; font-size: 11px; padding: 4px 8px; background: #fff0f0; border: 1px solid #fcc; margin-bottom: 8px; }
.two-col { width: 100%; border-collapse: collapse; }
.two-col td { vertical-align: top; padding: 8px; }
.col-left { width: 35%; border-right: 2px solid #999; }
.col-right { width: 65%; }
.col-head { font-weight: bold; font-size: 13px; text-align: center; padding-bottom: 6px; border-bottom: 1px solid #ddd; margin-bottom: 8px; }
.dx { font-weight: bold; font-size: 13px; margin: 4px 0; }
.notes-text { font-size: 11px; color: #444; white-space: pre-wrap; margin-top: 6px; }
.rx-symbol { font-size: 24px; font-weight: bold; color: #111; }
.med-list { list-style: none; padding: 0; margin: 0; counter-reset: med; }
.med-list li { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #eee; counter-increment: med; }
.med-list li::before { content: counter(med) ". "; font-weight: bold; }
.med-name { font-weight: bold; font-size: 13px; }
.med-detail { font-size: 11px; color: #555; font-style: italic; }
.med-price { font-size: 11px; color: #111; float: right; font-weight: bold; }
.bill-table { width: 100%; border-collapse: collapse; margin-top: 12px; border: 1px solid #999; }
.bill-table th { background: #eee; padding: 5px 8px; text-align: left; font-size: 11px; border-bottom: 2px solid #999; }
.bill-table td { padding: 5px 8px; font-size: 11px; border-bottom: 1px solid #ddd; }
.bill-table .amt { text-align: right; font-family: monospace; }
.bill-table .total-row { font-weight: bold; font-size: 13px; background: #f5f5f5; border-top: 2px solid #111; }
.stamp { display: inline-block; border: 3px solid #060; color: #060; font-weight: 900; font-size: 16px; padding: 4px 20px; margin-top: 8px; }
.stamp-unpaid { border-color: #c00; color: #c00; }
.footer-area { border-top: 2px solid #111; padding-top: 8px; margin-top: 16px; }
.footer-table { width: 100%; }
.footer-table td { vertical-align: top; font-size: 11px; }
.sig-area { text-align: right; }
.sig-line { border-top: 1px solid #333; display: inline-block; width: 160px; text-align: center; padding-top: 4px; font-size: 11px; }
.footer-note { font-size: 9px; color: #aaa; text-align: center; margin-top: 6px; }

.staff-med-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.staff-med-table th, .staff-med-table td { border: 1px solid #eee; padding: 6px; text-align: left; font-size: 11px; }
.staff-med-table th { background-color: #f8f8f8; font-weight: bold; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header-area">
<table class="header-table">
<tr>
{% if logo_url %}
<td style="width:15%; text-align: left; padding-right: 15px;">
<img src="{{ logo_url }}" style="max-height:60px;" alt="Logo">
</td>
{% endif %}
<td style="width:{% if logo_url %}45%{% else %}60%{% endif %}">
<p class="doc-name">Dr. {{ doctor_name }}</p>
<p class="doc-qual">{{ doctor_department }}</p>
{% if registration_number %}<p class="doc-reg">Reg: {{ registration_number }}</p>{% endif %}
</td>
<td style="width:40%">
<p class="hosp-name">{{ hospital_name }}</p>
<div class="hosp-detail">
{% if tagline %}{{ tagline }}<br>{% endif %}
{{ address }}<br>
{% if phone %}Tel: {{ phone }}{% endif %}
</div>
</td>
</tr>
</table>
</div>

<div class="staff-badge"><span>STAFF COPY — BILLING</span></div>

<!-- META -->
<div class="meta-row">
<strong>ID:</strong> {{ prescription_uid }} &nbsp;&nbsp;
<strong>PID:</strong> {{ patient_uid }} &nbsp;&nbsp;
<strong>Date:</strong> {{ prescription_date }}
</div>

<!-- PATIENT INFO -->
<table class="patient-table">
<tr>
<td class="lbl">Name:</td><td>{{ patient_name }}</td>
<td class="lbl">Age:</td><td>{{ patient_age }}</td>
<td class="lbl">Sex:</td><td>{{ gender }}</td>
</tr>
<tr>
<td class="lbl">Weight:</td><td>{{ weight }} kg</td>
<td class="lbl">Blood:</td><td>{{ blood_group }}</td>
<td class="lbl">Phone:</td><td>{{ guardian_phone }}</td>
</tr>
{% if admitted_days %}
<tr>
<td class="lbl">Admission:</td><td colspan="7" style="color: #6d28d9; font-weight: bold;">Discharged after {{ admitted_days }} days of IPD Care</td>
</tr>
{% endif %}
</table>
{% if allergies %}<div class="allergy">Alert ALLERGIES: {{ allergies }}</div>{% endif %}

<!-- TWO COLUMN BODY -->
<table class="two-col">
<tr>
<!-- LEFT: Clinical -->
<td class="col-left">
<div class="col-head">Clinical Notes</div>
{% if diagnosis %}<p class="dx">{{ diagnosis }}</p>{% endif %}
{% if notes %}<div class="notes-text">{{ notes }}</div>{% endif %}
</td>
<!-- RIGHT: Meds -->
<td class="col-right">
<div class="col-head"><span class="rx-symbol">Rx</span> Medications</div>
<ol class="med-list">
{% for med in medicines %}
{% if med.name != 'Next Appointment' %}
<li>
<span class="med-name">{{ med.name }}</span>
<span class="med-price">Rs. {{ '%.2f'|format(med.price_per_unit|default(0)|float) }}</span>
<br>
<span class="med-detail">
{{ med.dosage_form }} {{ med.strength }} - {{ med.dose }} | {{ med.frequency }} | {{ med.duration_days }}d
</span>
</li>
{% endif %}
{% endfor %}
</ol>

{% for med in medicines %}
{% if med.name == 'Next Appointment' %}
<div style="margin-top: 15px; padding: 12px; background: #fdf2f8; border-radius: 8px; border-left: 4px solid #be185d;">
    <strong style="color: #be185d; font-size: 13px; text-transform: uppercase;">📅 Scheduled Following Visit</strong>
    <div style="margin-top: 4px; font-size: 14px; color: #831843; font-weight: 600;">
        Next Appointment: {{ med.instructions }}
    </div>
</div>
{% endif %}
{% endfor %}

</td>
</tr>
</table>

<!-- BILLING TABLE -->
<div class="col-head">Medications Dispensed</div>
<table class="staff-med-table">
<thead>
<tr>
<th>Medicine</th>
<th>Instructions</th>
<th>Duration/Qty</th>
</tr>
</thead>
<tbody>
{% for med in medicines %}
{% if med.name != 'Next Appointment' %}
<tr>
<td><strong>{{ med.name }}</strong><br>{{ med.dosage_form }} {{ med.strength }}</td>
<td><strong>{{ med.dose }}</strong> - {{ med.frequency }}<br>{{ med.route }} {% if med.instructions %}{{ med.instructions }}{% endif %}</td>
<td>{{ med.duration_days }} days<br>Total: {{ med.total_quantity | default('') }}</td>
</tr>
{% endif %}
{% endfor %}
</tbody>
</table>

<table class="bill-table">
<thead><tr><th>#</th><th>Medicine</th><th>Qty</th><th class="amt">Unit Price</th><th class="amt">Total Price</th></tr></thead>
<tbody>
{% for med in medicines %}
{% if med.name != 'Next Appointment' %}
<tr>
<td>{{ loop.index }}</td>
<td><strong>{{ med.name }}</strong> <small>{{ med.dosage_form }}</small><br><span style="color:#555;font-size:10px">{{ med.dose }} | {{ med.frequency }} | {{ med.duration_days }}d</span></td>
<td>{{ med.total_quantity | default(1) }}</td>
<td class="amt">Rs. {{ '%.2f'|format(med.price_per_unit|default(0)|float) }}</td>
<td class="amt">Rs. {{ '%.2f'|format((med.price_per_unit|default(0)|float) * (med.total_quantity|default(1)|int)) }}</td>
</tr>
{% endif %}
{% endfor %}
</tbody>
<tfoot>
<tr><td colspan="4" style="text-align:right;">Medicine Total</td><td class="amt">Rs. {{ '%.2f'|format(medicine_total) }}</td></tr>
<tr><td colspan="4" style="text-align:right;">Consultation Fee</td><td class="amt">Rs. {{ '%.2f'|format(consultation_fee) }}</td></tr>
{% if admission_fee %}
<tr><td colspan="4" style="text-align:right;">Admission Fee</td><td class="amt">Rs. {{ '%.2f'|format(admission_fee) }}</td></tr>
{% endif %}
<tr class="total-row"><td colspan="4" style="text-align:right;">GRAND TOTAL</td><td class="amt">Rs. {{ '%.2f'|format(grand_total) }}</td></tr>
</tfoot>
</table>

<div style="text-align:center;margin-top:10px;">
{% if payment_status == 'DISPENSED' %}
<span class="stamp">✓ PAID</span>
{% else %}
<span class="stamp stamp-unpaid">UNPAID</span>
{% endif %}
</div>

<!-- FOOTER -->
<div class="footer-area">
<table class="footer-table">
<tr>
<td>{{ prescription_date }}</td>
<td class="sig-area">
<div class="sig-line">Signature</div><br>
<small>Dr. {{ doctor_name }}</small>
</td>
</tr>
</table>
</div>
<div class="footer-note">STAFF COPY — NOT FOR PATIENT | {{ hospital_name }} HMS</div>

</body>
</html>"""


def generate_patient_pdf(rx_data: dict, config: dict) -> bytes:
    """Generate the patient-facing MedScript-style prescription PDF."""
    template = Template(PATIENT_TEMPLATE)
    
    # Create a clean, short AI note without asterisks or bad characters
    ai_short = ''
    if rx_data.get('ai_insights'):
        full = rx_data['ai_insights']
        # Strip out any markdown bolding (* and **)
        clean_text = re.sub(r'\*{1,2}', '', full)
        
        # Take just the first 4-5 sentences
        lines = [l.strip() for l in clean_text.split('\n') if l.strip() and not l.strip().startswith('#')]
        ai_short = ' '.join(lines[:5])
        if len(ai_short) > 500:
            ai_short = ai_short[:497] + '...'

    ctx = {**config, **rx_data, 'ai_short': ai_short}
    ctx.setdefault('prescription_date', datetime.now().strftime('%d-%b-%Y %I:%M %p'))
    html = template.render(**ctx)
    buf = BytesIO()
    pisa.CreatePDF(html, dest=buf)
    return buf.getvalue()


def generate_staff_pdf(rx_data: dict, config: dict) -> bytes:
    """Generate the staff-facing MedScript-style prescription PDF with billing."""
    template = Template(STAFF_TEMPLATE)
    ctx = {**config, **rx_data}
    ctx.setdefault('prescription_date', datetime.now().strftime('%d-%b-%Y %I:%M %p'))
    html = template.render(**ctx)
    buf = BytesIO()
    pisa.CreatePDF(html, dest=buf)
    return buf.getvalue()


# Backward compat
def generate_prescription_pdf(prescription_data: dict, config: dict) -> bytes:
    return generate_patient_pdf(prescription_data, config)
