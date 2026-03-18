
CREATE TABLE public.member_csm_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  csm_id uuid NOT NULL REFERENCES public.csms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, csm_id)
);

ALTER TABLE public.member_csm_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage member_csm_access" ON public.member_csm_access
  FOR ALL TO public USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own csm access" ON public.member_csm_access
  FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY "Dept heads can manage member_csm_access" ON public.member_csm_access
  FOR ALL TO public USING (is_department_head(auth.uid()));
