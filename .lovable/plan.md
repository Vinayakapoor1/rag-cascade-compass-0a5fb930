

## Plan: Unify Portfolio.tsx to use rollup averaging

### Problem
`Portfolio.tsx` calculates percentages by flat-averaging all indicator percentages, ignoring the KR/FO formula hierarchy. The `useOrgObjectives` hook already computes correct rollup values (`okrProgress`) but Portfolio.tsx recalculates with its own flat logic.

### Changes — single file: `src/pages/Portfolio.tsx`

1. **Import** `parseFormulaType`, `aggregateProgress`, `progressToRAG` from `@/lib/formulaCalculations`.

2. **Replace `calculateOrgObjectivePercentage`** (lines 22-40): Use rollup logic — for each dept, calculate FO progresses (each FO aggregates KR progresses using KR formula, then aggregates KRs using FO formula), average FO progresses for dept, then average dept progresses for org objective. Same logic as `useOrgObjectives.tsx` lines 99-166.

3. **Replace `calculateDepartmentPercentage`** (lines 70-89): Rollup through FOs→KRs→Indicators using stored formulas, then average FO progresses.

4. **Replace `calculateFilteredPercentage`** (lines 43-67): Same rollup logic but only include indicators matching the filter status.

5. **Replace `calculateDepartmentStatus`** (lines 92-109): Use `progressToRAG()` on the rollup percentage.

6. **Update `portfolioStats` overall average** (lines 254-259): Compute `avgScore` as the average of org objective rollup percentages instead of flat indicator average. Keep the per-indicator green/amber/red counts as-is (those are correct for the count badges). Round before RAG determination.

