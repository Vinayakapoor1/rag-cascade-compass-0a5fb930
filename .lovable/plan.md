

# Add "Last Updated" Timestamp + CSM Status Summary to Compliance Report

## Overview

Two changes:
1. Add a visible "Last updated" timestamp to the Compliance Report page showing when data was last fetched
2. Surface the status of the three CSMs with zero entries (Jagjit, Pooja, Sahil) -- these are confirmed as genuine compliance gaps (accounts are properly configured, they just haven't submitted)

## Changes

### 1. "Last Updated" Timestamp on Compliance Report

**File: `src/pages/ComplianceReport.tsx`**

- Track a `dataFetchedAt` timestamp using `useState`, updated inside each `useQuery`'s `onSuccess` or by capturing `Date.now()` after queries resolve
- Simpler approach: use `useQuery`'s `dataUpdatedAt` property from the scores query (the most relevant timestamp)
- Display it in the header subtitle next to Period and Deadline:
  ```
  Period: 2026-02 · Deadline: Friday 11:30 PM (3 days) · Last updated: 2 min ago
  ```
- Add a manual "Refresh" button (using `refetchAll` on the three queries) so admins can force a fresh fetch
- Use `date-fns` `formatDistanceToNow` for the relative timestamp display

### 2. Enhanced Pending CSM Cards with Context

**File: `src/pages/ComplianceReport.tsx`**

- For each non-compliant CSM card, add a line showing how many customers are pending (already shown) and a "last active" indicator
- Query `activity_logs` for recent actions by each CSM's `user_id` to show when they last logged any activity
- Display "Last active: 2 days ago" or "No recent activity" beneath each non-compliant CSM name
- This helps admins distinguish between CSMs who are active but haven't submitted vs. those who may not be logging in at all

### 3. "Last Updated" on CSMComplianceWidget (Dashboard)

**File: `src/components/CSMComplianceWidget.tsx`**

- Similarly surface the `dataUpdatedAt` from the scores query in the collapsed subtitle line
- Show as: `2026-02 · 2/5 submitted · Updated 5 min ago · Deadline: Friday 11:30 PM`

## Technical Details

### Data source for "Last Updated"
- Use `@tanstack/react-query`'s built-in `dataUpdatedAt` property (returned by `useQuery`) -- no new database queries needed
- Format with `date-fns`'s `formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })`

### Refresh button
- Call `.refetch()` on all three queries (csms, scores, customers)
- Show a `RefreshCw` icon button with spinning animation while any query is fetching

### Activity lookup for non-compliant CSMs
- Add one additional query to `ComplianceReport.tsx`:
  ```sql
  SELECT user_id, MAX(created_at) as last_active
  FROM activity_logs
  WHERE user_id IN (csm_user_ids)
  GROUP BY user_id
  ```
- Map results to each non-compliant CSM card

## Files Modified

| File | Change |
|------|--------|
| `src/pages/ComplianceReport.tsx` | Add dataUpdatedAt display, refresh button, activity lookup for pending CSMs |
| `src/components/CSMComplianceWidget.tsx` | Add dataUpdatedAt to subtitle line |

## Current CSM Status (for your awareness)

All three CSMs below have properly configured accounts (roles, department access). They have zero February entries -- this is a compliance gap, not a technical bug:

- **Sahil Kapoor** -- 9 customers assigned, 0 submitted
- **Pooja Singh** -- 7 customers assigned, 0 submitted  
- **Jagjit Mann** -- 1 customer assigned, 0 submitted

The enhanced compliance report will make this immediately visible with "last active" timestamps so you can follow up appropriately.

