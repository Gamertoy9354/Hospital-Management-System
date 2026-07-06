ALTER TABLE prescriptions ADD COLUMN admission_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE prescriptions ADD COLUMN next_appointment_date DATE;
