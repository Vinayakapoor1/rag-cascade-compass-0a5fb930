

# Fix: Compliance Report Not Opening from Notifications

## Problem
When you click on a compliance notification (e.g., "1 Compliance Report Available"), it takes you back to the home page instead of opening the Compliance Report. This is because the notification's link is set to `/` instead of `/compliance-report`.

## Root Cause
The backend function that creates compliance notifications (`csm-compliance-check`) sets `link: "/"` for admin notifications instead of `link: "/compliance-report"`.

## Fixes

### 1. Fix notification link in the backend function
**File:** `supabase/functions/csm-compliance-check/index.ts`

Change the notification link from `"/"` to `"/compliance-report"` so clicking the notification takes admins directly to the compliance report page.

### 2. Fix existing notifications in the database
Run a database update to fix all existing compliance notifications that currently point to `/`:

```sql
UPDATE notifications
SET link = '/compliance-report'
WHERE title LIKE '%Compliance Report%'
  AND link = '/';
```

### 3. Fix 1000-row limit on scores query in ComplianceReport
**File:** `src/pages/ComplianceReport.tsx`

The scores query (line ~37) doesn't specify a limit, so it's capped at 1,000 rows by default. With 2,400+ score rows, this causes inaccurate compliance status. Add `.limit(10000)` to the query.

