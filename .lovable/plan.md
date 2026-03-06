

## Plan: Align Sales Data Entry with Other Departments

### Problem
Two issues on the Sales Data Entry page:

1. **Per Indicator tab** — Shows a "Progress" column with percentages. For Sales (which has no numeric targets), this is meaningless. All indicators should display as "Not Set" when empty, and the progress column should be hidden for Sales.

2. **KPI Scoring Grid tab** — Missing the instructional guide card and the "Update & Check In" banner that all other departments have. It currently just renders the bare grid.

### Changes

**1. Per Indicator tab — Hide Progress column for Sales** (`DepartmentDataEntry.tsx`)
- Remove the "Progress" column header (line 864) when `isSalesDept`
- Remove the progress percentage cell (line 944-946) when `isSalesDept`
- Adjust the grid column template to drop that column for Sales
- Ensure current values show "Not Set" styling when null (already works via the `—` fallback, but verify)

**2. KPI Scoring Grid tab — Add instruction card and check-in pattern** (`DepartmentDataEntry.tsx`)
- Wrap `SalesKPIScoringGrid` with the same instruction card pattern used by other departments (lines 674-700), with Sales-specific wording:
  - "Sales KPI Scoring Grid Guide"
  - Steps: select period, expand FO accordion, select band scores, save per FO group, final check-in
- Add the period selector above the grid (same `Input type="month"` pattern)
- Add an "Update & Check In" button matching other departments

**3. No database changes required.**

### Files Modified
- `src/pages/DepartmentDataEntry.tsx` — conditional grid columns for Sales, instruction card in KPI Scoring Grid tab

