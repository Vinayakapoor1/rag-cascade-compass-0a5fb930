

## Add Department Owner Editing to Admin Panel

### Problem
The department edit panel in the OKR Structure tab (Data Management page) only allows changing the department color. There is no way to view or update the department **owner** name.

### Solution
Add an "Owner" text input field to the existing `DepartmentEditPanel` component in `src/components/admin/OKRHierarchyTab.tsx`. This requires:

1. **Add `owner` state** to `DepartmentEditPanel` (alongside existing `color` state), initialized from `dept.owner`
2. **Add an Owner input field** in the form UI between the department header and the color selector
3. **Include `owner` in the save handler** — update the `departments` table with both `color` and `owner`
4. **Update the Department interface** to include `owner` (it's missing from the local interface despite existing in the DB)
5. **Update the data fetch query** to also select the `owner` column so it's available in the tree

### File to Edit
- `src/components/admin/OKRHierarchyTab.tsx` — ~15 lines changed across 4 small spots

