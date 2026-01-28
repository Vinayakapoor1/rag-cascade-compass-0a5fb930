-- Update RLS policies to allow any authenticated user to manage OKR data tables
-- This is appropriate for demo/development phase

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can manage org_objectives" ON public.org_objectives;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage functional_objectives" ON public.functional_objectives;
DROP POLICY IF EXISTS "Admins can manage key_results" ON public.key_results;
DROP POLICY IF EXISTS "Admins can manage indicators" ON public.indicators;

-- Create new policies allowing any authenticated user to manage data
CREATE POLICY "Authenticated users can manage org_objectives"
ON public.org_objectives
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage departments"
ON public.departments
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage functional_objectives"
ON public.functional_objectives
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage key_results"
ON public.key_results
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage indicators"
ON public.indicators
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);