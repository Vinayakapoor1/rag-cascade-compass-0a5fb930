
-- Drop and recreate customers_tier_check to allow 'Unassigned'
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_tier_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_tier_check CHECK (tier IN ('Tier1', 'Tier2', 'Tier3', 'Unassigned'));

-- Drop and recreate customers_deployment_type_check to allow additional values
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_deployment_type_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_deployment_type_check CHECK (deployment_type IN ('On Prem', 'Cloud', 'Hybrid', 'India Cloud', 'UAE Cloud', 'Private Cloud'));
