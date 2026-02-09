

# KPI-Driven Customer x Feature Data Entry Matrix

## Overview
Rewrite the `CSMDataEntryMatrix` component to display all KPIs for the department statically (no selector), each with its own Customer x Feature grid. The CSM fills in percentage values per customer-feature cell. Scores auto-aggregate up to the KPI level and feed the existing RAG cascade.

## What Users Will See

On the "Feature Matrix" tab of the Department Data Entry page:

- Each KPI linked to features is shown as a **collapsible section** (all expanded by default)
- Inside each KPI section is a grid:
  - **Rows** = Customers who use at least one of the KPI's linked features (derived from `indicator_feature_links` + `customer_features`)
  - **Columns** = Features linked to the KPI
  - **Cells** = Percentage input (0-100), auto-colored by RAG thresholds. Only editable where the customer uses that feature ("--" otherwise)
  - **Per-customer aggregate** column = average of that customer's filled cells
  - **KPI aggregate** badge at the top = average of all customer aggregates
- A single "Save All" button at the top persists everything and updates `indicators.current_value`

```text
-- KPI: Adoption Rate  [Aggregate: 72% Amber] --
+-------------------+-------+-------+-------+-------+-----------+
| Customer          | LMS   | VCRO  | Phish | Portal| Avg       |
+-------------------+-------+-------+-------+-------+-----------+
| DHA               | [85 ] | [90 ] |  --   | [70 ] |   82%  G  |
| VOIS              | [60 ] | [75 ] | [80 ] |  --   |   72%  A  |
| Edge Group        |  --   | [40 ] | [55 ] | [90 ] |   62%  A  |
+-------------------+-------+-------+-------+-------+-----------+

-- KPI: NPS Score  [Aggregate: 65% Amber] --
+-------------------+-------+-------+-----------+
| Customer          | LMS   | VCRO  | Avg       |
+-------------------+-------+-------+-----------+
| DHA               | [70 ] | [60 ] |   65%  A  |
+-------------------+-------+-------+-----------+
```

## Data Connections

The relationship chain uses existing tables only -- no new mapping needed:

1. **KPI to Features**: `indicator_feature_links` tells us which features are relevant to each KPI
2. **Features to Customers**: `customer_features` tells us which customers use each feature
3. **Intersection**: A cell is editable only when both links exist (the KPI tracks that feature AND the customer uses that feature)

## Implementation Steps

### Step 1: New Database Table

**`csm_customer_feature_scores`** -- stores the granular percentage per cell

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| indicator_id | uuid | FK -- which KPI |
| customer_id | uuid | FK -- which customer row |
| feature_id | uuid | FK -- which feature column |
| value | numeric | Percentage 0-100 |
| period | text | e.g. "2026-02" |
| created_by | uuid | auth.uid() |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

- Unique constraint: (indicator_id, customer_id, feature_id, period)
- RLS: anyone authenticated can read; authenticated can insert/update/delete
- Trigger: auto-update `updated_at` on change

### Step 2: Rewrite `CSMDataEntryMatrix.tsx`

Complete rewrite of the component logic:

**Data fetching:**
1. Get all indicators for the department (FO -> KR -> Indicators chain, same as now)
2. For each indicator with feature links, fetch linked features from `indicator_feature_links`
3. For those features, fetch customers who use them from `customer_features`
4. Load existing scores from `csm_customer_feature_scores` for the period

**Rendering -- per KPI section:**
- Collapsible card with KPI name, hierarchy path (FO -> KR), and aggregate badge
- Table with customer rows, feature columns, percentage inputs
- Cells are disabled/greyed where customer does not use the feature
- Auto-color cells: Green (76-100), Amber (51-75), Red (1-50), Gray (empty)
- Customer aggregate column (rightmost)
- Customer name search/filter at the top of each section (since there could be 77 customers)

**Aggregation:**
```text
Customer Avg = AVG(filled cells for that customer)
KPI Aggregate = AVG(all customer averages)
```

**Save logic:**
- Upsert all cells to `csm_customer_feature_scores`
- For each KPI, compute aggregate and write to `indicators.current_value` (target=100)
- Create `indicator_history` entries
- Log to `activity_logs`

### Step 3: No Changes to DepartmentDataEntry Page

The parent page already has the "Feature Matrix" tab wired up. Only the component internals change.

## Files to Create
- Database migration for `csm_customer_feature_scores` table

## Files to Modify
- `src/components/user/CSMDataEntryMatrix.tsx` -- full rewrite: KPI sections with Customer x Feature grids using percentage inputs

## Technical Notes
- 77 customers x 17 features is manageable without virtualization, but a search filter per section keeps it usable
- The existing `csm_feature_scores` table remains untouched for backward compatibility
- Cell key format: `indicator_id::customer_id::feature_id`
- Period is passed from the parent page's period selector (already wired)
- Evidence is not required for matrix entries -- the granular per-customer data serves as documentation

