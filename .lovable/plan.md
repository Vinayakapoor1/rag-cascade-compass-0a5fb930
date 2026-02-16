

# Add "Remove User" Option to Team Access

## Overview
Add a delete button for each user row in the Team Access table, with a confirmation dialog to prevent accidental removal. Removing a user will clean up their role, department access, and CSM link.

## What Changes

**Team Access table** -- each row gets a "Remove" button (trash icon) next to the existing "Edit" button. Clicking it opens a confirmation dialog. On confirm, the user's records are deleted from:
1. `user_roles` (their role assignment)
2. `department_access` (their department permissions)
3. `csms` table (unlink `user_id`/`email` if they were a linked CSM)
4. `profiles` (their profile record)

The user's `auth.users` entry is NOT deleted (that requires admin API access). This removes their application-level access only.

## Technical Details

| File | Change |
|------|--------|
| `src/components/admin/TeamAccessTab.tsx` | Add delete button, confirmation dialog via `AlertDialog`, and `handleRemoveUser` function |

**`handleRemoveUser` logic:**
```
1. Delete from user_roles WHERE user_id = X
2. Delete from department_access WHERE user_id = X
3. Update csms SET user_id = null, email = null WHERE user_id = X
4. Delete from user_2fa WHERE user_id = X
5. Delete from profiles WHERE user_id = X
6. Refresh the user list
```

**UI changes:**
- Add a red trash icon button next to the Edit button in each row
- Use an `AlertDialog` for delete confirmation showing the user's email
- Show a success/error toast after the operation

**No database changes needed** -- existing RLS policies already allow admins to manage `user_roles`, `department_access`, and `profiles` (via `is_admin` checks or authenticated user policies).

