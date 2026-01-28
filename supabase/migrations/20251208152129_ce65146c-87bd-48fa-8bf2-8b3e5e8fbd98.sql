-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table for admin access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- Create trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= OKR DATA TABLES =============

-- Organizational Objectives
CREATE TABLE public.org_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'green',
  classification TEXT NOT NULL DEFAULT 'CORE',
  business_outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_objective_id UUID REFERENCES public.org_objectives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Functional Objectives
CREATE TABLE public.functional_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Key Results
CREATE TABLE public.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  functional_objective_id UUID REFERENCES public.functional_objectives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC,
  unit TEXT,
  owner TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indicators
CREATE TABLE public.indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID REFERENCES public.key_results(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'leading',
  formula TEXT,
  frequency TEXT DEFAULT 'Monthly',
  current_value NUMERIC,
  target_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all OKR tables
ALTER TABLE public.org_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.functional_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read, only admins can modify
CREATE POLICY "Anyone can read org_objectives" ON public.org_objectives FOR SELECT USING (true);
CREATE POLICY "Admins can manage org_objectives" ON public.org_objectives FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read functional_objectives" ON public.functional_objectives FOR SELECT USING (true);
CREATE POLICY "Admins can manage functional_objectives" ON public.functional_objectives FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read key_results" ON public.key_results FOR SELECT USING (true);
CREATE POLICY "Admins can manage key_results" ON public.key_results FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read indicators" ON public.indicators FOR SELECT USING (true);
CREATE POLICY "Admins can manage indicators" ON public.indicators FOR ALL USING (public.is_admin(auth.uid()));

-- ============= ACTIVITY LOG =============

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_org_objectives_updated_at BEFORE UPDATE ON public.org_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_functional_objectives_updated_at BEFORE UPDATE ON public.functional_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_key_results_updated_at BEFORE UPDATE ON public.key_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_indicators_updated_at BEFORE UPDATE ON public.indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();