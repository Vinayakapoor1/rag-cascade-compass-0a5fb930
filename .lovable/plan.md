
# Fix Multiple Data Entry and Admin Panel Issues

## Problem Summary

Based on thorough investigation, there are **5 interconnected issues** that need to be addressed:

| # | Issue | Root Cause |
|---|-------|------------|
| 1 | Activity log shows raw JSON `{"value":"3X Revenue"}` | The `getDisplayValue` helper handles `value` property but still falls through to `JSON.stringify` for some edge cases |
| 2 | Data filled in team form doesn't show in admin panel | The `AdminDataControls` component fetches data independently but doesn't display `indicator_history` or evidence files properly |
| 3 | History shows in team form but not admin panel | Admin panel's `AdminDataControls` doesn't have a history view at all - it only shows current indicator values |
| 4 | RAG status changes on dashboard but admin shows "not set" | The `DepartmentDataEntry` does NOT update the `rag_status` column in the `indicators` table after saving |
| 5 | File link (paperclip) navigates to wrong place | In `DepartmentDataEntry.tsx`, the evidence link wraps the paperclip icon but uses `ind.evidence_url` which may be a storage path (not full URL), and file uploads go to `evidence` bucket while downloads use `evidence-files` bucket |

---

## Detailed Analysis

### Issue 1: Raw JSON Display in Activity Log

The screenshot shows:
```
{"value":"3X Revenue"}
```

The `getDisplayValue` function was added but the logic needs refinement:
- It checks for `value.current_value` for indicators
- It checks for `value.value` for business outcomes
- But it still falls through to `JSON.stringify` in some cases

**Solution**: Improve the `getDisplayValue` function to better extract meaningful values and avoid JSON stringification.

### Issue 2 & 3: Data Not Appearing in Admin Panel

The admin panel (`AdminDataControls.tsx`) fetches indicator data directly from the `indicators` table but:
1. Does **NOT** include a way to view history entries
2. Does **NOT** show when data was last updated by team members
3. Uses a simple flat query without activity/history context

**Solution**: Add a history dialog to the admin panel and show recent activity.

### Issue 4: RAG Status Not Syncing

In `DepartmentDataEntry.tsx` line 323-330:
```typescript
const { error } = await supabase
  .from('indicators')
  .update({
    current_value: newValue,
    evidence_url: evidenceUrl,
    no_evidence_reason: update.evidenceReason || null,
  })
  .eq('id', update.id);
```

**CRITICAL BUG**: The `rag_status` column is **NOT being updated** when saving! The code calculates `oldRAGStatus` and `newRAGStatus` (lines 335-336) but never writes `rag_status` to the database.

**Solution**: Add `rag_status: newRAGStatus` to the update query.

### Issue 5: Evidence File Link Issues

Two problems identified:

1. **Wrong bucket name**: 
   - `DepartmentDataEntry.tsx` uploads to `'evidence'` bucket (line 286-287)
   - `DataEntryView.tsx` uploads to `'evidence-files'` bucket (line 112)
   - But the storage bucket is named `'evidence-files'`

2. **Paperclip link uses raw path instead of public URL**:
   - Line 653: `<a href={updates[ind.id]?.evidenceUrl || ind.evidence_url} ...>`
   - If `evidence_url` is a storage path like `evidence/uuid/file.pdf`, clicking opens that path directly instead of getting the public URL

**Solution**: 
- Change bucket name to match the existing `evidence-files` bucket
- Convert storage paths to public URLs before using as href

---

## Implementation Plan

### Step 1: Fix RAG Status Not Updating

**File**: `src/pages/DepartmentDataEntry.tsx`

Add `rag_status` to the update query:
```typescript
// Around line 323
const { error } = await supabase
  .from('indicators')
  .update({
    current_value: newValue,
    evidence_url: evidenceUrl,
    no_evidence_reason: update.evidenceReason || null,
    rag_status: newRAGStatus,  // ADD THIS LINE
  })
  .eq('id', update.id);
```

### Step 2: Fix Storage Bucket Mismatch

**File**: `src/pages/DepartmentDataEntry.tsx`

Change the upload bucket from `'evidence'` to `'evidence-files'`:
```typescript
// Around line 284-288
const { error: uploadError } = await supabase.storage
  .from('evidence-files')  // Change from 'evidence'
  .upload(filePath, update.evidenceFile);
```

Also update the public URL retrieval:
```typescript
// Around line 295-298
const { data } = supabase.storage
  .from('evidence-files')  // Change from 'evidence'
  .getPublicUrl(filePath);
```

### Step 3: Fix Evidence Link Navigation

**File**: `src/pages/DepartmentDataEntry.tsx`

Create a helper function to get the correct URL:
```typescript
const getEvidenceUrl = (url: string | null): string | null => {
  if (!url) return null;
  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it's a storage path, get the public URL
  const { data } = supabase.storage.from('evidence-files').getPublicUrl(url);
  return data.publicUrl;
};
```

Update the paperclip link (around line 652-655):
```typescript
{hasEvidence && (
  <a 
    href={getEvidenceUrl(updates[ind.id]?.evidenceUrl || ind.evidence_url)} 
    target="_blank" 
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
  >
    <Paperclip className="h-4 w-4 text-primary cursor-pointer" />
  </a>
)}
```

### Step 4: Improve Activity Log Value Display

**File**: `src/components/ActivityTimelineMini.tsx` and `src/components/ActivityTimelineWidget.tsx`

Improve the `getDisplayValue` function:
```typescript
const getDisplayValue = (value: any): string => {
  if (value === null || value === undefined) return 'Empty';
  
  // Handle primitive values directly
  if (typeof value === 'string') return value || 'Empty';
  if (typeof value === 'number') return String(value);
  
  // Handle indicator values (has current_value)
  if ('current_value' in value) {
    return value.current_value !== null ? String(value.current_value) : 'Empty';
  }
  
  // Handle business outcome values (has value property)
  if ('value' in value) {
    return value.value || 'Empty';
  }
  
  // For any other object with a single key, return that value
  const keys = Object.keys(value);
  if (keys.length === 1) {
    const singleValue = value[keys[0]];
    if (typeof singleValue === 'string' || typeof singleValue === 'number') {
      return String(singleValue);
    }
  }
  
  // Last resort: avoid ugly JSON
  return 'Updated';
};
```

### Step 5: Add History View to Admin Panel

**File**: `src/components/admin/AdminDataControls.tsx`

Add a history button to each indicator row and integrate the `IndicatorHistoryDialog`:

1. Import the history dialog:
```typescript
import { IndicatorHistoryDialog } from '@/components/IndicatorHistoryDialog';
```

2. Add state for history dialog:
```typescript
const [historyDialog, setHistoryDialog] = useState<{
  open: boolean;
  indicatorId: string;
  indicatorName: string;
  targetValue: number | null;
  unit: string | null;
}>({ open: false, indicatorId: '', indicatorName: '', targetValue: null, unit: null });
```

3. Add history button in the Actions column:
```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={() => setHistoryDialog({
    open: true,
    indicatorId: ind.id,
    indicatorName: ind.name,
    targetValue: ind.target_value,
    unit: null
  })}
>
  <History className="h-4 w-4" />
</Button>
```

4. Render the dialog at the end of the component.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DepartmentDataEntry.tsx` | Fix RAG status update, fix storage bucket name, fix evidence URL handling |
| `src/components/ActivityTimelineMini.tsx` | Improve `getDisplayValue` function |
| `src/components/ActivityTimelineWidget.tsx` | Improve `getDisplayValue` function |
| `src/components/admin/AdminDataControls.tsx` | Add history dialog integration |

---

## Technical Notes

### RAG Status Column Values
The `indicators` table has a `rag_status` column that defaults to `'amber'`. The valid values should be:
- `'green'` (76-100% progress)
- `'amber'` (51-75% progress)
- `'red'` (1-50% progress)
- `'gray'` or `'not-set'` (no data)

### Storage Bucket
The project has one storage bucket: `evidence-files` (private). All file uploads should use this bucket consistently.

---

## Expected Outcomes

After implementation:
1. Activity log will show clean values like "3X Revenue" instead of JSON
2. Admin panel will show history for each indicator
3. RAG status will sync correctly between dashboard and admin panel
4. Evidence files will upload to the correct bucket
5. Clicking the paperclip will open the correct file/link
