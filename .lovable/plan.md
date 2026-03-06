

## Problem Found

The indicator name stored in the database contains a **line break** (`Platform\nAvailability %`) while the code checks for `'Platform Availability %'` (no line break). This mismatch means the indicator never matches the `DEPLOYMENT_INDICATOR_NAMES` filter and does not appear in the Deployment sub-section.

## Plan

1. **Fix the database** — Run a migration to clean the indicator name, removing the newline:
   ```sql
   UPDATE indicators SET name = 'Platform Availability %' WHERE id = '182d7aea-4003-4e87-8038-002e42e2f53d';
   ```

2. **Defensive code fix** — Update the name-matching logic in `CSMDataEntryMatrix.tsx` to trim/normalize whitespace when comparing indicator names against the `DEPLOYMENT_INDICATOR_NAMES` arrays, preventing similar issues in the future.

No other changes needed — once the name matches, the existing Deployment sub-section code will automatically include it.

