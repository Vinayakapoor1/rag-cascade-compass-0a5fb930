-- Add DELETE policy for indicator_history (currently missing)
CREATE POLICY "Admins can delete indicator_history"
  ON indicator_history FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add DELETE policy for activity_logs (currently missing)  
CREATE POLICY "Admins can delete activity_logs"
  ON activity_logs FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));