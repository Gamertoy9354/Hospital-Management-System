-- =============================================
-- IPD Admission Notes Table
-- Run this in your Supabase SQL Editor
-- =============================================

-- Table: admission_notes
-- Stores progress/checkup notes for admitted patients
CREATE TABLE IF NOT EXISTS admission_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff_profiles(id),
    note_type TEXT NOT NULL DEFAULT 'PROGRESS',
    -- Types: PROGRESS, CHECKUP, LAB_RESULT, OBSERVATION, TREATMENT_UPDATE
    title TEXT,
    content TEXT NOT NULL,
    vitals_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by admission
CREATE INDEX IF NOT EXISTS idx_admission_notes_admission_id ON admission_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_admission_notes_staff_id ON admission_notes(staff_id);

-- Add missing columns to admissions table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name='admissions' AND column_name='reason') THEN
        ALTER TABLE admissions ADD COLUMN reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name='admissions' AND column_name='discharge_summary') THEN
        ALTER TABLE admissions ADD COLUMN discharge_summary TEXT;
    END IF;
END $$;

-- Enable RLS (Row Level Security) — allow service role full access
ALTER TABLE admission_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON admission_notes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable realtime for admission_notes
ALTER PUBLICATION supabase_realtime ADD TABLE admission_notes;
