CREATE POLICY "Admins can delete any 2fa"
ON public.user_2fa
FOR DELETE
TO public
USING (is_admin(auth.uid()));