
# Fix "Unknown User" Display in Activity Logs

## Problem Summary

When you edited the Business Outcome, the activity log shows "Unknown User" even though you were signed in. This is because:

| Issue | Root Cause |
|-------|------------|
| **No user_id saved** | `EditBusinessOutcomeDialog` doesn't include `user_id` when logging activity |
| **No user_email in metadata** | The component doesn't store your email in the log metadata |
| **Display fallback says "Unknown User"** | When no user info is found, the timeline shows this placeholder |

---

## Solution Overview

### Step 1: Fix EditBusinessOutcomeDialog
The `EditBusinessOutcomeDialog` component inserts activity logs directly without using the proper hook. We need to update it to:
1. Get the current user from `useAuth`
2. Include `user_id` in the log
3. Include `user_email` in the metadata (like other components do)

**File**: `src/components/EditBusinessOutcomeDialog.tsx`

```typescript
// Add import
import { useAuth } from '@/hooks/useAuth';

// Inside the component
const { user } = useAuth();

// Update the insert call
await supabase.from('activity_logs').insert({
  user_id: user?.id,  // Add user_id
  action: 'update',
  entity_type: 'org_objective',
  entity_id: orgObjectiveId,
  entity_name: 'Business Outcome',
  old_value: currentValue,
  new_value: value || null,
  metadata: {
    user_email: user?.email  // Add user email to metadata
  }
});
```

### Step 2: Update useActivityLog Hook
The `useActivityLog` hook includes `user_id` but doesn't include `user_email` in metadata. We should update it to automatically include the email:

**File**: `src/hooks/useActivityLog.tsx`

```typescript
const logActivity = async (params: LogActivityParams) => {
  if (!user) return;

  try {
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      old_value: params.oldValue,
      new_value: params.newValue,
      metadata: {
        ...params.metadata,
        user_email: user.email  // Always include user email
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
```

### Step 3: Improve Activity Timeline Display
Update the timeline components to show user info from multiple fallback sources:
1. First try `metadata.user_email`
2. Then try joining with `profiles` table using `user_id`
3. Fall back to truncated `user_id` if nothing else

**File**: `src/components/ActivityTimelineMini.tsx`
- Query profiles table to get user names
- Display user name/email even when not in metadata

**File**: `src/components/ActivityTimelineWidget.tsx`
- Same improvements

### Step 4: Fix Existing Log Entry (One-Time Cleanup)
Update the existing log entry that has no user_id to include the correct information:

```sql
UPDATE activity_logs 
SET user_id = 'e14f5073-c078-4405-9821-8811aa565e40',
    metadata = jsonb_build_object('user_email', 'vinayak.kapoor@infosecventures.com')
WHERE entity_name = 'Business Outcome' 
  AND user_id IS NULL;
```

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/EditBusinessOutcomeDialog.tsx` | Add `useAuth`, include `user_id` and `user_email` in activity log |
| `src/hooks/useActivityLog.tsx` | Auto-include `user_email` in metadata for all logged activities |
| `src/components/ActivityTimelineMini.tsx` | Fetch user profiles to display names, improve fallback handling |
| `src/components/ActivityTimelineWidget.tsx` | Same improvements as ActivityTimelineMini |

### Query Enhancement for Displaying User Names

Instead of just fetching activity logs, join with profiles to get user names:

```typescript
const { data, error } = await supabase
  .from('activity_logs')
  .select(`
    *,
    profiles!activity_logs_user_id_fkey (
      full_name,
      email
    )
  `)
  .order('created_at', { ascending: false })
  .limit(limit);
```

Then display:
- `log.profiles?.full_name` (preferred)
- `log.metadata?.user_email` (fallback)
- "Unknown User" only if nothing is available

---

## Expected Outcomes

After implementation:
- All new activity logs will include the user's email in metadata
- Activity timelines will show the user's name or email
- Existing orphaned log entries will be fixed
- "Unknown User" will only appear if truly no user info exists
