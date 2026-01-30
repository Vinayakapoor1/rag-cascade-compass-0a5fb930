-- Drop the existing admin-only delete policy
DROP POLICY IF EXISTS "Admins can delete indicator_history" ON indicator_history;

-- Create new policy that allows:
-- 1. Admins to delete any entry
-- 2. Users to delete their own entries (entries they created)
CREATE POLICY "Users can delete own history entries"
ON indicator_history
FOR DELETE
USING (
  auth.uid() = created_by 
  OR is_admin(auth.uid())
);