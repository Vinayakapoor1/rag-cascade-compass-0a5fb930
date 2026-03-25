

# Add Org Objective Management and Department Mapping

## Problem

The V5 importer created 8 separate org objectives (one per department), but the business only has ~5 org objectives. Multiple departments should map to a single org objective. For example, "Enhance Product Quality" already correctly maps to both Product Engineering and Quality Assurance, but others like HR/People, Finance, and Marketing each got their own unnecessary org objective.

## Current DB State

| Org Objective | Departments |
|---|---|
| Achieve Financial Excellence and Runway | Finance |
| Achieve Operational Excellence | Security & Technology |
| Build and Sustain Talent for 3X Growth | HR / People |
| Drive Market Penetration and Demand Generation | Marketing |
| Drive Product Adoption and Retention | Product Management |
| Enhance Product Quality | Product Engineering, Quality Assurance |
| Expand Pipeline and Revenue Growth | Sales |
| Maximize Customer Success and Experience | Customer Success, Content Management |

## Solution

Add full CRUD for org objectives and a department-to-objective reassignment UI in the existing `OrgObjectivesManager` component and `OKRHierarchyTab`.

### Changes to `src/components/admin/OrgObjectivesManager.tsx`

1. **Add "Create Org Objective"** button — opens inline form with name, classification (CORE/Enabler), color fields
2. **Add "Delete" action** per row — with confirmation dialog; only allowed if no departments are mapped (or offers to reassign first)
3. **Add "Departments" column** — shows count of mapped departments as a badge
4. **Make Name editable** — inline text input (currently read-only)
5. **Add Department Mapping section** — below the objectives table, show a table of all departments with a dropdown to select which org objective each belongs to. Saving updates `departments.org_objective_id`.

### Changes to `src/components/admin/OKRHierarchyTab.tsx`

1. **Show org objective grouping in tree** — add a top-level node above departments showing the org objective name, so the tree reads: Org Objective → Department → FO → KR → KPI
2. **Department edit panel** — add an "Org Objective" dropdown to reassign a department to a different org objective

### No changes to

- Calculation algorithms (`formulaCalculations.ts`, `ragUtils.ts`)
- `useOrgObjectives.ts` hook (already groups departments under org objectives)
- Customer Success / Content Management data
- Any scoring or RAG logic

## Files Modified

1. **`src/components/admin/OrgObjectivesManager.tsx`** — Add create, delete, rename, and department mapping UI
2. **`src/components/admin/OKRHierarchyTab.tsx`** — Add org objective grouping in tree view and reassignment dropdown in department edit panel

