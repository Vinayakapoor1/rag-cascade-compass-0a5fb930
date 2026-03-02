

# Fix Compliance Report: Per-Customer Feature-Level Detail

## Problem
The current compliance report incorrectly uses a single global `totalExpected` count for all customers. In reality, each customer has different features mapped via `customer_features`, so "360 ONE" expects 100 entries while "ABP Network" expects only 10. The report also lacks detail on which specific features/indicators are filled vs pending.

## Changes

### 1. Fix the expected count calculation (ComplianceReport.tsx)
- Fetch `customer_features` to know which features each customer has
- For each customer, compute expected = count of `indicator_feature_links` rows where `feature_id` is in that customer's features
- Replace the incorrect global `totalExpected` with per-customer expected counts

### 2. Fetch detailed score data (ComplianceReport.tsx)
- Expand the current scores query to include `feature_id` and `indicator_id` (not just `customer_id`)
- This lets us determine exactly which feature-indicator pairs are filled vs pending

### 3. Add expandable customer detail row (new component: ComplianceCustomerDetail.tsx)
When a customer row is clicked/expanded, show a breakdown:
- A mini-table listing each feature the customer has
- For each feature: how many indicators are scored vs expected, and status (filled/pending)
- Last check-in date for that specific customer (max `created_at` from scores)
- Color-coded: green for filled features, red for pending ones

### 4. Update ComplianceCustomerTable.tsx
- Make rows expandable (using Collapsible or accordion pattern)
- Pass the detailed score data and customer-feature mapping as props
- Fix the "Scores" column to show correct per-customer expected count

## Technical Details

### Data flow
```text
customer_features: customer_id -> [feature_ids]
indicator_feature_links: feature_id -> [indicator_ids]

Per customer expected = SUM of indicators linked to each of their features
Per customer filled = COUNT of csm_customer_feature_scores rows for that customer+period

Detail view per feature:
  - Expected indicators = indicator_feature_links where feature_id = X
  - Filled indicators = csm_customer_feature_scores where customer_id + feature_id + period match
```

### New queries in ComplianceReport.tsx
- `customer_features`: fetch `customer_id, feature_id` (all rows)
- Expand `currentScores` query to include `feature_id, indicator_id`

### New component: `src/components/compliance/ComplianceCustomerDetail.tsx`
- Receives: customer ID, feature list, indicator-feature links, scores for that customer
- Renders a sub-table with one row per feature showing filled/pending indicator count

### Modified: `src/components/compliance/ComplianceCustomerTable.tsx`
- Add expand/collapse per row
- Update `CustomerRow` interface to include `totalExpected` as per-customer value (already there, just calculated wrong)
- Add new props for detail data

### Modified: `src/components/compliance/ComplianceSummaryCards.tsx`
- No changes needed (stats are computed from rows which will now have correct data)

### Files touched
1. `src/pages/ComplianceReport.tsx` -- fix data fetching and expected count logic
2. `src/components/compliance/ComplianceCustomerTable.tsx` -- add expandable rows
3. `src/components/compliance/ComplianceCustomerDetail.tsx` -- new component for feature-level detail

