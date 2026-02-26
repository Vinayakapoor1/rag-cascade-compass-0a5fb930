UPDATE indicators
SET current_value = 0, rag_status = 'grey'
WHERE id IN (
  SELECT i.id
  FROM indicators i
  JOIN key_results kr ON kr.id = i.key_result_id
  JOIN functional_objectives fo ON fo.id = kr.functional_objective_id
  JOIN departments d ON d.id = fo.department_id
  WHERE d.name = 'Content Management'
);