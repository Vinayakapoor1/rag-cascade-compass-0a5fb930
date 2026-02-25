
-- Normalize lowercase "hospitality" to "Hospitality" in customers table
UPDATE public.customers SET industry = 'Hospitality' WHERE industry = 'hospitality';

-- Insert all distinct industry values from customers into industries table
INSERT INTO public.industries (name)
SELECT DISTINCT industry FROM public.customers
WHERE industry IS NOT NULL AND TRIM(industry) != ''
ON CONFLICT DO NOTHING;
