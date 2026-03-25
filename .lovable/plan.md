

# Show Only Mapped Org Objectives on Portfolio

## Problem

The portfolio displays all 8 org objectives, but 3 of them (Achieve Financial Excellence, Build and Sustain Talent, Drive Market Penetration) have **zero departments mapped**. These show as empty cards with no data.

## Fix

Filter out org objectives with no departments at the rendering level in `src/pages/Portfolio.tsx`. The `useOrgObjectives` hook already only returns departments that are mapped, so objectives with `departments.length === 0` are effectively empty.

### Change in `src/pages/Portfolio.tsx`

1. **Line ~162 (useMemo)**: After applying all-time values and recalculating progress, filter out any org objective where `departments.length === 0`. This ensures:
   - The "Organizational Objectives" stat blocks only show the 5 with mapped departments
   - Portfolio stats (dept count, FO count, KR count, KPI count) exclude empty objectives
   - The overall health score only averages across objectives that have real data

Single line addition: `objectives = objectives.filter(obj => obj.departments.length > 0);`

### No other files change. No algorithm changes.

