-- Phase 1: KPI Driver Mapping System - New Tables

-- 1. Features master table (platform features)
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indicator ↔ Customer links (many-to-many)
CREATE TABLE public.indicator_customer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  impact_weight NUMERIC DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(indicator_id, customer_id)
);

-- 3. Indicator ↔ Feature links (many-to-many)
CREATE TABLE public.indicator_feature_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE CASCADE NOT NULL,
  feature_id UUID REFERENCES public.features(id) ON DELETE CASCADE NOT NULL,
  impact_weight NUMERIC DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(indicator_id, feature_id)
);

-- 4. Customer feature adoption tracking
CREATE TABLE public.customer_feature_adoption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  feature_id UUID REFERENCES public.features(id) ON DELETE CASCADE NOT NULL,
  adoption_score NUMERIC,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, feature_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_customer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_feature_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feature_adoption ENABLE ROW LEVEL SECURITY;

-- RLS Policies for features table
CREATE POLICY "Anyone can read features"
ON public.features FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage features"
ON public.features FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for indicator_customer_links table
CREATE POLICY "Anyone can read indicator_customer_links"
ON public.indicator_customer_links FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage indicator_customer_links"
ON public.indicator_customer_links FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for indicator_feature_links table
CREATE POLICY "Anyone can read indicator_feature_links"
ON public.indicator_feature_links FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage indicator_feature_links"
ON public.indicator_feature_links FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for customer_feature_adoption table
CREATE POLICY "Anyone can read customer_feature_adoption"
ON public.customer_feature_adoption FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage customer_feature_adoption"
ON public.customer_feature_adoption FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for features updated_at
CREATE TRIGGER update_features_updated_at
BEFORE UPDATE ON public.features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();