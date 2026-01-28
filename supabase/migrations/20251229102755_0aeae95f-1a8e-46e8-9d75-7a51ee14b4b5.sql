
-- =====================================================
-- PHASE 1: CREATE NEW TABLES FOR DATA FLOW ENGINE
-- =====================================================

-- 1.1 Create customers table (Customer Master)
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Tier1' CHECK (tier IN ('Tier1', 'Tier2', 'Tier3')),
  region TEXT,
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Churned', 'Prospect')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 1.2 Create raw_data_inputs table (Append-Only - NO updated_at)
CREATE TABLE public.raw_data_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  data_value NUMERIC,
  data_type TEXT NOT NULL,
  record_date DATE NOT NULL,
  period TEXT NOT NULL,
  source_file TEXT,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  validation_errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  -- NO updated_at - this table is append-only/immutable
);

-- 1.3 Create formula_versions table (Versioned formulas)
CREATE TABLE public.formula_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  formula_expression TEXT NOT NULL,
  formula_type TEXT NOT NULL DEFAULT 'Percentage' CHECK (formula_type IN ('Percentage', 'Absolute', 'Sum', 'Average', 'Count', 'Custom')),
  variables JSONB,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(indicator_id, version_number)
);

-- 1.4 Create rag_versions table (Versioned RAG thresholds)
CREATE TABLE public.rag_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  red_threshold NUMERIC NOT NULL DEFAULT 40,
  amber_threshold NUMERIC NOT NULL DEFAULT 70,
  green_threshold NUMERIC NOT NULL DEFAULT 70,
  rag_logic TEXT DEFAULT 'higher_is_better' CHECK (rag_logic IN ('higher_is_better', 'lower_is_better', 'target_based')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(indicator_id, version_number)
);

-- 1.5 Create indicator_config table (Filters & Configuration)
CREATE TABLE public.indicator_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE UNIQUE,
  allowed_tiers TEXT[] DEFAULT ARRAY['Tier1', 'Tier2', 'Tier3'],
  allowed_regions TEXT[],
  allowed_statuses TEXT[] DEFAULT ARRAY['Active'],
  allowed_industries TEXT[],
  time_window_days INTEGER,
  data_source TEXT,
  aggregation_method TEXT DEFAULT 'latest' CHECK (aggregation_method IN ('latest', 'sum', 'average', 'count', 'min', 'max')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 1.6 Create indicator_snapshots table (Immutable Calculation Results)
CREATE TABLE public.indicator_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  calculated_value NUMERIC,
  rag_status TEXT CHECK (rag_status IN ('red', 'amber', 'green', 'grey')),
  formula_version_id UUID REFERENCES public.formula_versions(id) ON DELETE SET NULL,
  rag_version_id UUID REFERENCES public.rag_versions(id) ON DELETE SET NULL,
  total_records_processed INTEGER DEFAULT 0,
  valid_records INTEGER DEFAULT 0,
  rejected_records INTEGER DEFAULT 0,
  calculation_metadata JSONB,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  calculated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
  -- NO updated_at - snapshots are NEVER modified
);

-- 1.7 Create snapshot_explainability table (Why this result?)
CREATE TABLE public.snapshot_explainability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.indicator_snapshots(id) ON DELETE CASCADE UNIQUE,
  filters_applied JSONB,
  total_customers INTEGER DEFAULT 0,
  count_red INTEGER DEFAULT 0,
  count_amber INTEGER DEFAULT 0,
  count_green INTEGER DEFAULT 0,
  data_breakdown JSONB,
  rejection_reasons JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PHASE 2: UPDATE EXISTING INDICATORS TABLE
-- =====================================================

-- Add new columns to indicators table
ALTER TABLE public.indicators 
ADD COLUMN IF NOT EXISTS indicator_type TEXT DEFAULT 'Percentage' CHECK (indicator_type IN ('Percentage', 'Absolute', 'Rating', 'Count')),
ADD COLUMN IF NOT EXISTS data_source TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- =====================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_raw_data_inputs_indicator ON public.raw_data_inputs(indicator_id);
CREATE INDEX IF NOT EXISTS idx_raw_data_inputs_period ON public.raw_data_inputs(period);
CREATE INDEX IF NOT EXISTS idx_raw_data_inputs_customer ON public.raw_data_inputs(customer_id);
CREATE INDEX IF NOT EXISTS idx_indicator_snapshots_indicator ON public.indicator_snapshots(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_snapshots_period ON public.indicator_snapshots(period);
CREATE INDEX IF NOT EXISTS idx_formula_versions_indicator ON public.formula_versions(indicator_id);
CREATE INDEX IF NOT EXISTS idx_rag_versions_indicator ON public.rag_versions(indicator_id);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON public.customers(tier);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

-- =====================================================
-- PHASE 4: ENABLE RLS ON ALL NEW TABLES
-- =====================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_data_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_explainability ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 5: CREATE RLS POLICIES
-- =====================================================

-- Customers policies
CREATE POLICY "Anyone can read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage customers" ON public.customers FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Raw data inputs policies (read-only for most, insert for authenticated)
CREATE POLICY "Anyone can read raw_data_inputs" ON public.raw_data_inputs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert raw_data_inputs" ON public.raw_data_inputs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Formula versions policies
CREATE POLICY "Anyone can read formula_versions" ON public.formula_versions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage formula_versions" ON public.formula_versions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RAG versions policies
CREATE POLICY "Anyone can read rag_versions" ON public.rag_versions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage rag_versions" ON public.rag_versions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Indicator config policies
CREATE POLICY "Anyone can read indicator_config" ON public.indicator_config FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage indicator_config" ON public.indicator_config FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Indicator snapshots policies (read-only for viewing, insert for calculation)
CREATE POLICY "Anyone can read indicator_snapshots" ON public.indicator_snapshots FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert indicator_snapshots" ON public.indicator_snapshots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Snapshot explainability policies
CREATE POLICY "Anyone can read snapshot_explainability" ON public.snapshot_explainability FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert snapshot_explainability" ON public.snapshot_explainability FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- PHASE 6: CREATE TRIGGERS FOR updated_at
-- =====================================================

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_indicator_config_updated_at
  BEFORE UPDATE ON public.indicator_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
