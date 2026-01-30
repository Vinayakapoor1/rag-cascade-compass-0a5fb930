-- Add new columns to customers table for logo and deployment type
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS deployment_type TEXT CHECK (deployment_type IN ('On Prem', 'Cloud', 'Hybrid'));

-- Add helpful comments
COMMENT ON COLUMN customers.logo_url IS 'URL to customer logo in storage';
COMMENT ON COLUMN customers.deployment_type IS 'Deployment type: On Prem, Cloud, or Hybrid';