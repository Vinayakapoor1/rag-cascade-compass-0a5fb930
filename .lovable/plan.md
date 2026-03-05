

## Plan: Add "All Time" View to Portfolio and Department Detail Pages

### What the user wants
A way to view "All Time" aggregated data directly on the Portfolio page and Department Detail page, similar to the "All Time" option already available inside the Indicator Derivation Dialog.

### Current state
- Portfolio and Department Detail pages display indicator `current_value`/`target_value` stored directly on the `indicators` table -- these represent the latest/current period only.
- The Indicator Derivation Dialog already has an "All Time" mode that aggregates the latest `csm_customer_feature_scores` per customer+feature combination across all periods.
- There is no period selector on either Portfolio or Department Detail pages.

### Changes

**1. Add a period selector to both pages**

Add a dropdown/toggle at the top of both Portfolio (`src/pages/Portfolio.tsx`) and Department Detail (`src/pages/DepartmentDetail.tsx`) that lets users switch between:
- **Current** (default) -- uses existing `current_value`/`target_value` from `indicators` table
- **All Time** -- fetches and aggregates `csm_customer_feature_scores` across all periods, computing an "all time" current value per indicator

**2. Create a shared hook: `src/hooks/useAllTimeIndicatorValues.ts`**

This hook will:
- Fetch all `csm_customer_feature_scores` grouped by `indicator_id`
- For each indicator, compute the "All Time" aggregate value using the same logic as the Indicator Derivation Dialog (latest score per customer+feature, average across customers, scale to percentage)
- Return a `Map<indicatorId, { allTimeValue: number }>` that pages can use to override `current_value` when "All Time" is selected

**3. Update Portfolio.tsx**
- Add period toggle UI (Current / All Time) near the existing filter area
- When "All Time" is selected, overlay the `allTimeValue` onto each indicator's `current_value` before running rollup calculations
- All existing rollup logic stays the same -- only the input values change

**4. Update DepartmentDetail.tsx**
- Add the same period toggle UI
- When "All Time" is selected, use the all-time values map to override indicator `current_value` before calculating FO/KR/Department percentages and statuses

### Files to create/edit
- **New**: `src/hooks/useAllTimeIndicatorValues.ts` -- shared hook for fetching all-time aggregated values
- **Edit**: `src/pages/Portfolio.tsx` -- add period toggle, conditionally use all-time values
- **Edit**: `src/pages/DepartmentDetail.tsx` -- add period toggle, conditionally use all-time values

### No database changes needed

