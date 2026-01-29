-- ============================================
-- RESTORE INDICATOR VALUES FROM HISTORY
-- ============================================
-- This will restore the most recent values from indicator_history
-- back to the indicators table
-- ============================================

-- Update indicators with their most recent values from history
UPDATE public.indicators AS i
SET 
    current_value = h.new_value,
    updated_at = h.created_at
FROM (
    SELECT DISTINCT ON (indicator_id)
        indicator_id,
        new_value,
        created_at
    FROM public.indicator_history
    WHERE new_value IS NOT NULL
    ORDER BY indicator_id, created_at DESC
) AS h
WHERE i.id = h.indicator_id;

-- Verify the restoration
SELECT 
    i.name,
    i.current_value,
    i.updated_at,
    d.name as department_name
FROM public.indicators i
JOIN public.key_results kr ON i.key_result_id = kr.id
JOIN public.functional_objectives fo ON kr.functional_objective_id = fo.id
JOIN public.departments d ON fo.department_id = d.id
WHERE i.current_value IS NOT NULL
ORDER BY i.updated_at DESC
LIMIT 20;
