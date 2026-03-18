

## Plan: Hide Sec+Tech Deployment Indicators from CSM Data Entry

### Problem
CSM users see the "Sec+Tech Deployment Indicators" sub-section in their data entry matrix. These should only appear under the Sec+Tech department's own data entry form (and for admins/CS department heads).

### Change

**File: `src/components/user/CSMDataEntryMatrix.tsx` (~line 622-623)**

Update the `hideSTIndicators` visibility rule to also hide ST indicators when a CSM (non-admin, non-department-head) is viewing the matrix:

```typescript
// Current:
const hideSTIndicators = ((isDepartmentHead && !isSecTechDept && !isCustomerSuccessDept) || isDepartmentMember) && !isAdmin;

// Updated — also hide for CSMs (who are not admin/dept-head):
const isCSMOnly = !!csmId && !isAdmin && !isDepartmentHead;
const hideSTIndicators = ((isDepartmentHead && !isSecTechDept && !isCustomerSuccessDept) || isDepartmentMember || isCSMOnly) && !isAdmin;
```

This ensures:
- **CSM users** — ST Deployment indicators are hidden
- **Admin users** — still see everything
- **CS Department Heads** — still see ST indicators (existing logic)
- **Sec+Tech department view** — still shows its own deployment indicators (handled by `isSTDepartment` branch)

### Files Modified
- `src/components/user/CSMDataEntryMatrix.tsx` — one line change to visibility rule

