

# Enhanced Authentication Security Plan

## Overview
Port three key security features from your existing PHP/Vue system into the KlaRity React application:
1. **Login attempt limiting** -- block after repeated failed attempts (15-minute coolout)
2. **Two-Factor Authentication (2FA)** -- TOTP-based verification (Google Authenticator compatible)
3. **Google reCAPTCHA** -- bot protection on login and signup forms

---

## Feature 1: Login Attempt Limiting

**How it works**: Track failed login attempts per email. After 5 consecutive failures, block that email for 15 minutes.

- Create a `login_attempts` database table to store: email, attempt timestamp, success flag
- Create a backend function (`check-login-attempts`) that:
  - Counts failed attempts in the last 15 minutes for a given email
  - Returns whether the user is blocked
  - Logs each attempt (success or failure)
- Update the Auth page to:
  - Call the backend function before attempting login
  - Show a "blocked" message with remaining lockout time if too many failures
  - Log successful logins to reset the counter

---

## Feature 2: Two-Factor Authentication (2FA)

**How it works**: After successful password login, users with 2FA enabled must enter a 6-digit TOTP code from an authenticator app (Google Authenticator, Authy, etc.).

- Create a `user_2fa` database table: user_id, secret (encrypted), is_enabled, created_at
- Create backend functions:
  - `setup-2fa`: Generates a TOTP secret and QR code URL for the user to scan
  - `verify-2fa`: Validates the 6-digit code against the stored secret
- Create a new **2FA verification page** (`/auth/verify-2fa`) showing:
  - QR code on first-time setup (scan with authenticator app)
  - 6-digit OTP input field (using the existing InputOTP component)
  - Verify button
- Update the login flow:
  - After successful password authentication, check if 2FA is enabled for the user
  - If enabled, redirect to the verification page instead of the dashboard
  - Only grant full session access after 2FA verification
- Add a **2FA settings section** in user profile (or admin panel) to enable/disable 2FA per user

---

## Feature 3: Google reCAPTCHA

**How it works**: Add invisible reCAPTCHA v3 (or v2 checkbox) to login and signup forms to prevent bot attacks.

- This requires a Google reCAPTCHA site key (public, stored in code) and secret key (stored as a backend secret)
- Add the reCAPTCHA script to the login/signup page
- On form submit, obtain a captcha token client-side
- Send the token to a backend function (`verify-captcha`) that validates it with Google's API
- Only proceed with login/signup if captcha verification passes

---

## Technical Details

### Database Changes

```text
New table: login_attempts
+------------------+---------------------------+
| Column           | Type                      |
+------------------+---------------------------+
| id               | uuid (PK, auto)           |
| email            | text (not null)            |
| attempted_at     | timestamptz (default now) |
| success          | boolean (default false)   |
| ip_fingerprint   | text (nullable)           |
+------------------+---------------------------+

New table: user_2fa
+------------------+---------------------------+
| Column           | Type                      |
+------------------+---------------------------+
| id               | uuid (PK, auto)           |
| user_id          | uuid (not null, unique)   |
| totp_secret      | text (encrypted)          |
| is_enabled       | boolean (default false)   |
| created_at       | timestamptz (default now) |
+------------------+---------------------------+
```

RLS policies:
- `login_attempts`: Insert allowed for anon (pre-auth), select restricted to backend functions
- `user_2fa`: Users can only read/update their own row; admins can view all

### New Backend Functions

1. **`check-login-attempts`** -- Called before login; checks if email is blocked
2. **`log-login-attempt`** -- Records each login attempt (success/failure)
3. **`setup-2fa`** -- Generates TOTP secret + QR code data URL using a TOTP library
4. **`verify-2fa`** -- Validates the 6-digit code, returns success/failure
5. **`verify-captcha`** -- Validates reCAPTCHA token with Google API

### Frontend Changes

1. **`src/pages/Auth.tsx`** -- Add reCAPTCHA integration, login attempt checking, and post-login 2FA redirect
2. **New: `src/pages/Verify2FA.tsx`** -- 2FA verification page with QR code display and OTP input
3. **`src/App.tsx`** -- Add route for `/auth/verify-2fa`
4. **`src/hooks/useAuth.tsx`** -- Add 2FA status to auth context

### Implementation Order

1. Login attempt limiting (least complex, immediate security value)
2. reCAPTCHA integration (requires Google reCAPTCHA keys from you)
3. Two-Factor Authentication (most complex, requires TOTP library in backend function)

