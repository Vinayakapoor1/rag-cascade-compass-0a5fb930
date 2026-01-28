-- Add allowed_feature_categories to indicator_config for scope-based KPI mapping
ALTER TABLE indicator_config 
ADD COLUMN IF NOT EXISTS allowed_feature_categories TEXT[] DEFAULT '{}';