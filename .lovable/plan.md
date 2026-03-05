

## Plan: Add Department Member Badge to Role Display

### Problem
The `getRoleBadge` function in `TeamAccessTab.tsx` has no case for `department_member` — it falls through to the `default` case and displays "Viewer", which is incorrect and confusing.

### Change
**File: `src/components/admin/TeamAccessTab.tsx` (lines 241-254)**

Add a `case 'department_member'` to the `getRoleBadge` switch statement, with a distinct badge (e.g., green-tinted with a `Users` icon and label "Dept Member"), placed between `department_head` and `csm` cases.

