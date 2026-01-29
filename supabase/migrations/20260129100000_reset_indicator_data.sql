-- Reset all indicator data to clean state
-- This will set all indicators back to default values with no evidence

-- Reset indicator values and evidence
UPDATE indicators
SET 
    current_value = NULL,
    evidence_file = NULL,
    evidence_url = NULL,
    evidence_reason = NULL,
    rag_status = 'amber',
    updated_at = NOW();

-- Delete all indicator history entries
DELETE FROM indicator_history;

-- Delete all activity logs for indicator updates
DELETE FROM activity_logs 
WHERE entity_type = 'indicator' AND action = 'update';

-- Note: Evidence files in storage need to be deleted manually or via admin UI
-- Storage bucket: evidence-files
