CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  page_url text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON public.feedbacks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all feedback" ON public.feedbacks
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can read own feedback" ON public.feedbacks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can update feedback" ON public.feedbacks
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete feedback" ON public.feedbacks
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));