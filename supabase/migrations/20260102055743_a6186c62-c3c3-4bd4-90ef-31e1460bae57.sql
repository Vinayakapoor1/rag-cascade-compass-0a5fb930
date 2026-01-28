-- Create department_access table for mapping users to departments
CREATE TABLE public.department_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, department_id)
);

-- Enable Row Level Security
ALTER TABLE public.department_access ENABLE ROW LEVEL SECURITY;

-- Admins can manage all department access
CREATE POLICY "Admins can manage department_access" ON public.department_access
  FOR ALL USING (is_admin(auth.uid()));

-- Users can view their own access
CREATE POLICY "Users can view own access" ON public.department_access
  FOR SELECT USING (auth.uid() = user_id);

-- Create helper function to check department access
CREATE OR REPLACE FUNCTION public.has_department_access(_user_id UUID, _dept_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_access 
    WHERE user_id = _user_id AND department_id = _dept_id
  ) OR is_admin(_user_id)
$$;

-- Create helper function to check if user is department head
CREATE OR REPLACE FUNCTION public.is_department_head(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'department_head'
  )
$$;