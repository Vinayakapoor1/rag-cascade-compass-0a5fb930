-- Add color column to departments for department-specific coloring
ALTER TABLE public.departments 
ADD COLUMN color VARCHAR(50) DEFAULT NULL;

-- Add evidence columns to indicators for file/link attachments
ALTER TABLE public.indicators 
ADD COLUMN evidence_url TEXT DEFAULT NULL,
ADD COLUMN evidence_type VARCHAR(50) DEFAULT NULL;

-- Add comment for context
COMMENT ON COLUMN public.departments.color IS 'Department identity color (e.g., green, purple, blue, yellow, orange)';
COMMENT ON COLUMN public.indicators.evidence_url IS 'URL or file path for evidence attachment';
COMMENT ON COLUMN public.indicators.evidence_type IS 'Type of evidence: file or link';