

# Fix: "On Track" Items Not Showing When Green Filter Applied

## Problem

The current filtering logic applies the RAG status filter independently at each hierarchy level (FO, KR, Indicator). This means:

- An indicator like "SLA Compliance Rate" at 100% is correctly identified as green/On Track
- Its parent KR "Improve service request closure SLA compliance to 90%" is also green (single indicator at 100%)
- But the parent FO "Minimize Operational Disruptions" aggregates ALL its KRs including a red one (Workload Balance Index at 5.6%), so its overall status is NOT green
- The FO gets filtered out, taking its green children with it

## Root Cause

In `src/pages/DepartmentDetail.tsx`, the `filteredFOs` logic (around line 648) filters FOs by their own aggregate status:

```
result = result.filter(fo => calculateFOStatus(fo) === statusFilter);
```

This removes FOs that contain matching children but don't themselves aggregate to the target status.

The same issue exists for `filteredKRs` (line 621) -- a KR with mixed indicators might not pass the filter even though some of its indicators are green.

## Solution

Change the filtering approach so that **parent containers are shown if they contain any matching children**, rather than being filtered by their own aggregate status.

### Changes to `src/pages/DepartmentDetail.tsx`

**1. Fix `filteredKRs` logic (around lines 620-623)**

Instead of filtering KRs by `calculateKRStatus(kr) === statusFilter`, filter KRs that contain at least one indicator matching the status filter:

```
if (statusFilter !== 'all') {
  return allKRs.filter(kr =>
    (kr.indicators || []).some(ind => calculateIndicatorStatus(ind) === statusFilter)
  );
}
```

**2. Fix `filteredFOs` logic (around lines 647-649)**

Instead of filtering FOs by `calculateFOStatus(fo) === statusFilter`, filter FOs that contain at least one KR with a matching indicator:

```
if (statusFilter !== 'all') {
  return department.functional_objectives.filter(fo =>
    (fo.key_results || []).some(kr =>
      (kr.indicators || []).some(ind => calculateIndicatorStatus(ind) === statusFilter)
    )
  );
}
```

**3. Apply same fix to the combined filter paths (customer/feature + status)**

The same pattern applies to lines 613-616 and 639-643 where status filtering is combined with customer/feature filters.

### Why This Approach

- The filter becomes "show me everything that contains On Track items" rather than "show me only things that are themselves On Track as a whole"
- Parent containers (FOs, KRs) act as grouping wrappers -- they should appear if any child matches
- The individual card still shows its own actual RAG status, so users can see context
- This matches user expectations: "I filtered for green, so show me all the green indicators and their parent hierarchy"

### Files Modified

- `src/pages/DepartmentDetail.tsx` -- Update `filteredKRs` and `filteredFOs` memos to use child-based inclusion instead of self-status filtering

