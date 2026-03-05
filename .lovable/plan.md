

## Plan: RBAC Scoping for Departmental Portals

### Problem

Currently, the Portfolio page gives **department heads full visibility** across all departments (`isDepartmentHead` bypasses the `accessibleDepartments` filter at line 178 of Portfolio.tsx). A PE lead should only see Product Engineering data, not QA or Sales. The same issue exists on the Index.tsx page (no department filtering at all).

### Changes Required

#### 1. Scope Portfolio view for Department Heads
**File: `src/pages/Portfolio.tsx` (line 178)**

Change the filtering logic so department heads are also filtered by `accessibleDepartments`, same as CSMs/viewers. Only admins see everything.

```
// Before:
if (isAdmin || isDepartmentHead || !user) return rawOrgObjectives;

// After:
if (isAdmin || !user) return rawOrgObjectives;
```

This ensures PE lead only sees PE department cards, QA lead only sees QA, etc.

#### 2. Scope Index.tsx dashboard for Department Heads
**File: `src/pages/Index.tsx`**

This page (the old dashboard at `/`) is still routed but the main view is Portfolio. If it's still accessible, add the same `accessibleDepartments` filtering to department data shown here.

#### 3. Add compliance report visibility for department heads
**File: `src/pages/ComplianceReport.tsx`**

Currently restricted to admin only (`isAdmin` check). Department heads should be able to view compliance data scoped to their department's indicators. We'll gate this behind `isAdmin || isDepartmentHead` and filter the displayed data accordingly.

#### 4. Add department-specific "Enter Data" routing in AppLayout
**File: `src/components/AppLayout.tsx`**

The current department head "Enter Data" button routes to `/data`. For department heads with a single department, we can route directly to `/department/:id/data-entry` to skip the intermediate selection page. This requires checking `accessibleDepartments.length === 1` and routing accordingly.

#### 5. Show compliance widget for department heads on Portfolio
**File: `src/pages/Portfolio.tsx`**

Currently the CSMComplianceWidget only shows for CSMs/admins on Index.tsx. Consider adding a department-scoped compliance widget on Portfolio for department heads so they can track their team's data entry completion status.

### What This Does NOT Touch
- No changes to existing CSM, Content Management, or Admin flows
- No database schema changes needed
- No new roles needed — uses existing `department_head` role + `department_access` table
- No changes to DepartmentDataEntry.tsx (already works correctly with department-scoped access)

### Technical Details
- The `accessibleDepartments` array from `useAuth()` is already populated from the `department_access` table for all users
- Department heads already have `department_access` entries linking them to their departments
- The `DepartmentDataEntry` page already validates access via `department_access` query (line 145-156)
- Sales department already correctly hides the Feature Matrix tab

