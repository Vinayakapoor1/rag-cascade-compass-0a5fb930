

# Import 8-Department OKR Hierarchy from Excel

## Summary

Parse the uploaded Excel (8 sheets, 7 columns each) and insert/update the OKR hierarchy for 6 departments while strictly preserving Customer Success and Content Management. Three new departments (HR/People, Finance, Marketing) get created; five existing ones get their FO/KR/Indicator hierarchy replaced.

**Algorithms untouched**: `formulaCalculations.ts`, `ragUtils.ts`, and all aggregation/scoring logic remain unchanged. Only hierarchy DATA in the database changes.

## Sheet-to-Department Mapping

| Sheet | Department | Org Objective Name | Action |
|-------|-----------|-------------------|--------|
| 1 | Product Management | Customer Retention (existing) | Replace FOs/KRs/KPIs |
| 2 | Product Engineering | Customer Retention (existing) | Replace FOs/KRs/KPIs |
| 3 | Quality Assurance | Customer Retention (existing) | Replace FOs/KRs/KPIs |
| 4 | Sales | Customer Retention (existing) | Replace FOs/KRs/KPIs |
| 5 | Security & Technology | Customer Retention (existing) | Replace FOs/KRs/KPIs |
| 6 | HR / People | **New org objective** | Create dept + full hierarchy |
| 7 | Finance | **New org objective** | Create dept + full hierarchy |
| 8 | Marketing | **New org objective** | Create dept + full hierarchy |

**Protected (NO TOUCH):** Customer Success, Content Management — their department IDs, FOs, KRs, indicators, scores, and links are never queried or modified.

## Implementation Steps

### Step 1 — Write a one-time admin import script

Create `src/lib/v5DepartmentImporter.ts` with a function that:

1. Takes the parsed Excel data (hardcoded from the 8 sheets since we have the exact content)
2. Has a `PROTECTED_DEPARTMENTS` list: `['Customer Success', 'Content Management']`
3. For each of the 6 target departments:
   - Looks up existing department by name
   - Deletes existing indicators → key_results → functional_objectives (cascade by ID, scoped to that department only)
   - Re-inserts FOs with formulas, KRs with formulas, KPIs with formulas from the Excel
4. For the 3 new departments:
   - Creates a new `org_objectives` row with the department's top-level theme
   - Creates the `departments` row linked to it
   - Inserts full FO → KR → KPI hierarchy

All data is hardcoded in the script from the parsed Excel content — no file parsing at runtime.

### Step 2 — Wire to admin UI

Add a button in `src/components/admin/OKRHierarchyTab.tsx` labeled "Import V5 8-Department OKR Structure" that triggers the import function. Show progress and results.

### Step 3 — Verify data entry routing

Confirm that all 8 departments (including new ones) appear in the data entry navigation and use the correct entry mode:
- Customer Success → CSM matrix (untouched)
- Content Management → CM matrix (untouched)
- Sales → standalone KPI scoring grid
- All others → default per-indicator data entry

No changes to routing logic needed — it's already name-based.

## What Does NOT Change

- `src/lib/formulaCalculations.ts` — aggregation engine
- `src/lib/ragUtils.ts` — RAG status derivation
- `src/hooks/useCustomerHealthMetrics.ts` — ops health scoring
- `src/components/user/CSMDataEntryMatrix.tsx` — CS/CM data entry UI
- Any existing scores, links, or history for CS and CM departments
- All RLS policies, triggers, and DB functions

## Files Modified

1. **`src/lib/v5DepartmentImporter.ts`** (new) — hardcoded import script with all 80 KPIs across 8 departments
2. **`src/components/admin/OKRHierarchyTab.tsx`** — add import trigger button

## Technical Notes

- Deletion order matters: indicators first, then key_results, then functional_objectives (no FK constraints but cleaner)
- New org objectives get unique colors from the palette (teal, orange, yellow for the 3 new ones)
- All indicators default to `tier: 'leading'`, `frequency: 'Monthly'` matching existing conventions
- Formula strings stored verbatim from Excel for reference/display

