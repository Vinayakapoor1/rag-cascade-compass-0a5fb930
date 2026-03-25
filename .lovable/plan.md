

# Fix: New Departments Not Showing on Dashboard

## Root Cause

The 3 new org objectives (HR/People, Finance, Marketing) were created with `venture_id: null`. All existing org objectives are linked to venture `8ae3e06d-b59e-44c0-8332-f5b259752f6e`. The `useOrgObjectives` hook filters by `venture_id`, so unlinked objectives are excluded from the dashboard.

## Fix

### Step 1 — Database migration to set venture_id on new org objectives

Run a single UPDATE to assign the correct venture_id to the 3 new org objectives:

```sql
UPDATE org_objectives 
SET venture_id = '8ae3e06d-b59e-44c0-8332-f5b259752f6e'
WHERE id IN (
  '453a7cdd-fd53-4a70-a081-4f91c6a22d13',  -- Finance
  'ee346687-42fb-465e-a5a4-9fe8aeea2f48',  -- HR/People
  '6b6b20dc-1b08-4631-8788-5258706cf4d6'   -- Marketing
);
```

### Step 2 — Fix the importer to include venture_id for future runs

Update `src/lib/v5DepartmentImporter.ts` to look up the active venture and pass its ID when creating new org objectives, so this doesn't happen again.

## Files Modified
1. Database migration (UPDATE 3 rows)
2. `src/lib/v5DepartmentImporter.ts` — add venture_id to new org objective inserts

