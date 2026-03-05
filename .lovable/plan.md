

## Plan: Add Department Member Roles for Data Entry

### Summary
Create a new `department_member` role in the `app_role` enum that works like the CSM role but for departmental data entry. Department members will be assigned to specific departments via `department_access` and see ALL customers in their data entry matrices (no customer filtering).

### Current State
- `app_role` enum: `admin`, `viewer`, `department_head`, `csm`, `content_manager`
- `department_head` role already has data entry access via `department_access` table
- CSM role filters customers by `csm_id` on the customers table
- `CSMDataEntryMatrix` component skips CSM filtering when `isAdmin || isDepartmentHead` (line 145)

### Changes Required

#### 1. Database: Add `department_member` role to enum
Add new enum value to `app_role`:
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department_member';
```

#### 2. Auth Hook: Track `isDepartmentMember` role
**File: `src/hooks/useAuth.tsx`**
- Add `isDepartmentMember` state (same pattern as `isCSM`, `isDepartmentHead`)
- Query `user_roles` for `department_member` role in `checkUserRoles`
- Expose via context

#### 3. AppLayout: Add "Enter Data" button for department members
**File: `src/components/AppLayout.tsx`**
- Add an "Enter Data" button for `isDepartmentMember` users (same logic as department heads — route directly if single department, otherwise to `/data`)

#### 4. DepartmentDataEntry: Allow department members access
**File: `src/pages/DepartmentDataEntry.tsx`**
- The access check at line 145-156 already uses `department_access` table, so department members with entries there will pass. No change needed here.

#### 5. DataManagement: Handle department member routing
**File: `src/pages/DataManagement.tsx`**
- Add `isDepartmentMember` to the department selection/redirect logic (lines 70-90, 170) so department members get the same department selector or direct redirect as department heads

#### 6. CSMDataEntryMatrix: Skip customer filtering for department members
**File: `src/components/user/CSMDataEntryMatrix.tsx`**
- Line 145: Change `if (!isAdmin && !isDepartmentHead)` to also include `!isDepartmentMember` so department members see ALL customers in the feature matrix (not filtered by csm_id)

#### 7. Portfolio & Index: Scope visibility for department members
**Files: `src/pages/Portfolio.tsx`, `src/pages/Index.tsx`**
- Add `isDepartmentMember` to the department filtering logic (same scoping as department heads — filtered by `accessibleDepartments`)

#### 8. TeamAccessTab: Add department_member option
**File: `src/components/admin/TeamAccessTab.tsx`**
- Add `department_member` to the role dropdown in the edit dialog so admins can assign this role

#### 9. ComplianceReport: Allow department members access
**File: `src/pages/ComplianceReport.tsx`**
- Add `isDepartmentMember` alongside `isDepartmentHead` in the access check

### What This Does NOT Touch
- No changes to CSM flow, Content Management flow, or Admin flow
- No new database tables needed — reuses existing `department_access` table
- No changes to the data entry form UI itself — department members use the same `DepartmentDataEntry` page

