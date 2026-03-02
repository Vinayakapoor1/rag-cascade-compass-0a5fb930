

# Enhanced Data Entry Timeline & Customer Summary

## Overview
Three improvements to the CSM data entry experience:
1. **Role-scoped timeline** -- CSMs see only their assigned customers' updates; admins/team leads see everything
2. **Customer accordion shows last-period data** -- instead of blank, pre-populate from the most recent period's scores and show last check-in date
3. **Visual change indicator** -- mini sparkline/bar showing previous vs current period scores per customer

---

## Changes

### 1. Role-Scoped Timeline (CSMDataEntryTimeline.tsx)

**Current**: Fetches all 100 most recent scores globally -- every CSM sees everyone's data.

**Fix**: Accept `csmId` and `isAdmin` as props. When `csmId` is set and user is not admin:
- First fetch the CSM's assigned customer IDs from `customers` table (`csm_id = csmId`)
- Filter `csm_customer_feature_scores` query to only those customer IDs using `.in('customer_id', assignedIds)`
- Admins and team leads continue to see all updates

**Parent changes**: Pass `csmId` and `isAdmin` props from `CSMDataEntry.tsx` and `ContentManagementDataEntry.tsx` into the timeline component.

### 2. Customer Accordion Shows Last-Period Data (CSMDataEntryMatrix.tsx)

**Current**: When opening a new period, all cells are blank. The accordion header shows "No data" badge.

**Fix**: In the matrix query (`queryFn`), also fetch the **previous period's scores**:
- Query `csm_customer_feature_scores` for the most recent period before the current one (using `.lt('period', period).order('period', { ascending: false }).limit(1)` to find it, then fetch all scores for that period)
- Return `previousScores` alongside `scores` in the query result
- In the customer accordion header, show:
  - Last check-in date (max `updated_at` from the previous period's scores for that customer)
  - Score summary from previous period (e.g., "Last: 72%") when current period has no data
- When current period has no data, display the previous values as ghost/faded reference values in cells (not editable, just visual context)

### 3. Visual Change Chart (CustomerSectionCard in CSMDataEntryMatrix.tsx)

**Current**: The accordion header shows only a single RAG badge with the current percentage.

**Fix**: Add a mini comparison visual in the customer accordion header:
- Show a small inline bar or arrow indicator: `Previous% -> Current%` with color coding
- If previous period had 65% and current has 78%, show: `65% -> 78%` with a green upward arrow
- If no current data yet, show: `Last: 65%` with the previous period label
- Use simple colored spans/badges (no charting library needed for this compact view)
- Include the last check-in date as small muted text (e.g., "Last: 2 days ago")

This pattern will be reusable across all data entry forms (CSM, Content Management, Department).

---

## Technical Details

### CSMDataEntryTimeline.tsx changes
- New props: `csmId: string | null`, `isAdmin: boolean`
- In `fetchLogs`: if `csmId && !isAdmin`, first query `customers` for assigned IDs, then filter scores query with `.in('customer_id', assignedIds)`
- No change for admin/team lead users

### CSMDataEntryMatrix.tsx query changes
- Add a sub-query to find the latest period before current: query distinct periods, find max < current period
- Fetch previous period scores into `previousScores: ScoreMap`
- Fetch previous period `updated_at` timestamps for last check-in display
- Return both in query result: `{ ...existing, previousScores, previousPeriodLabel, lastCheckInByCustomer }`

### CustomerSectionCard header enhancement
- Receive `previousScores`, `previousPeriodLabel`, `lastCheckInByCustomer` as new props
- Compute previous period average for the customer (same logic as `getCustomerOverallAvg` but using `previousScores`)
- Render inline comparison: previous badge -> arrow -> current badge
- Show "Last check-in: X ago" text below the customer name

### CSMDataEntry.tsx and ContentManagementDataEntry.tsx
- Pass `csmId` and `isAdmin` to `CSMDataEntryTimeline`

### Files touched
1. `src/components/user/CSMDataEntryTimeline.tsx` -- role-based filtering
2. `src/components/user/CSMDataEntryMatrix.tsx` -- previous period data fetch + header visual
3. `src/pages/CSMDataEntry.tsx` -- pass auth props to timeline
4. `src/pages/ContentManagementDataEntry.tsx` -- add timeline sidebar + pass auth props

