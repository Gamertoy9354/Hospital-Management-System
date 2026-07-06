"""
Seed script to restore drug_master data.
Run: python seed_drugs.py
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)

# Columns: name, dosage_form, strength, adult_dose_mg, category, manufacturer, is_active
DRUGS = [
    # --- Analgesics / Antipyretics ---
    {"name": "Paracetamol 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Analgesic", "manufacturer": "Generic"},
    {"name": "Paracetamol Syrup", "dosage_form": "SYRUP", "strength": "120mg/5ml", "adult_dose_mg": 500, "category": "Analgesic", "manufacturer": "Generic"},
    {"name": "Paracetamol Drops", "dosage_form": "DROPS", "strength": "100mg/ml", "adult_dose_mg": None, "category": "Analgesic", "manufacturer": "Generic"},
    {"name": "Ibuprofen 400mg", "dosage_form": "TABLET", "strength": "400mg", "adult_dose_mg": 400, "category": "NSAID", "manufacturer": "Generic"},
    {"name": "Ibuprofen Syrup", "dosage_form": "SYRUP", "strength": "100mg/5ml", "adult_dose_mg": 400, "category": "NSAID", "manufacturer": "Generic"},
    {"name": "Mefenamic Acid 250mg", "dosage_form": "TABLET", "strength": "250mg", "adult_dose_mg": 500, "category": "NSAID", "manufacturer": "Generic"},
    {"name": "Diclofenac 50mg", "dosage_form": "TABLET", "strength": "50mg", "adult_dose_mg": 50, "category": "NSAID", "manufacturer": "Generic"},
    {"name": "Aspirin 325mg", "dosage_form": "TABLET", "strength": "325mg", "adult_dose_mg": 325, "category": "Analgesic", "manufacturer": "Generic"},

    # --- Antibiotics ---
    {"name": "Amoxicillin 500mg", "dosage_form": "CAPSULE", "strength": "500mg", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Amoxicillin Syrup", "dosage_form": "SYRUP", "strength": "250mg/5ml", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Amoxicillin+Clavulanate 625mg", "dosage_form": "TABLET", "strength": "625mg", "adult_dose_mg": 625, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Azithromycin 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Azithromycin Syrup", "dosage_form": "SYRUP", "strength": "200mg/5ml", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Cefixime 200mg", "dosage_form": "TABLET", "strength": "200mg", "adult_dose_mg": 200, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Cefixime Syrup", "dosage_form": "SYRUP", "strength": "100mg/5ml", "adult_dose_mg": 200, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Cephalexin 500mg", "dosage_form": "CAPSULE", "strength": "500mg", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Ciprofloxacin 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Metronidazole 400mg", "dosage_form": "TABLET", "strength": "400mg", "adult_dose_mg": 400, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Doxycycline 100mg", "dosage_form": "CAPSULE", "strength": "100mg", "adult_dose_mg": 100, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Ofloxacin 200mg", "dosage_form": "TABLET", "strength": "200mg", "adult_dose_mg": 200, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Cotrimoxazole", "dosage_form": "TABLET", "strength": "DS", "adult_dose_mg": 960, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Ceftriaxone 1g", "dosage_form": "INJECTION", "strength": "1g", "adult_dose_mg": 1000, "category": "Antibiotic", "manufacturer": "Generic"},
    {"name": "Gentamicin 80mg", "dosage_form": "INJECTION", "strength": "80mg/2ml", "adult_dose_mg": 80, "category": "Antibiotic", "manufacturer": "Generic"},

    # --- Antihistamines / Anti-allergy ---
    {"name": "Cetirizine 10mg", "dosage_form": "TABLET", "strength": "10mg", "adult_dose_mg": 10, "category": "Antihistamine", "manufacturer": "Generic"},
    {"name": "Cetirizine Syrup", "dosage_form": "SYRUP", "strength": "5mg/5ml", "adult_dose_mg": 10, "category": "Antihistamine", "manufacturer": "Generic"},
    {"name": "Levocetirizine 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 5, "category": "Antihistamine", "manufacturer": "Generic"},
    {"name": "Chlorpheniramine 4mg", "dosage_form": "TABLET", "strength": "4mg", "adult_dose_mg": 4, "category": "Antihistamine", "manufacturer": "Generic"},
    {"name": "Montelukast 10mg", "dosage_form": "TABLET", "strength": "10mg", "adult_dose_mg": 10, "category": "Anti-allergy", "manufacturer": "Generic"},

    # --- GI / Antacids ---
    {"name": "Omeprazole 20mg", "dosage_form": "CAPSULE", "strength": "20mg", "adult_dose_mg": 20, "category": "Antacid/PPI", "manufacturer": "Generic"},
    {"name": "Pantoprazole 40mg", "dosage_form": "TABLET", "strength": "40mg", "adult_dose_mg": 40, "category": "Antacid/PPI", "manufacturer": "Generic"},
    {"name": "Ranitidine 150mg", "dosage_form": "TABLET", "strength": "150mg", "adult_dose_mg": 150, "category": "Antacid/H2", "manufacturer": "Generic"},
    {"name": "Domperidone 10mg", "dosage_form": "TABLET", "strength": "10mg", "adult_dose_mg": 10, "category": "Anti-emetic", "manufacturer": "Generic"},
    {"name": "Ondansetron 4mg", "dosage_form": "TABLET", "strength": "4mg", "adult_dose_mg": 4, "category": "Anti-emetic", "manufacturer": "Generic"},
    {"name": "ORS Powder", "dosage_form": "POWDER", "strength": "1 sachet", "adult_dose_mg": None, "category": "Rehydration", "manufacturer": "Generic"},
    {"name": "Zinc Sulphate 20mg", "dosage_form": "TABLET", "strength": "20mg", "adult_dose_mg": 20, "category": "Supplement", "manufacturer": "Generic"},
    {"name": "Lactulose Syrup", "dosage_form": "SYRUP", "strength": "10g/15ml", "adult_dose_mg": None, "category": "Laxative", "manufacturer": "Generic"},

    # --- Cough & Cold / Respiratory ---
    {"name": "Ambroxol Syrup", "dosage_form": "SYRUP", "strength": "30mg/5ml", "adult_dose_mg": 30, "category": "Mucolytic", "manufacturer": "Generic"},
    {"name": "Dextromethorphan Syrup", "dosage_form": "SYRUP", "strength": "10mg/5ml", "adult_dose_mg": 30, "category": "Antitussive", "manufacturer": "Generic"},
    {"name": "Salbutamol Syrup", "dosage_form": "SYRUP", "strength": "2mg/5ml", "adult_dose_mg": 4, "category": "Bronchodilator", "manufacturer": "Generic"},
    {"name": "Salbutamol Nebulization", "dosage_form": "NEBULIZATION", "strength": "2.5mg/2.5ml", "adult_dose_mg": 5, "category": "Bronchodilator", "manufacturer": "Generic"},
    {"name": "Budesonide Nebulization", "dosage_form": "NEBULIZATION", "strength": "0.5mg/2ml", "adult_dose_mg": 1, "category": "Steroid", "manufacturer": "Generic"},
    {"name": "Salbutamol Inhaler", "dosage_form": "INHALER", "strength": "100mcg/puff", "adult_dose_mg": None, "category": "Bronchodilator", "manufacturer": "Generic"},

    # --- Steroids ---
    {"name": "Prednisolone 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 20, "category": "Steroid", "manufacturer": "Generic"},
    {"name": "Prednisolone Syrup", "dosage_form": "SYRUP", "strength": "5mg/5ml", "adult_dose_mg": 20, "category": "Steroid", "manufacturer": "Generic"},
    {"name": "Dexamethasone 0.5mg", "dosage_form": "TABLET", "strength": "0.5mg", "adult_dose_mg": 4, "category": "Steroid", "manufacturer": "Generic"},
    {"name": "Hydrocortisone 100mg", "dosage_form": "INJECTION", "strength": "100mg", "adult_dose_mg": 100, "category": "Steroid", "manufacturer": "Generic"},

    # --- Vitamins & Supplements ---
    {"name": "Multivitamin Syrup", "dosage_form": "SYRUP", "strength": "Multi", "adult_dose_mg": None, "category": "Supplement", "manufacturer": "Generic"},
    {"name": "Iron Syrup", "dosage_form": "SYRUP", "strength": "50mg/5ml", "adult_dose_mg": 100, "category": "Supplement", "manufacturer": "Generic"},
    {"name": "Calcium + Vitamin D3", "dosage_form": "TABLET", "strength": "500mg+250IU", "adult_dose_mg": 500, "category": "Supplement", "manufacturer": "Generic"},
    {"name": "Vitamin B Complex", "dosage_form": "TABLET", "strength": "Multi", "adult_dose_mg": None, "category": "Supplement", "manufacturer": "Generic"},
    {"name": "Vitamin C 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Supplement", "manufacturer": "Generic"},
    {"name": "Folic Acid 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 5, "category": "Supplement", "manufacturer": "Generic"},

    # --- Antihypertensives ---
    {"name": "Amlodipine 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 5, "category": "Antihypertensive", "manufacturer": "Generic"},
    {"name": "Enalapril 5mg", "dosage_form": "TABLET", "strength": "5mg", "adult_dose_mg": 5, "category": "ACE Inhibitor", "manufacturer": "Generic"},
    {"name": "Losartan 50mg", "dosage_form": "TABLET", "strength": "50mg", "adult_dose_mg": 50, "category": "ARB", "manufacturer": "Generic"},
    {"name": "Atenolol 50mg", "dosage_form": "TABLET", "strength": "50mg", "adult_dose_mg": 50, "category": "Beta Blocker", "manufacturer": "Generic"},

    # --- Anti-diabetic ---
    {"name": "Metformin 500mg", "dosage_form": "TABLET", "strength": "500mg", "adult_dose_mg": 500, "category": "Anti-diabetic", "manufacturer": "Generic"},
    {"name": "Glimepiride 1mg", "dosage_form": "TABLET", "strength": "1mg", "adult_dose_mg": 1, "category": "Anti-diabetic", "manufacturer": "Generic"},

    # --- Dermatology / Topical ---
    {"name": "Calamine Lotion", "dosage_form": "LOTION", "strength": "Standard", "adult_dose_mg": None, "category": "Dermatology", "manufacturer": "Generic"},
    {"name": "Clotrimazole Cream 1%", "dosage_form": "CREAM", "strength": "1%", "adult_dose_mg": None, "category": "Antifungal", "manufacturer": "Generic"},
    {"name": "Mupirocin Ointment 2%", "dosage_form": "OINTMENT", "strength": "2%", "adult_dose_mg": None, "category": "Antibiotic Topical", "manufacturer": "Generic"},
    {"name": "Betamethasone Cream", "dosage_form": "CREAM", "strength": "0.05%", "adult_dose_mg": None, "category": "Steroid Topical", "manufacturer": "Generic"},
    {"name": "Silver Sulfadiazine Cream", "dosage_form": "CREAM", "strength": "1%", "adult_dose_mg": None, "category": "Burn Care", "manufacturer": "Generic"},

    # --- Eye / Ear Drops ---
    {"name": "Ciprofloxacin Eye Drops", "dosage_form": "DROPS", "strength": "0.3%", "adult_dose_mg": None, "category": "Antibiotic Eye", "manufacturer": "Generic"},
    {"name": "Ofloxacin Ear Drops", "dosage_form": "DROPS", "strength": "0.3%", "adult_dose_mg": None, "category": "Antibiotic Ear", "manufacturer": "Generic"},
    {"name": "Tobramycin Eye Drops", "dosage_form": "DROPS", "strength": "0.3%", "adult_dose_mg": None, "category": "Antibiotic Eye", "manufacturer": "Generic"},

    # --- IV Fluids ---
    {"name": "Normal Saline 0.9%", "dosage_form": "IV_FLUID", "strength": "500ml", "adult_dose_mg": None, "category": "IV Fluid", "manufacturer": "Generic"},
    {"name": "Ringer Lactate", "dosage_form": "IV_FLUID", "strength": "500ml", "adult_dose_mg": None, "category": "IV Fluid", "manufacturer": "Generic"},
    {"name": "Dextrose 5%", "dosage_form": "IV_FLUID", "strength": "500ml", "adult_dose_mg": None, "category": "IV Fluid", "manufacturer": "Generic"},
    {"name": "DNS (Dextrose Normal Saline)", "dosage_form": "IV_FLUID", "strength": "500ml", "adult_dose_mg": None, "category": "IV Fluid", "manufacturer": "Generic"},

    # --- Sedatives / Emergency ---
    {"name": "Midazolam 5mg", "dosage_form": "INJECTION", "strength": "5mg/ml", "adult_dose_mg": 5, "category": "Sedative", "manufacturer": "Generic"},
    {"name": "Adrenaline 1mg", "dosage_form": "INJECTION", "strength": "1mg/ml", "adult_dose_mg": 1, "category": "Emergency", "manufacturer": "Generic"},
    {"name": "Atropine 0.6mg", "dosage_form": "INJECTION", "strength": "0.6mg/ml", "adult_dose_mg": 0.6, "category": "Emergency", "manufacturer": "Generic"},
    {"name": "Ranitidine Injection", "dosage_form": "INJECTION", "strength": "50mg/2ml", "adult_dose_mg": 50, "category": "Antacid/H2", "manufacturer": "Generic"},

    # --- Anti-seizure ---
    {"name": "Phenytoin 100mg", "dosage_form": "TABLET", "strength": "100mg", "adult_dose_mg": 300, "category": "Anti-epileptic", "manufacturer": "Generic"},
    {"name": "Sodium Valproate 200mg", "dosage_form": "TABLET", "strength": "200mg", "adult_dose_mg": 600, "category": "Anti-epileptic", "manufacturer": "Generic"},
]


def seed():
    count = 0
    for drug in DRUGS:
        payload = {k: v for k, v in drug.items() if v is not None}
        payload['is_active'] = True
        try:
            supabase.table('drug_master').insert(payload).execute()
            count += 1
            print(f"  + {drug['name']}")
        except Exception as e:
            print(f"  SKIP {drug['name']}: {e}")

    print(f"\nDone: Seeded {count}/{len(DRUGS)} drugs into drug_master")


if __name__ == '__main__':
    seed()
