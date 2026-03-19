
-- Create daily_backups table
CREATE TABLE IF NOT EXISTS public.daily_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  backup_type text NOT NULL DEFAULT 'scheduled',
  tables_included text[] NOT NULL,
  data jsonb NOT NULL,
  row_counts jsonb,
  size_bytes bigint
);

ALTER TABLE public.daily_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read backups"
  ON public.daily_backups FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete backups"
  ON public.daily_backups FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service can insert backups"
  ON public.daily_backups FOR INSERT TO public
  WITH CHECK (true);
