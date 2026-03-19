

# Fix: 2FA Reset Not Showing New QR Code

## Problem
When an admin resets a user's 2FA (deletes the `user_2fa` record), the user should see a new QR code on next login. The login flow in `Auth.tsx` correctly detects no 2FA record and navigates to `/auth/verify-2fa?uid=...&setup=true`. However, the `setup-2fa` edge function uses `supabase.auth.getClaims(token)` which does not exist in the Supabase JS client v2, causing the function to fail silently with a 401 error. The QR code never appears.

## Root Cause
`supabase/functions/setup-2fa/index.ts` line 44-49: `getClaims()` is not a valid method on the Supabase JS v2 auth client. This causes every call to the setup function to return "Unauthorized".

## Fix

**File: `supabase/functions/setup-2fa/index.ts`**
- Replace `getClaims(token)` with `getUser(token)` which is the correct v2 method
- Extract `userId` and `email` from the user object instead of claims

The corrected auth block:
```typescript
const { data: userData, error: userError } = await supabase.auth.getUser(token);
if (userError || !userData?.user) {
  return unauthorized response;
}
const userId = userData.user.id;
const userEmail = userData.user.email || "user";
```

No other files need changes — the login flow, reset logic, and `Verify2FA.tsx` page are all correct. The only blocker is the broken edge function.

