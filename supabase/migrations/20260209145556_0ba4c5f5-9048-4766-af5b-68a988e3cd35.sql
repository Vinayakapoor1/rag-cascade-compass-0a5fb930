
-- Create csm_customer_feature_scores table for granular Customer x Feature x KPI scores
CREATE TABLE public.csm_customer_feature_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  value numeric,
  period text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT csm_customer_feature_scores_unique UNIQUE (indicator_id, customer_id, feature_id, period)
);

-- Enable RLS
ALTER TABLE public.csm_customer_feature_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read csm_customer_feature_scores"
  ON public.csm_customer_feature_scores FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert csm_customer_feature_scores"
  ON public.csm_customer_feature_scores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update csm_customer_feature_scores"
  ON public.csm_customer_feature_scores FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete csm_customer_feature_scores"
  ON public.csm_customer_feature_scores FOR DELETE USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at trigger
CREATE TRIGGER update_csm_customer_feature_scores_updated_at
  BEFORE UPDATE ON public.csm_customer_feature_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
