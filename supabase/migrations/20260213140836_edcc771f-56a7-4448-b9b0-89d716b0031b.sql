CREATE POLICY "Users can delete own 2fa"
ON public.user_2fa
FOR DELETE
USING (auth.uid() = user_id);