

# Fix Customer Data Gaps: Missing Links, Deployment Types, and Icons

## Issues

1. **2 customers have no feature links** -- "E7 GROUP" and "DIFC" are not linked to any features, so they show 0 KPIs. All other 78 customers are linked to all 17 features. These 2 need the same links.
2. **61 customers have NULL deployment_type** -- Only 19 customers have "On Prem" set. The remaining 61 have no deployment type at all.
3. **Deployment badge icons incomplete** -- Only "Cloud" and "On Prem" get icons. Other deployment types (India Cloud, UAE Cloud, Private Cloud, Hybrid) render with no icon.

## Changes

### 1. Database Migration: Link the 2 missing customers to all features

Insert `customer_features` rows for E7 GROUP and DIFC, linking them to all 17 features -- matching what the other 78 customers have.

```sql
INSERT INTO customer_features (customer_id, feature_id)
SELECT c.id, f.id
FROM customers c
CROSS JOIN features f
WHERE c.id IN (
  '32ef17cd-cd56-4f22-8fa0-347a4aa53158',
  '4f85cc8c-9dea-4a11-a9a6-1fcbc3b355c7'
)
ON CONFLICT DO NOTHING;
```

### 2. Database Migration: Set default deployment_type for NULLs

Update the 61 customers with NULL deployment_type to "Cloud" (most common default).

```sql
UPDATE customers SET deployment_type = 'Cloud' WHERE deployment_type IS NULL;
```

### 3. File: `src/pages/CustomersPage.tsx` -- Fix deployment icons

Update the deployment badge icon logic to handle all 6 types:

| Deployment Type | Icon |
|----------------|------|
| Cloud | Cloud |
| India Cloud | Cloud |
| UAE Cloud | Cloud |
| Private Cloud | Cloud |
| On Prem | Server |
| Hybrid | Server + Cloud (or Server) |

Replace the current if/else with a check: if the type includes "Cloud", show Cloud icon; if "On Prem", show Server icon; if "Hybrid", show Server icon.

## Expected Results After Fix

- "Customers with KPIs" changes from 78 to **80** (all customers)
- "Unique KPIs Linked" stays at **10**
- All customer cards show a deployment type badge with an appropriate icon
- No more blank deployment badges

