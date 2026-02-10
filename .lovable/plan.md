

# Indicator Derivation Breakdown Dialog (CSM Scores View)

## Overview
When a user clicks on an indicator (KPI) in the Department Detail page's hierarchy tree, a dialog opens showing the full derivation: which customers and features contributed scores, their individual values, and how the final aggregate was calculated. This view is RBAC-controlled -- CSMs see only their assigned customers, Department Heads see their department's data, and Admins see everything.

## What Changes

### 1. New Component: `IndicatorDerivationDialog`
A new dialog component that, given an `indicator_id`, queries `csm_customer_feature_scores` and displays:
- **Summary**: Indicator name, current aggregate value, target value, RAG status
- **Customer Breakdown Table**: Each customer with their average score across features, individual feature scores, and the band label chosen
- **Aggregation Visual**: Shows how customer averages roll up to the final KPI value (Customer AVG -> KPI Aggregate)
- **Period Selector**: Dropdown to view scores from different periods (defaults to latest)

### 2. RBAC Filtering
- **Admin**: Sees all customer-feature scores for the indicator
- **CSM**: Query is filtered to only show customers assigned to their CSM record (via `csms.id` -> `customer_csm_assignments` or the customer filter logic already in the matrix)
- **Department Head**: Sees all scores within their accessible departments (the indicator itself is already scoped by department visibility)
- Uses `useAuth` hook for `isAdmin`, `isCSM`, `csmId`

### 3. Integration into Department Detail Page
- The `IndicatorStatBlock` component in `DepartmentDetail.tsx` gets an `onClick` that opens the new `IndicatorDerivationDialog`
- The existing card becomes clickable with a hover state and a small "view derivation" icon hint

### 4. Data Visualization
- A simple bar chart (using Recharts, already installed) showing each customer's average score
- Color-coded bars using RAG colors (green/amber/red based on score thresholds)
- A summary row showing the aggregation formula: AVG of all customer averages = final KPI value

## Technical Details

### New File: `src/components/IndicatorDerivationDialog.tsx`
- Props: `indicatorId`, `indicatorName`, `currentValue`, `targetValue`, `unit`, `open`, `onOpenChange`
- Fetches from `csm_customer_feature_scores` joined with `customers(name)` and `features(name)`
- Groups by customer, calculates per-customer average
- Fetches `kpi_rag_bands` for the indicator to show band labels
- RBAC: if `isCSM && csmId`, adds filter `.in('customer_id', assignedCustomerIds)` by first querying customers assigned to the CSM
- Period selector queries distinct periods for this indicator

### Modified File: `src/pages/DepartmentDetail.tsx`
- Import `IndicatorDerivationDialog`
- Add state for selected indicator in `DepartmentDetail` component
- Update `IndicatorStatBlock` to accept an `onClick` callback
- Wrap indicator card content with a clickable div that opens the derivation dialog
- Pass RBAC context down

### Data Query Pattern
```text
1. Fetch scores: csm_customer_feature_scores WHERE indicator_id = X AND period = Y
   -> Join customers(name), features(name)
2. If CSM: first fetch assigned customer IDs, then filter scores
3. Group by customer -> calculate AVG per customer
4. Calculate overall AVG of customer averages = indicator aggregate
5. Fetch kpi_rag_bands for this indicator for band label display
```

### Recharts Bar Chart
- X-axis: Customer names
- Y-axis: Average score (0-100%)
- Bars colored by RAG threshold (green >= 76, amber 51-75, red <= 50)
- Horizontal reference line at target value
- Tooltip showing exact values and contributing features

### No Database Changes Required
All data already exists in `csm_customer_feature_scores`, `customers`, `features`, and `kpi_rag_bands` tables. This is purely a read-only visualization feature.

