

# Fix Links Not Working and Add Team Leader Instructions

## Problem Summary

Based on thorough investigation, there are **3 main issues** to address:

| # | Issue | Root Cause | Impact |
|---|-------|------------|--------|
| 1 | Links not opening | URLs entered without protocol (e.g., `google.com` instead of `https://google.com`) are treated as storage paths, causing errors | High |
| 2 | Links not evident/visible | The Link column exists, but there's no visual indicator showing existing links; only the File column has a paperclip | Medium |
| 3 | No team leader instructions | Team leaders have no guidance on how to enter data from the main dashboard | Medium |

---

## Detailed Analysis

### Issue 1: Links Not Opening

**Current Database State:**
```
indicators.evidence_url = "google.com"  (missing https://)
indicator_history.evidence_url = "gogle.com" | "evidence/uuid/file.xlsx"
```

**Problem in `openEvidenceUrl` function:**
```typescript
if (url.startsWith('http://') || url.startsWith('https://')) {
    window.open(url, '_blank');  // This is skipped for "google.com"
    return;
}
// Falls through to create signed URL for storage
const { data, error } = await supabase.storage.from('evidence-files').createSignedUrl(url, 3600);
// ERROR: Tries to find "google.com" as a file in storage bucket!
```

**Solution**: 
1. Auto-prefix URLs with `https://` when saving if no protocol provided
2. Fix the `openEvidenceUrl` function to detect non-storage paths and add protocol

### Issue 2: Links Not Evident

**Current UI:**
- File column has a paperclip icon that shows when a file is uploaded
- Link column is just an input field
- No visual indicator showing an existing link has been saved

**Solution**: Add a link icon in the grid that lights up when a URL exists (similar to the paperclip for files)

### Issue 3: Team Leader Instructions Missing

**Current State:**
- Team leaders see the "Enter Data" button in the header (AppLayout.tsx line 72-78)
- But there's no explanation of what to do on the main dashboard
- They need to know: click departments, enter values, attach evidence, and save

**Solution**: Add an instruction card on the main dashboard for logged-in department heads

---

## Implementation Plan

### Step 1: Fix URL Protocol Handling

**File**: `src/pages/DepartmentDataEntry.tsx`

Add URL normalization when saving:
```typescript
// Around line 296-298
if (update.evidenceUrl?.trim()) {
    let url = update.evidenceUrl.trim();
    // Auto-add https:// if URL looks like a domain but has no protocol
    if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.includes('/')) {
        // Looks like a domain (e.g., google.com, www.example.org)
        if (url.includes('.')) {
            url = 'https://' + url;
        }
    }
    evidenceUrl = url;
}
```

### Step 2: Fix `openEvidenceUrl` Function (All Files)

**Files**: 
- `src/pages/DepartmentDataEntry.tsx`
- `src/components/admin/AdminDataControls.tsx`
- `src/components/IndicatorHistoryDialog.tsx`

Update the helper function to better detect URLs vs storage paths:
```typescript
async function openEvidenceUrl(url: string | null): Promise<void> {
    if (!url) return;
    
    // If it's already a full URL, open directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
        return;
    }
    
    // Check if this looks like a domain (has dots, no slashes at start)
    // Storage paths look like: evidence/uuid/file.pdf
    // Domains look like: google.com, www.example.org
    const isLikelyDomain = url.includes('.') && !url.startsWith('evidence/') && !url.includes('/');
    
    if (isLikelyDomain) {
        // Treat as external URL, add protocol
        window.open('https://' + url, '_blank');
        return;
    }
    
    // For storage paths, create a signed URL
    const { data, error } = await supabase.storage.from('evidence-files').createSignedUrl(url, 3600);
    if (error) {
        console.error('Error creating signed URL:', error);
        toast.error('Could not access evidence file');
        return;
    }
    window.open(data.signedUrl, '_blank');
}
```

### Step 3: Add Link Indicator Column

**File**: `src/pages/DepartmentDataEntry.tsx`

Add a new column between File and Link for showing existing link status:
```typescript
// Update grid to show link icon when URL exists
<div className="flex justify-center">
    {(updates[ind.id]?.evidenceUrl?.trim() || (ind.evidence_url && ind.evidence_url.startsWith('http'))) ? (
        <button 
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                openEvidenceUrl(updates[ind.id]?.evidenceUrl || ind.evidence_url);
            }}
            className="hover:opacity-70"
        >
            <LinkIcon className="h-4 w-4 text-primary cursor-pointer" />
        </button>
    ) : (
        <LinkIcon className="h-4 w-4 text-muted-foreground/30" />
    )}
</div>
```

### Step 4: Add Team Leader Instructions on Main Dashboard

**File**: `src/pages/Index.tsx`

Add an instruction card for department heads after the login check:
```typescript
{/* Team Leader Instructions - Only for department heads */}
{user && isDepartmentHead && !isAdmin && (
    <div className="card-premium p-6 border-primary/20">
        <div className="flex items-start gap-5 relative z-10">
            <div className="p-4 rounded-2xl bg-primary/10 animate-float">
                <ClipboardCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
                <p className="font-semibold text-lg mb-2">Team Leader Data Entry Guide</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Click on your department below to expand it</li>
                    <li>Navigate to the indicators you need to update</li>
                    <li>Enter current values, attach evidence files or add links</li>
                    <li>If no evidence available, provide a reason</li>
                    <li>Click Save to submit your data</li>
                </ol>
            </div>
            <Button asChild className="hover-glow shadow-lg shadow-primary/30">
                <Link to="/data">Go to Data Entry</Link>
            </Button>
        </div>
    </div>
)}
```

Also need to add the import and hook usage:
```typescript
import { ClipboardCheck } from 'lucide-react';
// And add isDepartmentHead to the useAuth destructure
const { user, isAdmin, isDepartmentHead, loading: authLoading } = useAuth();
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DepartmentDataEntry.tsx` | Fix URL normalization, update `openEvidenceUrl`, add Link icon column |
| `src/components/admin/AdminDataControls.tsx` | Update `openEvidenceUrl` to handle domains |
| `src/components/IndicatorHistoryDialog.tsx` | Update `handleDownloadEvidence` to handle domains |
| `src/pages/Index.tsx` | Add team leader instructions card |

---

## Technical Notes

### URL vs Storage Path Detection
- Storage paths always start with `evidence/` and contain slashes
- External URLs start with `http://` or `https://`
- Domains without protocol have dots but no slashes (e.g., `google.com`)

### Storage Bucket
The `evidence-files` bucket is **private** (`public: false`), so:
- File access requires signed URLs (working correctly)
- External links should NOT go through storage at all

---

## Expected Outcomes

After implementation:
1. URLs entered as `google.com` will be auto-prefixed with `https://` when saved
2. Existing URLs without protocol will still open correctly (fallback detection)
3. Link column will show a clickable link icon when a URL exists
4. Team leaders will see clear instructions on the main dashboard for data entry

