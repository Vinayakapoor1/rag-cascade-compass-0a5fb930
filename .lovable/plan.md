

# Fix Admin Console Delete Function + Add History Entry Delete

## Problem Summary

| Issue | Current Behavior | Expected Behavior |
|-------|-----------------|-------------------|
| Delete/Reset not updating RAG | Sets RAG to 'amber' (yellow) | Should set RAG to 'not-set' (gray) when no data |
| No individual history delete | Can only edit history entries | Need delete option for each history entry |
| Unclear terminology | Single "Delete" action that resets data | Clearer Reset vs Delete options |

---

## Solution Overview

### Fix 1: Update RAG Status on Reset/Delete

When clearing indicator data, the RAG status should become 'not-set' (gray) to indicate "No data entered" rather than 'amber' which implies at-risk performance.

**Affected functions:**
- `deleteIndicatorData()` - line 227: change `rag_status: 'amber'` to `rag_status: 'not-set'`
- `resetKeyResult()` - line 274: change `rag_status: 'amber'` to `rag_status: 'not-set'`
- `bulk_reset_indicators` database function already uses 'amber' - but this is a stored procedure, so we'll update the client-side ones

### Fix 2: Add Delete Button to History Entries

Add a trash icon button next to the Edit button in the history dialog that allows deleting individual history entries.

### Fix 3: Rename Actions for Clarity

- Current "Delete Data" button → Rename to "Reset" with a different icon
- Add actual "Delete" for history entries

---

## Implementation Details

### Step 1: Fix RAG Status in AdminDataControls.tsx

**File**: `src/components/admin/AdminDataControls.tsx`

Update `deleteIndicatorData` function (line 227):
```typescript
const { error } = await supabase
    .from('indicators')
    .update({
        current_value: null,
        evidence_url: null,
        evidence_type: null,
        no_evidence_reason: null,
        rag_status: 'not-set',  // Changed from 'amber'
    })
    .eq('id', indicatorId);
```

Update `resetKeyResult` function (line 274):
```typescript
const { error } = await supabase
    .from('indicators')
    .update({
        current_value: null,
        evidence_url: null,
        evidence_type: null,
        no_evidence_reason: null,
        rag_status: 'not-set',  // Changed from 'amber'
    })
    .eq('key_result_id', krId);
```

Update dialog description (line 586):
```typescript
<AlertDialogDescription>
    This will reset this indicator to its default state (no value, no evidence, RAG status = not-set).
    This action cannot be undone.
</AlertDialogDescription>
```

### Step 2: Add Delete Button to History Dialog

**File**: `src/components/IndicatorHistoryDialog.tsx`

Add import for Trash2 icon:
```typescript
import { History, Download, FileText, Calendar, User, Pencil, Save, X, ExternalLink, Trash2 } from 'lucide-react';
```

Add state for delete confirmation:
```typescript
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
```

Add delete function:
```typescript
const deleteHistoryEntry = async (entryId: string, period: string) => {
    try {
        const { error } = await supabase
            .from('indicator_history')
            .delete()
            .eq('id', entryId);

        if (error) throw error;

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
        toast.error('Failed to delete entry');
    }
};
```

Add Delete button in table actions column (after Edit button):
```typescript
<TableCell className="text-right">
    {isEditing ? (
        // ... existing edit buttons
    ) : deleteConfirmId === entry.id ? (
        <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-destructive mr-1">Delete?</span>
            <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive"
                onClick={() => deleteHistoryEntry(entry.id, entry.period)}
            >
                Yes
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setDeleteConfirmId(null)}
            >
                No
            </Button>
        </div>
    ) : (
        <div className="flex items-center justify-end gap-1">
            <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => startEdit(entry)}
            >
                <Pencil className="h-3 w-3" />
                <span className="text-xs">Edit</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirmId(entry.id)}
            >
                <Trash2 className="h-3 w-3" />
            </Button>
        </div>
    )}
</TableCell>
```

### Step 3: Update Button Label for Clarity

**File**: `src/components/admin/AdminDataControls.tsx`

Change the action button label (around line 561-567):
```typescript
<Button
    variant="ghost"
    size="icon"
    className="h-8 w-8"
    title="Reset Indicator (Clear Data)"  // More descriptive title
    onClick={() => {
        setSelectedIndicator(ind.id);
        setDeleteDialogOpen(true);
    }}
>
    <RotateCcw className="h-4 w-4 text-orange-500" />  // Use reset icon instead of trash
</Button>
```

Also add `RotateCcw` to imports.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/AdminDataControls.tsx` | Fix RAG status to 'not-set', add RotateCcw icon, update button title |
| `src/components/IndicatorHistoryDialog.tsx` | Add delete functionality for individual history entries |

---

## Visual Changes

### Before (Admin Data Controls)
```
[Trash Icon] Delete Data → Sets RAG to amber
```

### After (Admin Data Controls)  
```
[Reset Icon] Reset Indicator → Sets RAG to 'not-set' (gray)
```

### Before (History Dialog)
```
| Period | Value | ... | Actions    |
|--------|-------|-----|------------|
| 2025-01| 85    | ... | [Edit]     |
```

### After (History Dialog)
```
| Period | Value | ... | Actions         |
|--------|-------|-----|-----------------|
| 2025-01| 85    | ... | [Edit] [Delete] |
```

---

## Technical Notes

- The 'not-set' RAG status aligns with the project's RAG threshold standards: "0% or null" → "Not Set" (gray)
- RLS policy on `indicator_history` already allows admins to delete (`Admins can delete indicator_history`)
- Activity logging captures deletions for audit trail

