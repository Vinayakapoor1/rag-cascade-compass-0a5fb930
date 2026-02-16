

# Fix Chrome Password Manager "Suggest Strong Password" Prompt

## Root Causes Identified

1. **Non-standard `autoComplete` values**: The email fields use `autoComplete="username email"` (two values). Chrome expects a single standard value like `"email"` or `"username"`.

2. **`minLength={10}` on signup password**: This HTML attribute can prevent Chrome from offering to generate a password, as Chrome may think it can't meet the constraint or it interferes with its detection heuristic.

3. **Missing `autoComplete="on"` on form**: While present, ensuring the form-level autocomplete is explicitly set helps Chrome's heuristic.

## Changes to `src/pages/Auth.tsx`

### Login form email field (line 267)
- Change `autoComplete="username email"` to `autoComplete="email"`

### Signup form email field (line 325)
- Change `autoComplete="username email"` to `autoComplete="email"`

### Signup form password field (line 346)
- Remove `minLength={10}` (validation is already handled in JavaScript via the `validatePassword` function, so this HTML constraint is redundant and may block Chrome's password suggestion)

## Why This Should Work

Chrome's password manager specifically looks for:
- A form with `method="post"` and `action` (already present)
- An email/username field with `autoComplete="email"` (fixing the double-value)
- A password field with `autoComplete="new-password"` (already present)
- No unusual HTML constraints that might signal a non-standard field (removing `minLength`)

## Technical Note

These are small but targeted changes to how Chrome's heuristic-based password manager detection works. The JavaScript password validation (10+ chars, uppercase, special chars, etc.) remains fully intact -- only the HTML `minLength` attribute is removed since it's redundant with the JS validation.

