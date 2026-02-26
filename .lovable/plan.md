

# Clear Content Management Indicator Data

## Problem
The Content Management department's indicators have pre-filled `current_value` and `rag_status` values (e.g., 100/green, 50/red) that are not based on actual CSM-entered scores. These show up on the Content Management department detail page as filled data.

## What Will Be Done

### Database: Reset CM indicator values
Run a single SQL migration to set all Content Management indicators back to their default/empty state:

- Set `current_value` to `0` (or `NULL`) for all 10 CM indicators
- Set `rag_status` to `'grey'` (no data) for all 10 CM indicators

The affected indicators:
- Expansion Pipeline Influence (currently 100/green)
- Release Timeliness Rate (currently 100/green)
- Asset Launch Count vs Target (currently 100/green)
- Completion Depth within 30 days (currently 100/green)
- Avg. Production Cycle Time (currently 100/green)
- Content Engagement Coverage (currently 50/red)
- Pack Launch Count vs Target (currently 50/red)
- Rights Management Compliance (currently 50/red)
- Production Cost per Asset (currently 50/red)
- Version Control Enforcement (currently 50/red)

### SQL Statement
```sql
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
```

No code changes needed -- this is a data-only fix.

