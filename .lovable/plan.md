

## Plan: Reset Ankit Grover's 2FA and Fix Silent Delete Failure

### Step 1 — Delete Ankit Grover's 2FA record
Use the data insert tool to run:
```sql
DELETE FROM user_2fa WHERE user_id = '36441521-a449-4306-8fab-b88b91f4242c';
```
This removes the record so on next login, `check2FARequired` returns `false`, and Auth.tsx navigates to `/auth/verify-2fa?setup=true`, triggering the `setup-2fa` edge function to generate a new QR code.

### Step 2 — Fix the admin reset code to handle errors
In `src/components/admin/TeamAccessTab.tsx` (line 594), the delete call ignores the response. Update to check for errors:
```typescript
const { error } = await supabase.from('user_2fa').delete().eq('user_id', userToReset2FA.id);
if (error) throw error;
```

### Step 3 — Validate the flow
After deletion, Ankit Grover's next login will:
1. Sign in with password successfully
2. `check2FARequired()` finds no `user_2fa` record → returns `false`
3. Navigates to `/auth/verify-2fa?uid=...&setup=true`
4. `setup-2fa` edge function (now fixed with `getUser()`) generates a new TOTP secret and QR code
5. User scans QR, enters code, 2FA is re-activated

### Files Modified
- Database: DELETE from `user_2fa` for Ankit Grover
- `src/components/admin/TeamAccessTab.tsx` — add error handling to delete call

