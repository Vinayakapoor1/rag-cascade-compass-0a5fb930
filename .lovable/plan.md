

## Plan: Reset Sales KPIs to "Not Set" and Fix Display

### Problem
1. Sales KPIs in the database have stale values (`current_value` = 0, 0.5, or 1 with `target_value` = 100), causing the Department Detail page to show "1% completion" instead of "Not Set"
2. The DepartmentDetail page shows percentage progress bars for Sales KPIs, which is meaningless since Sales uses band-based scoring (not numeric targets)

### Changes

**1. Database: Reset all Sales indicators to "not-set"**
- Run a migration to set `current_value = NULL`, `rag_status = 'not-set'` for all indicators under the Sales department
- This ensures clean slate for fresh data entry

**2. DepartmentDetail.tsx: Handle Sales department differently**
- Detect Sales department using the same `name.includes('sales')` pattern
- For Sales department, the FOStatBlock, KRStatBlock, and IndicatorStatBlock should:
  - Show RAG badge based on `rag_status` field directly (not calculated from current_value/target_value)
  - Hide the percentage number and progress bar (or show "Not Set" when null)
  - When `rag_status = 'not-set'`, display "Not Set" instead of "0%"
- The `calculateDepartmentStatus`, `calculateFOStatus`, `calculateKRStatus` functions should return `'not-set'` when all underlying indicators have null current_value

**3. DepartmentDetail.tsx: Sales-specific stat blocks**
- Pass an `isSalesDept` boolean down to stat block components
- When `isSalesDept`:
  - Replace `{Math.round(percentage)}%` with the band label or "Not Set"
  - Use `rag_status` from the indicator directly instead of calculating from current_value/target_value
  - Progress bar shows 0 or is hidden

### Files Modified
- `src/pages/DepartmentDetail.tsx` — Add Sales-specific display logic
- Database migration — Reset Sales indicator values to NULL/not-set

