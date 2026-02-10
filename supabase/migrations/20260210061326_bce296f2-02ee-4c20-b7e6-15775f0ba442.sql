INSERT INTO indicator_feature_links (indicator_id, feature_id, impact_weight)
SELECT i.id, f.id, 1.0
FROM indicators i
CROSS JOIN features f
WHERE i.key_result_id IN (
  SELECT kr.id FROM key_results kr
  WHERE kr.functional_objective_id IN (
    SELECT fo.id FROM functional_objectives fo
    WHERE fo.department_id = '5cb9dccf-c064-4a13-9cbe-470ea4284ab0'
  )
)
ON CONFLICT DO NOTHING;