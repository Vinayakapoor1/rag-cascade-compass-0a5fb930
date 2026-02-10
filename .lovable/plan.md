

# Restore Correct Deployment Types from Excel Re-upload

## Problem

The bulk migration set all 61 customers with NULL deployment_type to generic "Cloud". The user says the original Excel upload contained specific deployment types (India Cloud, UAE Cloud, Private Cloud, etc.), but those values were either not imported or were already NULL before the migration.

## Solution

Since the customer Excel importer already supports the "Deployment Type" column and performs upserts (updates existing customers by name), the simplest and most accurate fix is:

1. **User re-uploads** the customer Excel file that contains the correct deployment types per customer
2. The existing importer (`customerExcelImporter.ts`) will match customers by name and update their `deployment_type` to the correct specific values

No code changes are needed -- the importer already handles this correctly (maps "Deployment Type" and "Deployment" columns to `deployment_type`).

## Steps

1. Navigate to the Admin Upload page
2. Upload the customer Excel file (the one with the correct deployment types)
3. Preview and confirm the import -- existing customers will be updated with their correct deployment types

## Why This Is Better Than Manual SQL

- The Excel file is the source of truth for which customer has which deployment type
- The importer already handles matching by company name and updating fields
- No risk of guessing wrong deployment types based on region

## Alternative (if re-upload isn't possible)

If the Excel file is no longer available, we could write a region-based mapping (e.g., India region -> India Cloud, Middle East -> UAE Cloud), but this would be a guess and may not match the actual data. The user would need to confirm the mapping rules.

