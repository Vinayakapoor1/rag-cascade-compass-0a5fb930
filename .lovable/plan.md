

## Add Simple Scoring Grid for Sales Department

### What the user wants
A "Feature Matrix" tab for Sales that shows a simple standalone scoring grid — each Sales KPI listed with a band selector dropdown (Green/Amber/Red) — without the customer/feature dimensions used by other departments.

### Current state
- Sales has 10 indicators with no `indicator_feature_links` or `indicator_customer_links`
- The Feature Matrix tab is explicitly hidden when `isSalesDept` is true (lines 667-669, 672-705 of `DepartmentDataEntry.tsx`)
- Each indicator already has `kpi_rag_bands` defined (3 bands each)

### Plan

**1. Remove the Sales exclusion from the tab rendering** in `DepartmentDataEntry.tsx`:
- Lines 667-669: Show "Feature Matrix" tab for Sales too (rename it "KPI Scoring Grid" for Sales)
- Lines 672-705: Remove the `!isSalesDept` gate on the TabsContent

**2. Add a Sales-specific branch inside the `feature-matrix` TabsContent**:
- When `isSalesDept`, render a new `SalesKPIScoringGrid` component instead of `CSMDataEntryMatrix`
- This component will:
  - Fetch all 10 Sales indicators for the department
  - Fetch their `kpi_rag_bands`
  - Display a table: rows = indicators (grouped by FO/KR), columns = Band Selector + Current Status
  - Each row has a dropdown with the indicator's specific bands (e.g., "25-100%", "13-24%", "1-10%")
  - On save, update `indicators.current_value` and `rag_status`, insert into `indicator_history`

**3. Create `src/components/user/SalesKPIScoringGrid.tsx`**:
- Props: `departmentId`, `period`
- Queries: indicators via FO→KR→indicators chain, `kpi_rag_bands` per indicator
- UI: Card per FO group, table with indicator name, current band, band dropdown, save button
- Save logic: same pattern as Per Indicator tab but using band selection instead of numeric input

**4. Update default tab logic** (line 124-131):
- Remove the `isSalesDept` override that forces `per-indicator` — let Sales users choose either tab

### No database changes required

