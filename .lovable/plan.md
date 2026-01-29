

# Plan: Fix Reset Data Issues - Activity Logs, History, and RAG Status

## Problem Summary

| Issue | Finding |
|-------|---------|
| **Recent Activity Still Showing** | Reset only clears `indicator_history`, NOT `activity_logs` (2 logs remain) |
| **indicator_history Not Cleared** | History has 2 records that should have been deleted but weren't |
| **RAG Status = Amber After Reset** | Reset explicitly sets `rag_status: 'amber'` instead of `'not-set'` |

---

## Root Cause Analysis

### Issue 1: Activity Logs Not Cleared
The `resetAllData()` function in `AdminDataControls.tsx` (line 199-230) does:
- Resets indicators table
- Deletes `indicator_history`
- **Does NOT delete `activity_logs`**

Activity logs are meant as an audit trail, but if you want a "clean slate", they should also be cleared.

### Issue 2: indicator_history Still Has Records
The delete operation uses `@ts-ignore` workaround:
```typescript
const { error: historyError } = await supabase
  .from('indicator_history' as any)
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000');
```
This may be failing silently due to RLS policy - users can INSERT and UPDATE their own records, but there's **no DELETE policy** on `indicator_history`.

### Issue 3: RAG Status Shows Amber, Not "Not Set"
Line 209 of `resetAllData()` explicitly sets:
```typescript
rag_status: 'amber',
```
Per your RAG threshold standards, reset data should show `'not-set'` (meaning "No data entered").

---

## Solution Overview

### Step 1: Add DELETE RLS Policy for indicator_history
Create migration to allow authenticated users to delete their own history records:
```sql
CREATE POLICY "Users can delete their own history entries"
  ON indicator_history FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
```

### Step 2: Fix RAG Status on Reset
Change the reset operation to use `'not-set'` instead of `'amber'`:
```typescript
rag_status: 'not-set',  // Changed from 'amber'
```

### Step 3: Add Activity Logs Clearing (Optional)
Add option to also clear activity logs during reset:
```typescript
const { error: logsError } = await supabase
  .from('activity_logs')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000');
```

### Step 4: Run One-Time Cleanup
Execute SQL to clear remaining orphaned records:
```sql
DELETE FROM activity_logs WHERE true;
DELETE FROM indicator_history WHERE true;
UPDATE indicators SET rag_status = 'not-set' WHERE current_value IS NULL;
```

---

## Team Leader Data Entry Logs Location

When team leaders enter data:
1. **Activity Timeline Widget** (Dashboard) - Shows last 15 entries
2. **Admin Dashboard** - Full activity timeline with all entries
3. **indicator_history Table** - Historical values per indicator per period

All entries are saved to:
- `activity_logs` table (for audit trail / recent activity widget)
- `indicator_history` table (for historical trending data)

---

## Implementation Order

1. Create migration to add DELETE policy on `indicator_history`
2. Run cleanup migration to clear orphaned records
3. Update `AdminDataControls.tsx` to set `rag_status: 'not-set'` on reset
4. Update `AdminDataControls.tsx` to also clear `activity_logs` during reset
5. Test the reset flow end-to-end

---

## Expected Outcomes

After implementation:
- Reset will clear ALL related data (indicators, history, activity logs)
- RAG status will show "Not Set" (gray) after reset
- Team lead entries will appear in Recent Activity widget
- Historical data will be properly tracked in indicator_history

