import requests
import os


def send_whatsapp_prescription(guardian_phone: str, patient_name: str,
                                doctor_name: str, pdf_url: str,
                                hospital_name: str) -> bool:
    """Send prescription PDF via WhatsApp using 360dialog API."""
    api_key = os.environ.get('WHATSAPP_API_KEY')
    api_url = os.environ.get('WHATSAPP_API_URL')

    if not api_key or not api_url:
        return False

    phone = guardian_phone.replace('+', '').replace(' ', '')
    if not phone.startswith('91'):
        phone = f'91{phone}'

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": "prescription_delivery",
            "language": {"code": "en"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": patient_name},
                        {"type": "text", "text": doctor_name},
                        {"type": "text", "text": hospital_name}
                    ]
                },
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": 0,
                    "parameters": [
                        {"type": "text", "text": pdf_url}
                    ]
                }
            ]
        }
    }

    headers = {
        "D360-API-KEY": api_key,
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(api_url, json=payload, headers=headers, timeout=15)
        return resp.status_code == 200
    except Exception:
        return False


def send_whatsapp_message(phone: str, message: str) -> bool:
    """Send a simple text message via WhatsApp."""
    api_key = os.environ.get('WHATSAPP_API_KEY')
    api_url = os.environ.get('WHATSAPP_API_URL')

    if not api_key or not api_url:
        return False

    phone = phone.replace('+', '').replace(' ', '')
    if not phone.startswith('91'):
        phone = f'91{phone}'

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message}
    }

    headers = {
        "D360-API-KEY": api_key,
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(api_url, json=payload, headers=headers, timeout=15)
        return resp.status_code == 200
    except Exception:
        return False
