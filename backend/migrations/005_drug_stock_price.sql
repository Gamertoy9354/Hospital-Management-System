-- =============================================
-- Add stock_quantity and price_per_unit to drug_master
-- Run this in your Supabase SQL Editor
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name='drug_master' AND column_name='stock_quantity') THEN
        ALTER TABLE drug_master ADD COLUMN stock_quantity INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name='drug_master' AND column_name='price_per_unit') THEN
        ALTER TABLE drug_master ADD COLUMN price_per_unit NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;
