-- Add UPDATE policy for indicator_history so users can edit their own entries
CREATE POLICY "Users can update their own history entries"
  ON indicator_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Backfill indicator_history from existing activity_logs
INSERT INTO indicator_history (indicator_id, value, period, created_at, created_by)
SELECT 
  al.entity_id::uuid as indicator_id,
  (al.new_value->>'current_value')::numeric as value,
  COALESCE(al.metadata->>'period', to_char(al.created_at, 'YYYY-MM')) as period,
  al.created_at,
  al.user_id as created_by
FROM activity_logs al
WHERE al.entity_type = 'indicator'
  AND al.action = 'update'
  AND al.new_value->>'current_value' IS NOT NULL
  AND al.entity_id IS NOT NULL
ON CONFLICT DO NOTHING;