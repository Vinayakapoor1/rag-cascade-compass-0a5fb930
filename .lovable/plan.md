

## Plan: Scope Customers Page & Portfolio by CSM Visibility for Department Members

### Problem
Nitika (department member) sees all customers including Abhay's clients on the Portfolio and Customers pages. The `accessibleCsmIds` filtering was only applied to CSMDataEntryMatrix and ComplianceReport, but not to these two pages.

### Changes

**1. `src/pages/CustomersPage.tsx` (~line 88-103)**
- Import `isDepartmentMember` and `accessibleCsmIds` from `useAuth()`
- Add a new filter condition for department members:
```typescript
if (isDepartmentMember && !isAdmin && !isDepartmentHead && accessibleCsmIds.length > 0) {
  return allCustomers.filter(c => accessibleCsmIds.includes(c.csmId));
}
```
- Add `isDepartmentMember`, `accessibleCsmIds` to useMemo dependencies

**2. `src/pages/Portfolio.tsx` (~line 123, 199-235)**
- Import `isDepartmentMember` and `accessibleCsmIds` from `useAuth()`
- In the `scopedCounts` fetch, add a branch for department members that queries customers filtered by `csm_id IN accessibleCsmIds` and counts only their linked features
- Add dependencies to the useEffect

### Files Modified
- `src/pages/CustomersPage.tsx` — Add department member CSM filtering to customer list
- `src/pages/Portfolio.tsx` — Scope customer/feature counts by accessible CSMs for department members

