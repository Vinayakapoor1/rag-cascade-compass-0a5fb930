
# Enable Password Manager Support (Apple Keychain, 1Password, etc.)

## Problem
The current login/signup form inputs lack the proper `autocomplete` attributes that password managers (Apple Keychain, 1Password, Google Password Manager, etc.) use to detect credential fields. Without these, password managers can't offer to save, autofill, or generate strong passwords.

## Solution
Add standard `autocomplete` attributes to the form inputs and wrap the form with a proper `name` attribute. This is a small but important change that tells browsers and password managers exactly what each field is for.

## Changes

**File: `src/pages/Auth.tsx`**

1. **Add `name` attribute to the `<form>` element** -- helps password managers identify it as a credential form

2. **Add `autoComplete` to the Full Name input:**
   - `autoComplete="name"`

3. **Add `autoComplete` to the Email input:**
   - `autoComplete="email"` (for login)
   - `autoComplete="email"` (for signup -- same value)

4. **Add `autoComplete` to the Password input:**
   - `autoComplete="current-password"` when logging in
   - `autoComplete="new-password"` when signing up -- this is the key attribute that triggers password managers to **suggest a strong password**

5. **Add `name` attributes to inputs** (`name="email"`, `name="password"`, `name="fullName"`) -- some password managers rely on `name` in addition to `autocomplete`

## What this enables
- Apple Keychain will offer to generate and save a strong password on signup
- 1Password, Bitwarden, Google Password Manager, etc. will detect the fields correctly
- Autofill will work properly on both login and signup forms
- No changes to password validation logic -- generated passwords from these tools easily meet the 10+ character complex password requirement
