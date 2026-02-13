
-- Table for multiple evidence items per indicator per period
CREATE TABLE public.indicator_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('file', 'link')),
  file_name TEXT,
  file_path TEXT,
  link_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.indicator_evidence ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Anyone authenticated can read indicator_evidence"
ON public.indicator_evidence FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert their own
CREATE POLICY "Authenticated users can insert indicator_evidence"
ON public.indicator_evidence FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Creator or admin can delete
CREATE POLICY "Users can delete own evidence or admins"
ON public.indicator_evidence FOR DELETE
USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_indicator_evidence_lookup ON public.indicator_evidence(indicator_id, period);
