
CREATE TABLE public.customer_health_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period text NOT NULL,
  bug_count integer DEFAULT NULL,
  bug_sla_compliance numeric DEFAULT NULL,
  promises_made integer DEFAULT NULL,
  promises_delivered integer DEFAULT NULL,
  nfr_compliance numeric DEFAULT NULL,
  created_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  notes text DEFAULT NULL,
  UNIQUE (customer_id, period)
);

ALTER TABLE public.customer_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer_health_metrics"
  ON public.customer_health_metrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage customer_health_metrics"
  ON public.customer_health_metrics FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_customer_health_metrics_updated_at
  BEFORE UPDATE ON public.customer_health_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
