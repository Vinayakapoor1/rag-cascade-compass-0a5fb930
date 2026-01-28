-- Create customer_indicator_values table for per-customer metric data
CREATE TABLE public.customer_indicator_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  value NUMERIC,
  rag_status TEXT DEFAULT 'not-set',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, indicator_id, period)
);

-- Enable RLS
ALTER TABLE public.customer_indicator_values ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read customer_indicator_values"
ON public.customer_indicator_values
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage customer_indicator_values"
ON public.customer_indicator_values
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for common queries
CREATE INDEX idx_customer_indicator_values_customer ON public.customer_indicator_values(customer_id);
CREATE INDEX idx_customer_indicator_values_indicator ON public.customer_indicator_values(indicator_id);
CREATE INDEX idx_customer_indicator_values_period ON public.customer_indicator_values(period);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_indicator_values_updated_at
BEFORE UPDATE ON public.customer_indicator_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();