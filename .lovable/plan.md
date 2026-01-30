

# Fix Dashboard Not Updating After Delete + Show Deletions in Recent Activity

## Problem Summary

Two issues have been identified:

1. **Dashboard stays "red" after data deletion**: When a user deletes history entries, the `indicator.current_value` in the `indicators` table is NOT updated. The deleted indicator `CSAT Score` still has `current_value: 50` even though all history entries were deleted.

2. **Deletions not highlighted in Recent Activity**: The `ActivityTimelineMini` component only renders update-specific UI (`action === 'update'`). Delete actions are logged in the database but not displayed properly (should show in red with "Deleted" text).

---

## Root Cause Analysis

### Issue 1: Dashboard Not Updating

When deleting a history entry in `IndicatorHistoryDialog.tsx`:
- It deletes from `indicator_history` table only
- It does NOT update the `indicators.current_value`
- It does NOT invalidate the React Query cache for dashboard data

The dashboard reads from `indicators.current_value`, so deleting history has no effect on dashboard RAG status.

### Issue 2: Deletions Not Shown in Activity

The `ActivityTimelineMini` component (line 187) only shows value change UI when `action === 'update'`:

```tsx
{log.action === 'update' && (log.old_value || log.new_value) && (
    <div className="flex items-center gap-1 text-xs">
        <span>{getDisplayValue(log.old_value)}</span>
        <ArrowRight />
        <span>{getDisplayValue(log.new_value)}</span>
    </div>
)}
```

Delete actions are logged (action: 'delete') but have no UI rendering.

---

## Solution

### Part 1: Update Indicator Value When History Entry is Deleted

Modify `deleteHistoryEntry` in `IndicatorHistoryDialog.tsx` to:
1. After deleting a history entry, fetch remaining history
2. If history is now empty, reset `indicators.current_value` to `null`
3. If history remains, update `indicators.current_value` to the latest entry's value
4. Invalidate React Query cache to refresh dashboard

### Part 2: Add Delete-Specific UI in Activity Timeline

Modify `ActivityTimelineMini.tsx` to:
1. Add styling for delete actions (red background/text)
2. Show "Deleted" badge or indicator
3. Display the period that was deleted

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/IndicatorHistoryDialog.tsx` | Update indicator value after delete, add onDataChange callback, invalidate queries |
| `src/components/ActivityTimelineMini.tsx` | Add delete action UI with red styling |
| `src/pages/DepartmentDataEntry.tsx` | Pass onDataChange callback to refresh data |
| `src/components/admin/AdminDataControls.tsx` | Pass onDataChange callback to refresh data |

---

## Technical Details

### 1. IndicatorHistoryDialog.tsx Changes

Add onDataChange callback prop and update delete function:

```tsx
interface IndicatorHistoryDialogProps {
    // ... existing props
    onDataChange?: () => void;  // New callback to notify parent
}

const deleteHistoryEntry = async (entryId: string, period: string) => {
    try {
        const { error, data } = await supabase
            .from('indicator_history')
            .delete()
            .eq('id', entryId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            toast.error('You can only delete entries you created.');
            setDeleteConfirmId(null);
            return;
        }

        // Fetch remaining history to determine new current value
        const { data: remainingHistory } = await supabase
            .from('indicator_history')
            .select('value, period')
            .eq('indicator_id', indicatorId)
            .order('period', { ascending: false })
            .limit(1);

        // Update indicator's current_value based on remaining history
        const newCurrentValue = remainingHistory && remainingHistory.length > 0 
            ? remainingHistory[0].value 
            : null;

        await supabase
            .from('indicators')
            .update({ current_value: newCurrentValue })
            .eq('id', indicatorId);

        // Log activity
        await logActivity({
            action: 'delete',
            entityType: 'indicator',
            entityId: indicatorId,
            entityName: indicatorName,
            oldValue: { current_value: data[0]?.value, period },
            metadata: { 
                deleted_history_entry: true,
                period,
                new_indicator_value: newCurrentValue
            }
        });

        // Invalidate React Query cache for dashboard refresh
        queryClient.invalidateQueries({ queryKey: ['org-objectives'] });

        toast.success('History entry deleted');
        setDeleteConfirmId(null);
        fetchHistory();
        
        // Notify parent component
        onDataChange?.();
    } catch (error) {
        console.error('Error deleting history:', error);
        toast.error('Failed to delete entry.');
    }
};
```

### 2. ActivityTimelineMini.tsx Changes

Add delete action rendering with red styling:

```tsx
{/* Delete Action - Show in Red */}
{log.action === 'delete' && (
    <div className="flex items-center gap-1 text-xs">
        <Badge 
            variant="outline" 
            className="text-[8px] px-1 py-0 h-3.5 bg-red-500/10 text-red-700 border-red-500/20"
        >
            DELETED
        </Badge>
        {log.metadata?.period && (
            <span className="text-muted-foreground">
                Period: {log.metadata.period}
            </span>
        )}
    </div>
)}

{/* Also update the icon/container styling for delete actions */}
<div className={cn(
    "mt-0.5 p-1.5 rounded-full",
    log.action === 'delete' ? "bg-red-500/10" : "bg-muted"
)}>
    {log.action === 'delete' ? (
        <Trash2 className="h-3 w-3 text-red-600" />
    ) : (
        getEntityIcon(log.entity_type)
    )}
</div>
```

### 3. DepartmentDataEntry.tsx Changes

Add callback to refresh data when history dialog triggers changes:

```tsx
<IndicatorHistoryDialog
    open={historyDialog.open}
    onOpenChange={(open) => setHistoryDialog({ ...historyDialog, open })}
    indicatorId={historyDialog.indicatorId}
    indicatorName={historyDialog.indicatorName}
    krName={historyDialog.krName}
    targetValue={historyDialog.targetValue}
    unit={historyDialog.unit}
    onDataChange={() => {
        // Refetch department data to update dashboard
        fetchDepartmentData();
    }}
/>
```

---

## Result After Implementation

1. **Dashboard updates immediately after delete**: The indicator's `current_value` is updated when history entries are deleted, and React Query cache is invalidated to refresh the dashboard
2. **Deletions show in red in Recent Activity**: Delete actions display with:
   - Red trash icon instead of the entity icon
   - Red "DELETED" badge
   - Period information showing what was deleted
3. **Consistent user experience**: Both the dashboard and activity log reflect deletions in real-time

