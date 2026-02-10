

# Department-Scoped Portfolio View

## Overview
Restrict the Portfolio page so that non-admin users only see departments they are assigned to, along with the relevant org objectives, indicators, and stats. Admins (and optionally team leaders with a special flag) continue to see the full portfolio.

## Current State
- The Portfolio page (`/portfolio`) fetches ALL org objectives and departments regardless of who is logged in.
- The `useAuth` hook already provides `accessibleDepartments` (an array of department IDs from the `department_access` table), `isAdmin`, `isDepartmentHead`, and `isCSM`.
- No filtering is currently applied based on user role.

## What Changes

### 1. Filter Portfolio Data by Accessible Departments
In `src/pages/Portfolio.tsx`, after fetching org objectives, filter the departments within each org objective to only include those the user has access to. If an org objective has no accessible departments after filtering, it is hidden entirely.

**Who sees what:**
- **Admin**: Full portfolio, no filtering
- **Department Head / CSM / Viewer**: Only departments listed in their `accessibleDepartments` from the `department_access` table. Org Objectives that have zero matching departments are hidden.
- **Not logged in**: Full read-only portfolio (public view, no filtering)

### 2. Recalculate Stats from Filtered Data
All stat cards (Departments, Functional Objectives, Key Results, Indicators counts), RAG distribution, Business Outcome percentage, and Org Objective percentages will be recalculated based on the filtered set of departments, so the numbers are consistent with what the user can actually see.

### 3. Update the Index Page (Legacy Dashboard)
Apply the same department filtering logic to `src/pages/Index.tsx` so that the legacy dashboard view also respects department scoping.

## Technical Details

### Files Modified

**`src/pages/Portfolio.tsx`**
- Import `useAuth` hook
- After `orgObjectives` data loads, apply a `useMemo` filter:
  - If `isAdmin` or no user (public view): show all
  - Otherwise: for each org objective, filter `departments` to only those in `accessibleDepartments`; remove org objectives with zero remaining departments
- All downstream calculations (stats, RAG counts, department blocks) automatically use the filtered data

**`src/pages/Index.tsx`**
- Same filtering logic applied to the org objectives before rendering department cards

### No Database Changes Required
The `department_access` table already stores user-to-department mappings, and the `useAuth` hook already fetches `accessibleDepartments`. This is purely a frontend filtering change.

### Logic Flow

```text
User loads Portfolio
  -> useAuth provides: isAdmin, accessibleDepartments[]
  -> useOrgObjectives fetches all data
  -> If isAdmin or not logged in: show everything
  -> Else: filter each orgObjective.departments 
       to only include IDs in accessibleDepartments
  -> Remove orgObjectives with 0 remaining departments
  -> Recalculate all stats from filtered data
  -> Render filtered view
```

### Edge Cases
- User with no department assignments sees an empty state with a message
- Public/unauthenticated users see the full portfolio (read-only)
- Admin always sees everything regardless of department_access entries

