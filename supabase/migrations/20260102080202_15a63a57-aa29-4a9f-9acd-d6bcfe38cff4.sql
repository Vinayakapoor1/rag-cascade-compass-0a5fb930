-- Allow admins to see all profiles for Team Access management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin(auth.uid()));