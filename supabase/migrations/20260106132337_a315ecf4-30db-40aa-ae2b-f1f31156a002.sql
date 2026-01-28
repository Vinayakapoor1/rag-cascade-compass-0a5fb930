-- Create CSMs (Customer Success Managers) table
CREATE TABLE public.csms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on csms
ALTER TABLE public.csms ENABLE ROW LEVEL SECURITY;

-- RLS policies for csms
CREATE POLICY "Anyone can read csms"
ON public.csms
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage csms"
ON public.csms
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create Industries table
CREATE TABLE public.industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on industries
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

-- RLS policies for industries
CREATE POLICY "Anyone can read industries"
ON public.industries
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage industries"
ON public.industries
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create customer_features junction table (tracks which features each customer uses)
CREATE TABLE public.customer_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, feature_id)
);

-- Enable RLS on customer_features
ALTER TABLE public.customer_features ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_features
CREATE POLICY "Anyone can read customer_features"
ON public.customer_features
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage customer_features"
ON public.customer_features
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Extend customers table with new columns
ALTER TABLE public.customers
ADD COLUMN contact_person text,
ADD COLUMN email text,
ADD COLUMN csm_id uuid REFERENCES public.csms(id),
ADD COLUMN industry_id uuid REFERENCES public.industries(id),
ADD COLUMN managed_services boolean DEFAULT false,
ADD COLUMN additional_features text;