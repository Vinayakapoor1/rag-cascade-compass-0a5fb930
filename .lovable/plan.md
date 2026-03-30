

# Add Department-Level Visibility Controls

## What You Want

Currently the Visibility tab only controls by **Role** (Admin, Dept Head, CSM, etc.). You want to control visibility **per department** — e.g., the CS Department Head sees different sections than the QA Department Head.

## Current State

The `visibility_settings` table has: `page | section | role | is_visible`. There is no department dimension, so all Department Heads see the same things regardless of which department they belong to.

## Changes

### 1. Add `department_id` column to `visibility_settings`

```sql
ALTER TABLE visibility_settings ADD COLUMN department_id uuid REFERENCES departments(id);
-- Update unique constraint to include department
ALTER TABLE visibility_settings DROP CONSTRAINT visibility_settings_page_section_role_key;
ALTER TABLE visibility_settings ADD CONSTRAINT visibility_settings_page_section_role_dept_key 
  UNIQUE(page, section, role, department_id);
```

- When `department_id` is NULL → applies globally to the role (current behavior)
- When `department_id` is set → applies only to users of that department

### 2. Update `useVisibilitySettings` hook

- Fetch the user's assigned departments from `department_access`
- When checking `canSee(page, section)`, first check department-specific settings, then fall back to global role settings
- Priority: department-specific override > global role setting > default true

### 3. Redesign the Visibility Admin UI

Add a **department selector** (tabs or dropdown) at the top of the Visibility tab:
- **"Global (All Departments)"** — shows the current Role × Section matrix (department_id = NULL)
- **Per-department tabs** (Customer Success, QA, Product Engineering, etc.) — shows the same matrix but scoped to that department

Each department tab shows the same Page × Section × Role grid, but settings apply only to users assigned to that department. If a department-specific setting exists, it overrides the global one.

### 4. Seed department-specific defaults

For the existing special cases (e.g., CS/ST heads see Sec+Tech deployment params but others don't), insert department-specific rows so the current behavior is preserved.

## What Does NOT Change
- Authentication, route protection, RLS policies
- The `canSee()` API signature stays the same (no code changes needed in consuming pages)
- All existing global settings remain functional

## Files Modified
1. **Database migration** — add `department_id` column, update unique constraint, seed department-specific defaults
2. **`src/hooks/useVisibilitySettings.ts`** — add department-aware lookup logic
3. **`src/components/admin/VisibilitySettingsTab.tsx`** — add department selector tabs, department-scoped toggle grid

