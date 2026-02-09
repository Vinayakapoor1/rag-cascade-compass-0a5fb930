

# CSM Feature Matrix Data Entry

## Overview
Add a spreadsheet-style KPI x Feature matrix to the Department Data Entry page, allowing users to score each KPI against each feature using RAG-band dropdowns. The aggregate score per KPI row automatically updates the indicator's current value, driving the existing RAG cascade.

## What Users Will See

1. A new **"Feature Matrix"** tab on the existing Department Data Entry page (`/department/{id}/data-entry`)
2. A matrix grid where:
   - Rows = KPIs (indicators belonging to the department)
   - Columns = Features (linked via `indicator_feature_links`)
   - Each cell = a dropdown with RAG band options (e.g., "76-100%", "51-75%", "1-50%")
   - Cells auto-color based on selection (green/amber/red)
   - Final column = auto-calculated aggregate percentage
3. A "Save All" button that persists every cell and updates indicator values

## Implementation Steps

### Step 1: Database Tables

**Table: `csm_feature_scores`** -- stores individual cell values

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| indicator_id | uuid | FK to indicators |
| feature_id | uuid | FK to features |
| score_band | text | e.g. "76-100%" |
| rag_value | numeric | Green=1, Amber=0.5, Red=0 |
| period | text | e.g. "2026-02" |
| created_by | uuid | auth.uid() |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

Unique constraint on (indicator_id, feature_id, period) for upsert.
RLS: authenticated users can read; users with department access can insert/update via `has_department_access()`.

**Table: `kpi_rag_bands`** -- configurable RAG bands per KPI

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| indicator_id | uuid | FK to indicators |
| band_label | text | e.g. "76-100%" |
| rag_color | text | green/amber/red |
| rag_numeric | numeric | 1, 0.5, or 0 |
| sort_order | integer | display order |

RLS: anyone can read; authenticated can manage.

If no custom bands exist for a KPI, the system uses default bands: "76-100%" (Green/1), "51-75%" (Amber/0.5), "1-50%" (Red/0).

### Step 2: New Component -- `CSMDataEntryMatrix.tsx`

Located at `src/components/user/CSMDataEntryMatrix.tsx`.

- Receives `departmentId` and `period` as props
- Fetches indicators for the department (via FO -> KR -> Indicators chain)
- Fetches linked features per indicator from `indicator_feature_links`
- Fetches custom RAG bands from `kpi_rag_bands` (falls back to defaults)
- Loads existing scores from `csm_feature_scores` for the selected period
- Renders the matrix with:
  - Sticky first column (KPI names)
  - Horizontal scroll for many features
  - Color-coded dropdown cells
  - Auto-calculated aggregate column with RAG badge
- On save: upserts to `csm_feature_scores`, then updates each indicator's `current_value` with the aggregate percentage, creates `indicator_history` entries, and logs to `activity_logs`

### Step 3: Integrate into DepartmentDataEntry Page

Modify `src/pages/DepartmentDataEntry.tsx`:
- Add a tab bar at the top: "Per Indicator" (existing view) | "Feature Matrix" (new)
- "Feature Matrix" tab renders the `CSMDataEntryMatrix` component
- Both tabs share the same period selector

### Step 4: Aggregation Formula

For each KPI row:
```
Aggregate % = (SUM of rag_numeric values across features / number_of_features) * 100
```
Where Green = 1.0, Amber = 0.5, Red = 0.0

This percentage is written to `indicators.current_value` (with `target_value` = 100), triggering the existing RAG cascade up through KR -> FO -> Department -> Org Objective.

### Step 5: Admin Configuration (Later Phase)

An admin sub-tab on the Data Management page to:
- Define custom RAG bands per KPI
- Preview the matrix layout

This can be added as a follow-up since the default bands work immediately.

## Files to Create
- `src/components/user/CSMDataEntryMatrix.tsx` -- the matrix component
- Database migration for `csm_feature_scores` and `kpi_rag_bands` tables

## Files to Modify
- `src/pages/DepartmentDataEntry.tsx` -- add tab switching between existing view and matrix view

## Technical Notes
- The matrix uses existing `indicator_feature_links` to determine which features appear as columns for each KPI row
- RLS on `csm_feature_scores` uses the existing `has_department_access()` function
- The component uses `react-query` for data fetching consistent with the rest of the app
- Evidence is not required for matrix entries (unlike per-indicator entry) since the matrix itself serves as the data source documentation

