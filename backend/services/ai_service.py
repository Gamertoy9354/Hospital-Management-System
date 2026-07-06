"""
AI Service — Uses NVIDIA NIM API (Ministral 14B) to generate
detailed prescription insights for patients.
"""
import requests
import json
import os

NVIDIA_API_KEY = "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"
NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = "mistralai/ministral-14b-instruct-2512"


def generate_prescription_insights(patient_data: dict, diagnosis: str, drugs: list, notes: str = '') -> str:
    """
    Generate AI-powered prescription insights including:
    - Diagnosis explanation in simple language
    - Medicine details (what each drug does, side effects, interactions)
    - Diet and lifestyle advice
    - When to seek emergency care
    - Follow-up guidance
    """

    # Build medicines text
    med_lines = []
    for i, d in enumerate(drugs, 1):
        med_lines.append(
            f"{i}. {d.get('name', 'Unknown')} ({d.get('dosage_form', '')}) - "
            f"Dose: {d.get('dose', 'N/A')}, Frequency: {d.get('frequency', 'N/A')}, "
            f"Duration: {d.get('duration_days', 'N/A')} days, Route: {d.get('route', 'ORAL')}"
        )
    medicines_text = "\n".join(med_lines) if med_lines else "No medicines prescribed"

    # Build patient context
    patient_name = patient_data.get('full_name', 'Patient')
    patient_age = patient_data.get('age_display', 'Unknown')
    patient_weight = patient_data.get('weight_kg', 'Unknown')
    blood_group = patient_data.get('blood_group', 'Unknown')
    gender = patient_data.get('gender', 'Unknown')
    allergies = patient_data.get('allergies', [])
    allergies_text = ', '.join(allergies) if allergies else 'None reported'

    prompt = f"""You are a senior Indian medical practitioner. Write a SHORT clinical note for the patient's prescription.
Keep it under 8 lines. Be concise, professional, and easy to understand.

Patient: {patient_name}, {patient_age}, {gender}, {patient_weight} kg, Blood: {blood_group}
Allergies: {allergies_text}
Diagnosis: {diagnosis or 'Not specified'}
Medicines: {medicines_text}
Doctor Notes: {notes or 'None'}

Write a brief note covering:
- What the diagnosis means in simple terms (1 line)
- Key instructions for medicines — how to take, before/after food (2-3 lines)
- Diet advice and things to avoid (1-2 lines)  
- Red flag symptoms to rush to hospital (1 line)
- Follow-up timing (1 line)

Do NOT use markdown headers or bullet points. Write in plain short paragraphs. Keep it under 150 words total."""

    try:
        headers = {
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        payload = {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 512,
            "temperature": 0.15,
            "top_p": 1.00,
            "frequency_penalty": 0.00,
            "presence_penalty": 0.00,
            "stream": False
        }

        response = requests.post(NVIDIA_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        data = response.json()
        content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
        return content.strip()

    except requests.exceptions.Timeout:
        return "AI insights generation timed out. Please try again."
    except Exception as e:
        print(f"AI Service Error: {e}")
        return f"Unable to generate AI insights at this time. Error: {str(e)}"
