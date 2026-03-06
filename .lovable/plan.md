

## Diagnosis: Sales Data Entry Form is Empty

### Root Cause

The Sales department data entry page has a **conflicting tab visibility logic**:

1. Sales department members (`isDeptMemberOnly`) get their `activeTab` forced to `'feature-matrix'` (line 125-128)
2. The Sales department hides the "Feature Matrix" tab trigger because Sales uses a department-level-only model (`isSalesDept`, line 660)
3. The `feature-matrix` TabsContent renders the `CSMDataEntryMatrix`, which queries for customer/feature score data — but Sales has no customer/feature mapping, so the matrix is empty

**Result**: The user sees an empty form because they're viewing the Feature Matrix content (which has no data for Sales) instead of the Per Indicator tab (which has all 10 indicators).

### Fix

In `src/pages/DepartmentDataEntry.tsx`:

1. **Update the default tab logic** (around line 124-128): When `isSalesDept` is true, always default to `'per-indicator'` regardless of role, since Feature Matrix is not applicable for Sales.

2. **Ensure Per Indicator tab is visible for Sales department members**: The current logic hides "Per Indicator" for `isDeptMemberOnly` users (line 657), but for Sales this is the **only** valid tab. Add an exception so Sales department members can see the Per Indicator tab.

### Files to Edit
- `src/pages/DepartmentDataEntry.tsx` — Fix the `useEffect` that sets `activeTab` and the conditional rendering of tab triggers

