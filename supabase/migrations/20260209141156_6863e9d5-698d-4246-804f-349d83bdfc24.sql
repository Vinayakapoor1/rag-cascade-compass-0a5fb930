
-- Table: csm_feature_scores
CREATE TABLE public.csm_feature_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  score_band text,
  rag_value numeric,
  period text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (indicator_id, feature_id, period)
);

ALTER TABLE public.csm_feature_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read csm_feature_scores"
  ON public.csm_feature_scores FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert csm_feature_scores"
  ON public.csm_feature_scores FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update csm_feature_scores"
  ON public.csm_feature_scores FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete csm_feature_scores"
  ON public.csm_feature_scores FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at
CREATE TRIGGER update_csm_feature_scores_updated_at
  BEFORE UPDATE ON public.csm_feature_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: kpi_rag_bands
CREATE TABLE public.kpi_rag_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  band_label text NOT NULL,
  rag_color text NOT NULL,
  rag_numeric numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.kpi_rag_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read kpi_rag_bands"
  ON public.kpi_rag_bands FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage kpi_rag_bands"
  ON public.kpi_rag_bands FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
