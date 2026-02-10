
-- Create ventures table
CREATE TABLE public.ventures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ventures ENABLE ROW LEVEL SECURITY;

-- Read policy for all authenticated users
CREATE POLICY "Anyone can read ventures"
  ON public.ventures FOR SELECT
  USING (true);

-- Admin management policy
CREATE POLICY "Authenticated users can manage ventures"
  ON public.ventures FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seed ventures
INSERT INTO public.ventures (name, display_name, is_active) VALUES
  ('HumanFirewall', 'Human Firewall', true),
  ('EmailRemediator', 'Email Remediator', false),
  ('CyberForceHQ', 'CyberForce HQ', false),
  ('SecurityRating', 'Security Rating', false);

-- Add venture_id to org_objectives
ALTER TABLE public.org_objectives
  ADD COLUMN venture_id uuid REFERENCES public.ventures(id);

-- Backfill existing org_objectives to HumanFirewall
UPDATE public.org_objectives
  SET venture_id = (SELECT id FROM public.ventures WHERE name = 'HumanFirewall');
