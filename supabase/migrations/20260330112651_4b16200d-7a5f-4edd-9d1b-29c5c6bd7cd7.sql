
CREATE TABLE public.visibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section text NOT NULL,
  role text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page, section, role)
);

ALTER TABLE public.visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read visibility_settings"
  ON public.visibility_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage visibility_settings"
  ON public.visibility_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
