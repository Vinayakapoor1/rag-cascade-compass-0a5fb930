

# Remove Wrong Features from Database

## What happened
20 generic features (PE Feature 1-5, PM Feature 1-5, QA Feature 1-5, ST Feature 1-5) were bulk-inserted on Mar 3 with category values like `product_engineering`, `product_management`, `quality_assurance`, `security_technology`. These need to be deleted.

## Plan

Delete these 20 rows from the `features` table using a single DELETE statement filtering by their known IDs (all have the pattern `10000001-*`, `20000001-*`, `30000001-*`, `40000001-*`).

Also clean up any related data in `customer_features`, `indicator_feature_links`, and `csm_feature_scores` that reference these feature IDs, to avoid orphaned records.

### SQL to execute (via insert tool):
```sql
DELETE FROM customer_features WHERE feature_id IN (
  SELECT id FROM features WHERE category IN ('product_engineering','product_management','quality_assurance','security_technology')
);
DELETE FROM indicator_feature_links WHERE feature_id IN (
  SELECT id FROM features WHERE category IN ('product_engineering','product_management','quality_assurance','security_technology')
);
DELETE FROM csm_feature_scores WHERE feature_id IN (
  SELECT id FROM features WHERE category IN ('product_engineering','product_management','quality_assurance','security_technology')
);
DELETE FROM csm_customer_feature_scores WHERE feature_id IN (
  SELECT id FROM features WHERE category IN ('product_engineering','product_management','quality_assurance','security_technology')
);
DELETE FROM features WHERE category IN ('product_engineering','product_management','quality_assurance','security_technology');
```

No code changes needed -- this is a data-only fix.

