-- Add admin role for vinayak.kapoor@infosecventures.com
INSERT INTO public.user_roles (user_id, role)
SELECT 'e14f5073-c078-4405-9821-8811aa565e40', 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'e14f5073-c078-4405-9821-8811aa565e40' 
  AND role = 'admin'
);