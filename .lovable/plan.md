
# Fix 2FA QR Code Scanning Issue

## Problem
The QR code for 2FA setup is not scanning in authenticator apps. Two root causes:

1. **External QR API dependency**: The QR code is generated via `api.qrserver.com`, which can be unreliable, slow, or blocked by firewalls/content policies. The image may also render poorly at the 200x200 size.

2. **Short TOTP secret**: The secret is only 20 base32 characters (100 bits of entropy). RFC 4226 recommends a minimum of 160 bits (32 base32 characters). Some authenticator apps may reject shorter secrets.

## Solution

### 1. Generate QR codes client-side
- Install `qrcode.react` npm package to render QR codes directly in the browser
- Remove dependency on external `api.qrserver.com` API
- The `setup-2fa` edge function will return only the `secret` and `otpauth_url` (no more `qr_url`)

### 2. Increase TOTP secret length
- Update `generateSecret()` in `setup-2fa` edge function to generate 32 characters (160 bits) instead of 20

### 3. Update the Verify2FA page
- Replace the `<img src={qrUrl}>` with a `<QRCodeSVG>` component from `qrcode.react`
- Render the QR code using the `otpauth_url` directly
- Larger QR code (256x256) for better scanning

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/setup-2fa/index.ts` | Increase secret to 32 chars, remove `qr_url` from response |
| `src/pages/Verify2FA.tsx` | Replace external QR image with `QRCodeSVG` component |
| `package.json` | Add `qrcode.react` dependency |

## Technical Details

**Edge function change** (`setup-2fa/index.ts`):
- `generateSecret(32)` instead of `generateSecret(20)`
- Response returns `{ secret, otpauth_url }` without `qr_url`

**Frontend change** (`Verify2FA.tsx`):
- Replace `<img src={qrUrl}>` with `<QRCodeSVG value={otpauthUrl} size={256} />`
- Remove `qrUrl` state, keep `otpauthUrl` state for the otpauth URL
- Import `QRCodeSVG` from `qrcode.react`
