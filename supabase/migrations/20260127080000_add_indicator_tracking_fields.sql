-- Add tracking fields to indicators table for data entry audit trail
ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for timeline queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at 
ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type 
ON public.activity_logs(entity_type, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.indicators.last_updated_by IS 'User who last updated the current_value';
COMMENT ON COLUMN public.indicators.last_updated_at IS 'Timestamp of last current_value update';
