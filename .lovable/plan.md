

## Plan: CSM Visibility Scoping for Department Members (Subordinates)

### Problem
Department Members (subordinates under Department Heads) currently see **all customers** in their assigned departments. The user wants the ability to configure which CSMs' data each Department Member can see, similar to how Department Heads have department-level visibility control.

### Solution
Create a new `member_csm_access` table that maps department_member users to specific CSM records. When a department member views the data entry matrix, compliance reports, or any customer-scoped view, only customers belonging to their assigned CSMs will be visible.

### Database Changes

**1. New table: `member_csm_access`**
```sql
CREATE TABLE public.member_csm_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  csm_id uuid NOT NULL REFERENCES public.csms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, csm_id)
);

ALTER TABLE public.member_csm_access ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage member_csm_access" ON public.member_csm_access
  FOR ALL TO public USING (is_admin(auth.uid()));

-- Users can view their own assignments
CREATE POLICY "Users can view own csm access" ON public.member_csm_access
  FOR SELECT TO public USING (auth.uid() = user_id);
```

### UI Changes

**2. Admin Team Access tab (`TeamAccessTab.tsx`)**
- When editing a user with `department_member` role, show a new "CSM Visibility" section with checkboxes for each CSM record
- Save selections to `member_csm_access` table
- Display assigned CSM names in the user table row

**3. Auth context (`useAuth.tsx`)**
- Add `accessibleCsmIds: string[]` to the auth context
- For department_member users, fetch their `member_csm_access` entries and expose the list of CSM IDs

**4. Data entry matrix filtering (`CSMDataEntryMatrix.tsx`)**
- When `isDepartmentMember` and `accessibleCsmIds.length > 0`, filter customers by `csm_id IN accessibleCsmIds` (similar to how `csmId` filters for CSM users at line 347)
- When `accessibleCsmIds` is empty (no restriction configured), keep current behavior (show all)

**5. Other scoped views**
- Apply the same CSM-based filtering in `ComplianceReport.tsx` and any other pages that show customer data for department members

### Files Modified
- **Database migration** — create `member_csm_access` table with RLS
- `src/hooks/useAuth.tsx` — add `accessibleCsmIds` state, fetch on role check
- `src/components/admin/TeamAccessTab.tsx` — add CSM visibility checkboxes for department_member role
- `src/components/user/CSMDataEntryMatrix.tsx` — filter customers by accessible CSM IDs for department members
- `src/pages/ComplianceReport.tsx` — apply same CSM scoping for department members

