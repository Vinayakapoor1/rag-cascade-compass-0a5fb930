

# CSM Data Entry: Historical Browsing and Admin Portal Access

## Overview
Enhance the CSM Data Entry page with a richer period selector (weekly, monthly, and calendar-based date picking) so CSMs can revisit previously submitted entries. Add the same CSM Matrix view to the Admin portal so admins can review all CSM submissions across any period.

## What Changes

### 1. Enhanced Period Selector on CSM Data Entry Page
Replace the current simple dropdown (limited to current month +/- 3 months) with a more flexible period picker:
- **Monthly view**: Shows all months going back 12 months (expanded from 3)
- **Weekly view**: Generates ISO week periods (e.g., `2026-W07`) for weekly granularity
- **Date picker**: A calendar-based date selector that maps to a YYYY-MM or YYYY-Wxx period
- A toggle to switch between "Monthly" and "Weekly" mode
- Previously filled periods are highlighted/badged so the CSM knows where data exists

### 2. Period History Indicator
- Query `csm_customer_feature_scores` for distinct periods that have data
- Display a small badge or dot next to periods that already have entries
- This lets CSMs quickly see which periods they've already submitted

### 3. Read-Only Mode for Past Periods
- When viewing a historical period (not the current one), the matrix cells remain editable (CSMs can revise past entries)
- The save button updates the existing records for that period via the existing upsert logic (already works since `period` is part of the unique constraint)

### 4. Admin Portal: CSM Entries Tab
Add a new tab to the Data Management page (`/data`) called "CSM Entries" that:
- Shows the same `CSMDataEntryMatrix` component
- Includes department and period selectors (same as CSM page)
- Is read-only for viewing, but admins can also edit if needed (they already have isAdmin access)
- Visible only to admin users

### 5. Admin Route Option
Alternatively, add a dedicated admin route `/admin/csm-entries` accessible from the Admin Dashboard that embeds the CSM data entry view with all departments visible.

## Technical Details

### Files Modified

**`src/pages/CSMDataEntry.tsx`**
- Add a "mode" toggle: Monthly vs Weekly
- Expand `generatePeriodOptions()` to go back 12 months (monthly) or 12 weeks (weekly)
- Weekly periods stored as `YYYY-Wxx` format
- Add a query on mount to fetch distinct periods with existing scores, shown as badges
- Add a calendar popover (using existing `Calendar` component from shadcn) to jump to any date

**`src/pages/DataManagement.tsx`**
- Add a new tab "CSM Entries" (admin only) containing the CSM matrix view
- Include department selector (all departments for admin) and period selector
- Reuse `CSMDataEntryMatrix` component directly

**`src/components/user/CSMDataEntryMatrix.tsx`**
- No structural changes needed -- it already accepts `departmentId` and `period` as props and fetches data accordingly
- The upsert with `onConflict: 'indicator_id,customer_id,feature_id,period'` already handles re-saving to same period

### Period Format
- Monthly: `YYYY-MM` (e.g., `2026-02`) -- existing format, no change
- Weekly: `YYYY-Wxx` (e.g., `2026-W07`) -- new format stored in same `period` text column
- The `period` column is `text` type so it supports both formats without migration

### No Database Migration Required
- `csm_customer_feature_scores.period` is already `text` and accepts any string
- The upsert constraint handles deduplication per period

### Data Flow

```text
CSM selects period (Monthly: 2026-02, or Weekly: 2026-W07)
  -> Matrix loads existing scores for that period
  -> CSM fills/updates band selections
  -> Save upserts scores with that period key
  -> Indicator aggregates recalculated for that period

Admin opens Data Management -> CSM Entries tab
  -> Selects department + period
  -> Same matrix component loads, showing all CSM-entered data
  -> Admin can review or edit entries
```

