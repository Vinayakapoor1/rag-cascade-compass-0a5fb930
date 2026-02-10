
-- Add user_id column to csms table to link CSMs to auth users
ALTER TABLE public.csms
ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.csms.user_id IS 'Links CSM to their auth user account for matrix filtering';
