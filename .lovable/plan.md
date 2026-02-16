
# Protect All Routes Behind Authentication and 2FA

## Overview
Currently, all app routes (including Portfolio) are accessible without signing in. This plan adds a route guard that redirects unauthenticated users to `/auth`, and ensures 2FA verification is enforced before granting access.

## Changes

### 1. Create a ProtectedRoute component
**New file: `src/components/ProtectedRoute.tsx`**

- Wraps child routes and checks authentication state from `useAuth()`
- While `loading` is true, shows a spinner
- If no `user`, redirects to `/auth`
- If user exists, checks `user_2fa` table to see if 2FA is enabled
  - If 2FA is enabled and the session hasn't been verified via 2FA yet, redirects to `/auth/verify-2fa`
  - Uses a sessionStorage flag (set after successful 2FA verification) to track whether 2FA was completed in this session
- If all checks pass, renders children

### 2. Update App.tsx routes
- Wrap all `AppLayout` routes with `ProtectedRoute`
- Keep `/auth` and `/auth/verify-2fa` outside the guard (they must remain public)

```
Routes structure:
  /auth              -> public
  /auth/verify-2fa   -> public
  Everything else    -> ProtectedRoute -> AppLayout -> Page
```

### 3. Update Verify2FA page
- After successful 2FA verification, set a sessionStorage flag (e.g., `2fa_verified`) so the ProtectedRoute knows 2FA was completed
- This flag clears automatically when the browser tab/session closes

### 4. Update Auth page redirect
- After successful login, check if the user has 2FA enabled
  - If yes, redirect to `/auth/verify-2fa` (this likely already happens)
  - If no, redirect to `/` (Portfolio)

## What stays the same
- No database changes needed
- No RLS policy changes
- The existing auth flow (login, signup, 2FA setup/verify) remains intact
- AppLayout structure unchanged

## Technical Notes
- Using `sessionStorage` for the 2FA-verified flag ensures it persists across page navigations but clears on tab close, forcing re-verification on new sessions
- The ProtectedRoute component follows standard React Router patterns
