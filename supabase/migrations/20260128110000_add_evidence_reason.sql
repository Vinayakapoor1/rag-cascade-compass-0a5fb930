-- Migration: Add evidence reason field to indicators and indicator_history tables
-- This allows users to provide a reason when no evidence file is available

-- Add reason field to indicators table
ALTER TABLE indicators 
ADD COLUMN IF NOT EXISTS no_evidence_reason TEXT;

-- Add reason field to indicator_history table
ALTER TABLE indicator_history 
ADD COLUMN IF NOT EXISTS no_evidence_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN indicators.no_evidence_reason IS 
'Reason provided when no evidence file is uploaded. Required if evidence_url is null.';

COMMENT ON COLUMN indicator_history.no_evidence_reason IS 
'Reason provided when no evidence file was uploaded for this historical entry.';
