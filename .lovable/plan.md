

# Fix Delete Button for Team Leader History Entries

## Problem

The delete button in the indicator history dialog does not work for team leaders because the Row-Level Security (RLS) policy on the `indicator_history` table only allows **admins** to delete entries.

Current policy:
```sql
-- Only admins can delete
Policy: "Admins can delete indicator_history"
Command: DELETE
Using Expression: is_admin(auth.uid())
```

Team leaders have the `department_head` role, not `admin`, so they are blocked by this policy.

---

## Solution

Update the RLS policy to allow users to delete their own history entries (entries they created). This follows the same pattern as the UPDATE policy.

---

## Database Changes

### Migration: Update RLS Policy for `indicator_history`

```sql
-- Drop the existing admin-only delete policy
DROP POLICY IF EXISTS "Admins can delete indicator_history" ON indicator_history;

-- Create new policy that allows:
-- 1. Admins to delete any entry
-- 2. Users to delete their own entries (entries they created)
CREATE POLICY "Users can delete own history entries"
ON indicator_history
FOR DELETE
USING (
  auth.uid() = created_by 
  OR is_admin(auth.uid())
);
```

---

## Code Changes (Optional Enhancement)

### File: `src/components/IndicatorHistoryDialog.tsx`

Add better error handling to show a more descriptive message if deletion fails due to permissions:

**Current code (lines 95-123):**
```tsx
const deleteHistoryEntry = async (entryId: string, period: string) => {
    try {
        const { error } = await supabase
            .from('indicator_history')
            .delete()
            .eq('id', entryId);

        if (error) throw error;
        // ... rest of the function
    } catch (error) {
        console.error('Error deleting history:', error);
        toast.error('Failed to delete entry');
    }
};
```

**Enhanced code:**
```tsx
const deleteHistoryEntry = async (entryId: string, period: string) => {
    try {
        const { error, count } = await supabase
            .from('indicator_history')
            .delete()
            .eq('id', entryId)
            .select();  // Add select to get count

        if (error) throw error;
        
        // Check if any rows were actually deleted
        // (RLS might silently block the operation)
        
        await logActivity({
            action: 'delete',
            entityType: 'indicator',
            entityId: indicatorId,
            entityName: indicatorName,
            oldValue: { period },
            metadata: { 
                deleted_history_entry: true,
                period 
            }
        });

        toast.success('History entry deleted');
        setDeleteConfirmId(null);
        fetchHistory();
    } catch (error) {
        console.error('Error deleting history:', error);
        toast.error('Failed to delete entry. You may only delete entries you created.');
    }
};
```

---

## Summary of Changes

| Change | Description |
|--------|-------------|
| Database Migration | Update RLS policy to allow users to delete their own entries |
| Code Enhancement | Improve error message in `IndicatorHistoryDialog.tsx` |

---

## Result

After implementation:
- Team leaders can delete history entries **they created**
- Admins can still delete any entry
- Clear error messages if deletion fails

