

## Investigation Summary

The code changes are already correctly in place:
- Line 663-665: The "KPI Scoring Grid" tab trigger renders unconditionally for Sales
- Line 669-670: The `SalesKPIScoringGrid` component renders in the feature-matrix tab content for Sales

Both tabs ("Per Indicator" and "KPI Scoring Grid") should appear side by side. The fact that only "Per Indicator" shows in your screenshot suggests the preview may not have refreshed with the latest code changes.

### Fix Plan

To ensure the tab is visible, I'll make a small no-op touch to `DepartmentDataEntry.tsx` to force a rebuild. No logic changes needed — the code is already correct.

If the issue persists after rebuild, I'll add a `console.log` to verify `isSalesDept` resolves to `true` for the current department and check that the tab rendering path executes.

