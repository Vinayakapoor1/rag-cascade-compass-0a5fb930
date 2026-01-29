-- Step 1: Create indicator_history table
CREATE TABLE public.indicator_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid REFERENCES public.indicators(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  period text NOT NULL,
  evidence_url text,
  no_evidence_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.indicator_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view indicator history"
  ON public.indicator_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert indicator history"
  ON public.indicator_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Step 2: Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 3: Create bulk_reset_indicators function
CREATE OR REPLACE FUNCTION public.bulk_reset_indicators(p_department_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_count integer;
BEGIN
  WITH indicator_ids AS (
    SELECT i.id
    FROM indicators i
    JOIN key_results kr ON i.key_result_id = kr.id
    JOIN functional_objectives fo ON kr.functional_objective_id = fo.id
    WHERE fo.department_id = p_department_id
  )
  UPDATE indicators
  SET 
    current_value = NULL,
    evidence_url = NULL,
    evidence_type = NULL,
    no_evidence_reason = NULL,
    rag_status = 'amber'
  WHERE id IN (SELECT id FROM indicator_ids);
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$;