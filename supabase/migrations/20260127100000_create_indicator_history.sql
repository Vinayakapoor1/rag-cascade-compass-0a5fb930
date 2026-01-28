-- Create indicator_history table for tracking all value changes over time
CREATE TABLE IF NOT EXISTS public.indicator_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    indicator_id UUID REFERENCES public.indicators(id) ON DELETE CASCADE NOT NULL,
    value NUMERIC NOT NULL,
    period TEXT NOT NULL, -- Format: YYYY-MM for monthly tracking
    evidence_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_indicator_history_indicator_id ON public.indicator_history(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_history_period ON public.indicator_history(indicator_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_indicator_history_created_at ON public.indicator_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.indicator_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view history for indicators in their departments
CREATE POLICY "Users can view indicator history for their departments"
    ON public.indicator_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.indicators i
            JOIN public.key_results kr ON i.key_result_id = kr.id
            JOIN public.functional_objectives fo ON kr.functional_objective_id = fo.id
            JOIN public.department_access da ON fo.department_id = da.department_id
            WHERE i.id = indicator_history.indicator_id
            AND da.user_id = auth.uid()
        )
    );

-- Users can insert history for indicators in their departments
CREATE POLICY "Users can insert indicator history for their departments"
    ON public.indicator_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.indicators i
            JOIN public.key_results kr ON i.key_result_id = kr.id
            JOIN public.functional_objectives fo ON kr.functional_objective_id = fo.id
            JOIN public.department_access da ON fo.department_id = da.department_id
            WHERE i.id = indicator_history.indicator_id
            AND da.user_id = auth.uid()
        )
    );

-- Add comment
COMMENT ON TABLE public.indicator_history IS 'Stores historical values for indicators with flexible period tracking. Period can be any format (YYYY-MM for monthly, YYYY-WW for weekly, YYYY-MM-DD for daily, etc.)';
COMMENT ON COLUMN public.indicator_history.period IS 'Flexible period identifier - can be YYYY-MM (monthly), YYYY-WW (weekly), YYYY-MM-DD (daily), or any custom format';
