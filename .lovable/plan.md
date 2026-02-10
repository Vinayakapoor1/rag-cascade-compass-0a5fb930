

# Populate Indicator-Feature Links for Customer Success

## What This Does

Creates 170 entries in `indicator_feature_links` by cross-joining all 10 Customer Success KPI indicators with all 17 features. This will immediately make the Feature Matrix tab show data entry grids.

## Database Migration

A single SQL migration that:

1. Finds all indicators under the Customer Success department (id: `5cb9dccf-c064-4a13-9cbe-470ea4284ab0`) by traversing: Department → Functional Objectives → Key Results → Indicators
2. Cross-joins those indicators with all rows in the `features` table
3. Inserts the results into `indicator_feature_links` with `impact_weight = 1.0`
4. Uses `ON CONFLICT DO NOTHING` to avoid duplicates if run again

```sql
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
```

## Result

- 10 KPIs x 17 features = 170 new link rows
- The Feature Matrix tab will immediately show 10 collapsible KPI sections
- Each section will have up to 77 customer rows and 17 feature columns
- Cells will be editable where the customer is mapped to that feature in `customer_features`

## Files to Modify
- None -- database migration only

