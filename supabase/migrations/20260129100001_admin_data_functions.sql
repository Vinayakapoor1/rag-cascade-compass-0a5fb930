-- Admin-only functions for data management

-- Function to delete data for a single indicator
CREATE OR REPLACE FUNCTION delete_indicator_data(p_indicator_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Only admins can delete indicator data';
    END IF;

    -- Reset indicator data
    UPDATE indicators
    SET 
        current_value = NULL,
        evidence_file = NULL,
        evidence_url = NULL,
        evidence_reason = NULL,
        rag_status = 'amber',
        updated_at = NOW()
    WHERE id = p_indicator_id;

    -- Delete history for this indicator
    DELETE FROM indicator_history
    WHERE indicator_id = p_indicator_id;

    -- Log the deletion
    INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        entity_name,
        metadata
    )
    SELECT 
        auth.uid(),
        'delete',
        'indicator',
        p_indicator_id,
        i.name,
        jsonb_build_object('admin_action', true)
    FROM indicators i
    WHERE i.id = p_indicator_id;
END;
$$;

-- Function to bulk reset indicators for a department
CREATE OR REPLACE FUNCTION bulk_reset_indicators(p_department_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Only admins can bulk reset indicators';
    END IF;

    -- Reset all indicators for the department
    UPDATE indicators i
    SET 
        current_value = NULL,
        evidence_file = NULL,
        evidence_url = NULL,
        evidence_reason = NULL,
        rag_status = 'amber',
        updated_at = NOW()
    FROM key_results kr
    JOIN functional_objectives fo ON kr.functional_objective_id = fo.id
    WHERE i.key_result_id = kr.id
    AND fo.department_id = p_department_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Delete history for these indicators
    DELETE FROM indicator_history ih
    USING indicators i
    JOIN key_results kr ON i.key_result_id = kr.id
    JOIN functional_objectives fo ON kr.functional_objective_id = fo.id
    WHERE ih.indicator_id = i.id
    AND fo.department_id = p_department_id;

    -- Log the bulk deletion
    INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        entity_name,
        metadata
    )
    SELECT 
        auth.uid(),
        'bulk_delete',
        'department',
        p_department_id,
        d.name,
        jsonb_build_object(
            'admin_action', true,
            'indicators_reset', v_count
        )
    FROM departments d
    WHERE d.id = p_department_id;

    RETURN v_count;
END;
$$;

-- Grant execute permissions to authenticated users (function checks admin role internally)
GRANT EXECUTE ON FUNCTION delete_indicator_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_reset_indicators(UUID) TO authenticated;
