

# Wire Up CSMComplianceWidget to Dashboard

## Problem
The `CSMComplianceWidget` component exists and has been updated with "Last updated" timestamps, but it is not imported or rendered anywhere in the app. The compliance report page at `/compliance-report` works, but the quick-glance widget on the dashboard is invisible.

## Proposed Change

Add the `CSMComplianceWidget` to the **Index (home) page** so that logged-in admin users can see CSM compliance status at a glance without navigating away.

### File: `src/pages/Index.tsx`

- Import `CSMComplianceWidget` from `@/components/CSMComplianceWidget`
- Render it just above the Activity Timeline section, visible only to logged-in users (ideally admins only)
- It will show as a compact collapsible card with compliance status, pending CSM count, and last-updated timestamp

### Placement

The widget will appear after the login prompt / team leader guide section and before the Activity Timeline, like this:

```
[Stats Overview cards]
[Login prompt / Team Leader guide]
[CSM Compliance Widget]  <-- NEW
[Activity Timeline + side widgets]
[Org Objectives list]
```

Only shown to logged-in users (admin check optional -- can show to all authenticated users since the data is read-only).

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Import and render `CSMComplianceWidget` for logged-in users |

