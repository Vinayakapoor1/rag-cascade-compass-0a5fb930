-- ============================================
-- MIGRATION: Add Evidence Columns to Indicators
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- Project: jyldgwtaoieiibtwqqlm
-- ============================================

-- Add evidence columns
ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS evidence_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS no_evidence_reason TEXT,
ADD COLUMN IF NOT EXISTS rag_status TEXT DEFAULT 'amber';

-- Add helpful comments
COMMENT ON COLUMN public.indicators.evidence_url IS 'URL or file path for evidence attachment';
COMMENT ON COLUMN public.indicators.evidence_type IS 'Type of evidence: file or link';
COMMENT ON COLUMN public.indicators.no_evidence_reason IS 'Reason when no evidence is provided';
COMMENT ON COLUMN public.indicators.rag_status IS 'RAG status: red, amber, or green';

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'indicators' 
  AND column_name IN ('evidence_url', 'evidence_type', 'no_evidence_reason', 'rag_status')
ORDER BY column_name;
