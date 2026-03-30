
-- Add department_id column to visibility_settings
ALTER TABLE public.visibility_settings 
ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE DEFAULT NULL;

-- Drop old unique constraint
ALTER TABLE public.visibility_settings 
DROP CONSTRAINT IF EXISTS visibility_settings_page_section_role_key;

-- Add new unique constraint including department_id (NULL-safe with COALESCE)
CREATE UNIQUE INDEX visibility_settings_page_section_role_dept_idx 
ON public.visibility_settings (page, section, role, COALESCE(department_id, '00000000-0000-0000-0000-000000000000'));

-- Seed department-specific defaults for CS and ST dept heads seeing Sec+Tech deployment params
-- CS dept head can see sectech_deployment_params
INSERT INTO public.visibility_settings (page, section, role, is_visible, department_id)
VALUES 
  ('data_entry', 'sectech_deployment_params', 'department_head', true, '5cb9dccf-c064-4a13-9cbe-470ea4284ab0'),
  ('data_entry', 'sectech_deployment_params', 'department_head', true, 'b8d59080-98e4-4d98-82c4-434a141f13b9')
ON CONFLICT DO NOTHING;
