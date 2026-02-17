

# Fix Chrome "Suggest Strong Password" - Aggressive Approach

## Remaining Issues Found

1. **`minLength={1}` on login password field** (line 288): Any `minLength` attribute can interfere with Chrome's heuristic. This should be removed.

2. **Bullet character placeholder `"••••••••"`**: Chrome's password field detection can be thrown off by non-ASCII placeholder characters. Standard practice is to use plain ASCII dots or a simple text placeholder like `"Enter your password"`.

3. **React controlled `value` + aggressive `onChange` validation**: When the signup password field runs validation on every keystroke (via `handlePasswordChange`), it can interfere with Chrome injecting a generated password. The fix is to delay validation so Chrome can fill the field first.

4. **Missing `name="new-password"` on signup**: Chrome also checks the `name` attribute -- having `name="password"` on both login AND signup forms is ambiguous. The signup field should use `name="new-password"`.

## Changes to `src/pages/Auth.tsx`

### 1. Login password field (around line 278-290)
- Remove `minLength={1}`
- Change placeholder from `"••••••••"` to `"Enter your password"`

### 2. Signup password field (around line 336-346)
- Change `name="password"` to `name="new-password"`
- Change placeholder from `"••••••••"` to `"Create a password"`

### 3. Both email fields
- Change placeholder from `"you@example.com"` to `"Enter your email"` (some heuristics penalize placeholder patterns that look like actual values)

### 4. Debounce password validation
- Move the validation call in `handlePasswordChange` to a `useEffect` with a short delay, so Chrome has a window to inject the generated password before React state updates interfere

## Why These Changes Matter

Chrome's password manager uses a multi-signal heuristic that combines:
- Field `name` attribute (strong signal)
- Field `type` and `autoComplete` (already correct)
- `placeholder` content (weak signal but can disqualify)
- HTML constraints like `minLength` (can block suggestion)
- Whether the field appears "writable" without JS interference

The combination of these small fixes should cross the threshold for Chrome to offer password generation.

## Important Prerequisite Check

Before publishing, please verify in Chrome:
1. You are signed into Chrome with a Google account
2. Settings > Passwords > "Offer to save passwords" is ON
3. Settings > Passwords > "Suggest strong passwords" is ON (this is sometimes a sub-toggle)

These must be enabled for Chrome to offer password suggestions on any website.

