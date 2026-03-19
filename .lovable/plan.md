

# Add "Unassigned" Filter Options Across Customer Views

## Problem

Several filter dropdowns across the app exclude null/empty values, making it impossible to find customers missing key data:

1. **CSM Filter** (Customers page): No "Unassigned" option — customers without a CSM are invisible in the filter. This is the "7 unassigned customers" issue.
2. **Region Filter** (Customers page): Null regions are excluded by `.filter(Boolean)` — no way to find customers missing a region.
3. **Industry Filter** (Customers page): Same issue — null industries filtered out.
4. **Admin CustomersOverviewTab**: No CSM filter at all, no way to see unassigned customers. Region filter also excludes nulls.

## Plan

### File 1: `src/pages/CustomersPage.tsx`

- **CSM filter options** (line ~179): Include "Unassigned" in the `csmNames` list when any customer has a null/empty `csmName`
- **CSM filter logic** (line ~164): When `csmFilter === 'Unassigned'`, match customers where `csmName` is null/undefined/empty
- **Region filter options** (line ~178): Include "Unassigned" when any customer has null region
- **Region filter logic** (line ~162 area): When `regionFilter === 'Unassigned'`, match null regions
- **Industry filter options** (line ~178): Include "Unassigned" when any customer has null industry
- **Industry filter logic**: When `industryFilter === 'Unassigned'`, match null industries

### File 2: `src/components/admin/CustomersOverviewTab.tsx`

- Add a **CSM filter** dropdown (fetching CSM names via joined query or from the `csms` table)
- Add "Unassigned" option to CSM, Region filters
- Update `filterCustomers` logic to handle "Unassigned" matching for all filters

---

## Technical Details

No database changes needed. All changes are client-side filter logic.

The pattern is consistent: replace `.filter(Boolean)` with logic that keeps null values as "Unassigned", and add matching logic in the filter functions for `=== 'Unassigned'` → check for falsy source value.

### Files Modified
1. `src/pages/CustomersPage.tsx` — add Unassigned option to CSM, Region, Industry filters
2. `src/components/admin/CustomersOverviewTab.tsx` — add CSM filter, add Unassigned options

