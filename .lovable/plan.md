

# Plan: Fix Dashboard Data Display and Verify Data Entry Flow

## Problem Summary
The dashboard shows no recent activity even though data exists, and the `indicator_history` table is empty despite having historical data entries.

## Root Cause Analysis

| Issue | Finding |
|-------|---------|
| No recent activity | Activity logs exist (from Jan 28) but may not be displaying correctly |
| Empty indicator_history | The fix was just applied; no new entries since the fix |
| Team lead data entry | Code is correct but needs testing |

---

## Solution Overview

### Step 1: Force Data Refresh on Dashboard

Add a trigger to invalidate the query cache and force a fresh data fetch when the dashboard loads. This ensures stale cached data doesn't prevent display.

**File**: `src/components/ActivityTimelineWidget.tsx`

**Change**: Add immediate fetch on mount and ensure loading states are handled correctly.

---

### Step 2: Backfill Existing Activity Logs to indicator_history

Since old data entries created `activity_logs` but not `indicator_history` records, we can create a one-time backfill to populate historical data.

**Approach**: Create a SQL migration that populates `indicator_history` from `activity_logs` where:
- `entity_type = 'indicator'`
- `action = 'update'`
- `new_value` contains `current_value`

---

### Step 3: Verify and Enhance the History Insert in DepartmentDataEntry

Ensure the bulk entry page correctly saves history records and add better error handling.

**File**: `src/pages/DepartmentDataEntry.tsx`

**Current code at lines 302-317**:
```typescript
const { error: historyError } = await supabase
  .from('indicator_history')
  .insert({
    indicator_id: update.id,
    value: newValue,
    period,
    evidence_url: evidenceUrl,
    no_evidence_reason: update.evidenceReason || null,
    created_by: user!.id
  });
```

**Enhancement**: Add toast notification for history insertion success/failure.

---

### Step 4: Add RLS Policy for UPDATE on indicator_history

Currently, users can INSERT but cannot UPDATE the history table. For the `IndicatorHistoryDialog` edit functionality to work, we need to allow updates.

**SQL Migration**:
```sql
CREATE POLICY "Users can update their own history entries"
  ON indicator_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);
```

---

## Technical Details

### Migration: Backfill indicator_history from activity_logs

```sql
INSERT INTO indicator_history (indicator_id, value, period, created_at, created_by)
SELECT 
  al.entity_id::uuid as indicator_id,
  (al.new_value->>'current_value')::numeric as value,
  COALESCE(al.metadata->>'period', to_char(al.created_at, 'YYYY-MM')) as period,
  al.created_at,
  al.user_id as created_by
FROM activity_logs al
WHERE al.entity_type = 'indicator'
  AND al.action = 'update'
  AND al.new_value->>'current_value' IS NOT NULL
  AND al.entity_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Component Changes

**ActivityTimelineWidget.tsx**:
- Add `refetch()` call on mount if logs are empty
- Improve empty state messaging

**DepartmentDataEntry.tsx**:
- Add console logging for history insert success
- Show user feedback for history save status

---

## Implementation Order

1. Create migration to add UPDATE policy on `indicator_history`
2. Create migration to backfill history from existing activity logs
3. Update `ActivityTimelineWidget` to force fresh data fetch
4. Test the end-to-end flow

---

## Expected Outcomes

After implementation:
- Dashboard will show recent activity correctly
- `indicator_history` will have historical data from past entries
- Team leads can enter data and it saves to both tables
- Admin can see all historical data and edits
- Users can edit their own history entries

