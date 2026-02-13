
-- Table to store per-customer attachments for CSM check-ins
CREATE TABLE public.csm_checkin_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('file', 'link')),
  file_name TEXT,
  file_path TEXT,
  link_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.csm_checkin_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can read csm_checkin_attachments"
  ON public.csm_checkin_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert csm_checkin_attachments"
  ON public.csm_checkin_attachments FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own attachments or admins"
  ON public.csm_checkin_attachments FOR DELETE
  USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_csm_checkin_attachments_lookup 
  ON public.csm_checkin_attachments(customer_id, department_id, period);
