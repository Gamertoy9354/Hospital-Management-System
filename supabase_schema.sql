-- ============================================================
-- Hospital Management System — Supabase SQL Schema
-- Execute this entire script in the Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed common pediatric departments
INSERT INTO departments (name) VALUES
  ('Pediatrics'),
  ('Neonatology'),
  ('Pediatric Surgery'),
  ('Pediatric Cardiology'),
  ('Pediatric Neurology'),
  ('General Medicine'),
  ('Emergency'),
  ('Dermatology'),
  ('ENT'),
  ('Ophthalmology');

-- ============================================================
-- 2. STAFF PROFILES
-- ============================================================
CREATE TABLE staff_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('DOCTOR','NURSE','RECEPTIONIST','PHARMACIST','SUPER_ADMIN')),
  department      TEXT,
  specialization  TEXT,
  qualification   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_phone ON staff_profiles (phone);
CREATE INDEX idx_staff_role  ON staff_profiles (role);

-- ============================================================
-- 3. OTP STORE  (for SMS login)
-- ============================================================
CREATE TABLE otp_store (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       TEXT NOT NULL,
  otp         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_otp_phone ON otp_store (phone);

-- ============================================================
-- 4. AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id    UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_action ON audit_log (action);
CREATE INDEX idx_audit_entity ON audit_log (entity_type);
CREATE INDEX idx_audit_staff  ON audit_log (staff_id);
CREATE INDEX idx_audit_time   ON audit_log (created_at DESC);

-- ============================================================
-- 5. HOSPITAL CONFIG  (key-value settings)
-- ============================================================
CREATE TABLE hospital_config (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key       TEXT NOT NULL UNIQUE,
  value     TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed default config keys
INSERT INTO hospital_config (key, value, is_public) VALUES
  ('hospital_name',       'My Hospital',            TRUE),
  ('tagline',             'Expert Pediatric Care',   TRUE),
  ('logo_url',            '',                        TRUE),
  ('address',             '',                        TRUE),
  ('phone',               '',                        TRUE),
  ('email',               '',                        TRUE),
  ('registration_number', '',                        FALSE),
  ('prescription_footer', 'Get well soon!',          FALSE);

-- ============================================================
-- 6. PATIENT PROFILES
-- ============================================================
CREATE TABLE patient_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_uid           TEXT NOT NULL UNIQUE,            -- auto-generated like PAT-00001
  full_name             TEXT NOT NULL,
  date_of_birth         DATE NOT NULL,
  gender                TEXT NOT NULL CHECK (gender IN ('Male','Female','Other')),
  blood_group           TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-',NULL)),
  guardian_name          TEXT NOT NULL,
  guardian_relationship  TEXT,
  guardian_phone         TEXT NOT NULL,
  guardian_email         TEXT,
  address               TEXT,
  city                  TEXT,
  allergies             JSONB NOT NULL DEFAULT '[]',     -- e.g. ["Penicillin","Peanuts"]
  chronic_conditions    JSONB NOT NULL DEFAULT '[]',     -- e.g. ["Asthma"]
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_uid   ON patient_profiles (patient_uid);
CREATE INDEX idx_patient_phone ON patient_profiles (guardian_phone);
CREATE INDEX idx_patient_name  ON patient_profiles USING gin (full_name gin_trgm_ops);

-- ============================================================
-- 7. PATIENT VISITS
-- ============================================================
CREATE TABLE patient_visits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  visit_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type       TEXT NOT NULL DEFAULT 'OPD' CHECK (visit_type IN ('OPD','IPD','EMERGENCY')),
  chief_complaint  TEXT,
  doctor_id        UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  department       TEXT,
  diagnosis        TEXT,
  doctor_notes     TEXT,
  status           TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','COMPLETED')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ
);

CREATE INDEX idx_visit_patient ON patient_visits (patient_id);
CREATE INDEX idx_visit_doctor  ON patient_visits (doctor_id);
CREATE INDEX idx_visit_date    ON patient_visits (visit_date);
CREATE INDEX idx_visit_status  ON patient_visits (status);

-- ============================================================
-- 8. PATIENT VITALS  (recorded per visit)
-- ============================================================
CREATE TABLE patient_vitals (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id                 UUID NOT NULL REFERENCES patient_visits(id) ON DELETE CASCADE,
  weight_kg                NUMERIC(5,2),
  height_cm                NUMERIC(5,1),
  temperature_celsius      NUMERIC(4,1),
  blood_pressure_systolic  INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate               INTEGER,
  spo2_percent             NUMERIC(4,1),
  respiratory_rate         INTEGER,
  bmi                      NUMERIC(5,2),
  head_circumference_cm    NUMERIC(5,1),
  recorded_by              UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vitals_visit ON patient_vitals (visit_id);

-- ============================================================
-- 9. DRUG MASTER  (formulary / catalog)
-- ============================================================
CREATE TABLE drug_master (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  dosage_form     TEXT NOT NULL DEFAULT 'TABLET' CHECK (dosage_form IN (
                    'TABLET','SYRUP','DROPS','INJECTION','CREAM','OINTMENT',
                    'CAPSULE','POWDER','INHALER','SUSPENSION'
                  )),
  strength        TEXT,                     -- e.g. "250mg/5ml"
  adult_dose_mg   NUMERIC(8,2),             -- for pediatric dose calc
  category        TEXT,                     -- e.g. "Analgesic","Antibiotic"
  manufacturer    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drug_name ON drug_master USING gin (name gin_trgm_ops);

-- Seed common pediatric drugs
INSERT INTO drug_master (name, dosage_form, strength, adult_dose_mg, category) VALUES
  ('Paracetamol',     'SYRUP',      '250mg/5ml', 500,  'Analgesic'),
  ('Paracetamol',     'TABLET',     '500mg',     500,  'Analgesic'),
  ('Ibuprofen',       'SYRUP',      '100mg/5ml', 400,  'NSAID'),
  ('Amoxicillin',     'SYRUP',      '250mg/5ml', 500,  'Antibiotic'),
  ('Amoxicillin',     'CAPSULE',    '500mg',     500,  'Antibiotic'),
  ('Azithromycin',    'SYRUP',      '200mg/5ml', 500,  'Antibiotic'),
  ('Cefixime',        'SYRUP',      '100mg/5ml', 400,  'Antibiotic'),
  ('Cetirizine',      'SYRUP',      '5mg/5ml',   10,   'Antihistamine'),
  ('Montelukast',     'TABLET',     '4mg',       10,   'Anti-asthmatic'),
  ('Salbutamol',      'INHALER',    '100mcg',    NULL,  'Bronchodilator'),
  ('Ondansetron',     'SYRUP',      '2mg/5ml',   8,    'Antiemetic'),
  ('Domperidone',     'DROPS',      '5mg/ml',    30,   'Antiemetic'),
  ('ORS',             'POWDER',     'WHO formula', NULL,'Electrolyte'),
  ('Zinc',            'SYRUP',      '20mg/5ml',  NULL,  'Supplement'),
  ('Multivitamin',    'DROPS',      '',          NULL,  'Supplement'),
  ('Calpol',          'DROPS',      '100mg/ml',  500,  'Analgesic'),
  ('Augmentin',       'SYRUP',      '228.5mg/5ml', 625,'Antibiotic'),
  ('Prednisolone',    'SYRUP',      '5mg/5ml',   40,   'Corticosteroid'),
  ('Lactulose',       'SYRUP',      '3.35g/5ml', NULL,  'Laxative'),
  ('Iron',            'DROPS',      '25mg/ml',   NULL,  'Supplement');

-- ============================================================
-- 10. PRESCRIPTIONS
-- ============================================================
CREATE TABLE prescriptions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_uid         TEXT NOT NULL UNIQUE,             -- auto-generated like RX-00001
  visit_id                 UUID NOT NULL REFERENCES patient_visits(id) ON DELETE CASCADE,
  patient_id               UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  prescribed_by            UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  diagnosis                TEXT,
  notes                    TEXT,
  drugs                    JSONB NOT NULL DEFAULT '[]',      -- array of drug objects
  status                   TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','DISPENSED','CANCELLED')),
  version                  INTEGER NOT NULL DEFAULT 1,
  parent_prescription_id   UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  patient_weight_kg        NUMERIC(5,2),
  patient_age_months       INTEGER,
  approved_at              TIMESTAMPTZ,
  approved_by              UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  dispensed_at             TIMESTAMPTZ,
  dispensed_by             UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- drugs JSONB structure per item:
-- {
--   "drug_id": "uuid",
--   "name": "Paracetamol",
--   "dosage_form": "SYRUP",
--   "strength": "250mg/5ml",
--   "dose": "5ml",
--   "frequency": "TDS",
--   "duration_days": 5,
--   "route": "ORAL",
--   "instructions": "After food"
-- }

CREATE INDEX idx_rx_visit   ON prescriptions (visit_id);
CREATE INDEX idx_rx_patient ON prescriptions (patient_id);
CREATE INDEX idx_rx_status  ON prescriptions (status);
CREATE INDEX idx_rx_uid     ON prescriptions (prescription_uid);

-- ============================================================
-- 11. FLOORS  (hospital structure)
-- ============================================================
CREATE TABLE floors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  floor_number  INTEGER NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. WARDS
-- ============================================================
CREATE TABLE wards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_id    UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  ward_type   TEXT NOT NULL DEFAULT 'GENERAL' CHECK (ward_type IN ('GENERAL','ICU','NICU','PRIVATE','SEMI_PRIVATE')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ward_floor ON wards (floor_id);

-- ============================================================
-- 13. ROOMS
-- ============================================================
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id     UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type   TEXT NOT NULL DEFAULT 'STANDARD' CHECK (room_type IN ('STANDARD','DELUXE','SUITE')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_ward ON rooms (ward_id);

-- ============================================================
-- 14. BEDS
-- ============================================================
CREATE TABLE beds (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number  TEXT NOT NULL,
  bed_type    TEXT NOT NULL DEFAULT 'STANDARD' CHECK (bed_type IN ('STANDARD','CRADLE','ICU')),
  status      TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','OCCUPIED','HOUSEKEEPING','RESERVED')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bed_room   ON beds (room_id);
CREATE INDEX idx_bed_status ON beds (status);

-- ============================================================
-- 15. ADMISSIONS  (IPD bed assignments)
-- ============================================================
CREATE TABLE admissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  visit_id          UUID REFERENCES patient_visits(id) ON DELETE SET NULL,
  bed_id            UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
  admitted_by       UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  admitting_doctor  UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'ADMITTED' CHECK (status IN ('ADMITTED','DISCHARGED','TRANSFERRED')),
  discharge_date    TIMESTAMPTZ,
  discharge_notes   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admission_patient ON admissions (patient_id);
CREATE INDEX idx_admission_bed     ON admissions (bed_id);
CREATE INDEX idx_admission_status  ON admissions (status);

-- ============================================================
-- 16. OPD TOKENS  (daily queue numbers)
-- ============================================================
CREATE TABLE opd_tokens (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_number   INTEGER NOT NULL,
  token_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  department     TEXT NOT NULL,
  doctor_id      UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  patient_id     UUID REFERENCES patient_profiles(id) ON DELETE SET NULL,
  patient_name   TEXT,
  guardian_phone  TEXT,
  issued_by      UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','IN_PROGRESS','COMPLETED','SKIPPED')),
  called_at      TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_date   ON opd_tokens (token_date);
CREATE INDEX idx_token_dept   ON opd_tokens (department);
CREATE INDEX idx_token_status ON opd_tokens (status);
-- Ensure unique token per department per day
CREATE UNIQUE INDEX idx_token_unique ON opd_tokens (token_date, department, token_number);

-- ============================================================
-- 17. MESSAGE LOG  (WhatsApp / SMS tracking)
-- ============================================================
CREATE TABLE message_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID REFERENCES patient_profiles(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'WHATSAPP' CHECK (channel IN ('WHATSAPP','SMS','EMAIL')),
  message_type    TEXT NOT NULL DEFAULT 'GENERAL',
  status          TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','FAILED','DELIVERED','READ')),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_msg_patient ON message_log (patient_id);

-- ============================================================
-- 18. LAB REPORTS
-- ============================================================
CREATE TABLE lab_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id   UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  visit_id     UUID REFERENCES patient_visits(id) ON DELETE SET NULL,
  report_name  TEXT NOT NULL,
  lab_name     TEXT,
  report_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  file_url     TEXT NOT NULL,
  notes        TEXT,
  uploaded_by  UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_patient ON lab_reports (patient_id);
CREATE INDEX idx_lab_visit   ON lab_reports (visit_id);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables.
-- The backend uses the service_role key which bypasses RLS,
-- but this protects against direct client-side access.

ALTER TABLE staff_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_store        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_visits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_master      ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds             ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE opd_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments      ENABLE ROW LEVEL SECURITY;

-- Allow public read access to hospital config (for branding)
CREATE POLICY "Public read hospital_config"
  ON hospital_config FOR SELECT
  USING (is_public = TRUE);

-- Allow public read for queue display (no auth required)
CREATE POLICY "Public read opd_tokens"
  ON opd_tokens FOR SELECT
  USING (TRUE);

-- Allow public read for departments
CREATE POLICY "Public read departments"
  ON departments FOR SELECT
  USING (TRUE);

-- Service role (used by backend) bypasses all RLS, so these
-- policies only apply to direct Supabase client (anon key) access.


-- ============================================================
-- SUPABASE REALTIME  — enable for live updates
-- ============================================================
-- Enable realtime for beds (bed map) and opd_tokens (queue display)

ALTER PUBLICATION supabase_realtime ADD TABLE beds;
ALTER PUBLICATION supabase_realtime ADD TABLE opd_tokens;


-- ============================================================
-- STORAGE BUCKET  — for lab reports and logos
-- ============================================================
-- Run these via the Supabase Dashboard > Storage, or use SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-files', 'medical-files', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('hospital-assets', 'hospital-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on both buckets
CREATE POLICY "Public read medical-files"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('medical-files', 'hospital-assets'));

-- Allow authenticated uploads (service role bypasses, but just in case)
CREATE POLICY "Auth upload medical-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('medical-files', 'hospital-assets'));


-- ============================================================
-- HELPER FUNCTION: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_patient_updated_at
  BEFORE UPDATE ON patient_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_visit_updated_at
  BEFORE UPDATE ON patient_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rx_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bed_updated_at
  BEFORE UPDATE ON beds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SEED: Create default Super Admin account
-- Password hash is for "admin123" using bcrypt
-- CHANGE THIS IMMEDIATELY after first login!
-- ============================================================
INSERT INTO staff_profiles (full_name, phone, password_hash, role, department)
VALUES (
  'Super Admin',
  '9999999999',
  '$2b$12$LJ3m4ys4F.HvXOHHpz4JYuGMGV0P3jHPMaZT7T5q.AE8VE4bO1Pxe',
  'SUPER_ADMIN',
  'Administration'
);

-- ============================================================
-- DONE! Your database is ready.
-- 
-- Default login credentials:
--   Phone:    9999999999
--   Password: admin123
--
-- ⚠️  CHANGE THE ADMIN PASSWORD after your first login!
-- ============================================================
