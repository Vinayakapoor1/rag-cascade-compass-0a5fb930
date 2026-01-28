-- Add formula columns to functional_objectives and key_results tables
ALTER TABLE public.functional_objectives 
ADD COLUMN IF NOT EXISTS formula TEXT;

ALTER TABLE public.key_results 
ADD COLUMN IF NOT EXISTS formula TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.functional_objectives.formula IS 'Aggregation formula for rolling up KR values (e.g., AVG, SUM, WEIGHTED_AVG)';
COMMENT ON COLUMN public.key_results.formula IS 'Aggregation formula for rolling up indicator values (e.g., AVG, SUM, WEIGHTED_AVG)';