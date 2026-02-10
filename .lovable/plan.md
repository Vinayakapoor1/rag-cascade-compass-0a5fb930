

# Update Customer Importer for Your Excel Format

## Problem
Your exported Excel file uses slightly different column headers ("Contact Persons", "Contact Emails", "Created At") that the current importer doesn't recognize, causing those fields to be silently dropped. The tier value "Unassigned" also incorrectly defaults to "Tier1".

## Changes (Single File: `src/lib/customerExcelImporter.ts`)

### 1. Add Missing Column Aliases (line 40-57)
Add these entries to `COLUMN_MAP`:
- `'contact persons'` -> `contactPerson`
- `'contact emails'` -> `email`
- `'created at'` -> new `createdAt` field

### 2. Add `createdAt` to `CustomerRow` Interface (line 4-16)
Add an optional `createdAt: string | null` field so the original creation timestamp from your export is preserved during re-imports.

### 3. Fix `normalizeTier()` to Handle "Unassigned" (line 72-79)
Currently any unrecognized tier falls through to "Tier1". Add a check:
- If tier is `'unassigned'`, return `'Unassigned'` instead of defaulting to Tier1.

### 4. Clean Stale Feature Links on Update (line 319-331)
When updating an existing customer, **delete old `customer_features` rows** before re-linking. This ensures the feature list exactly matches the latest upload rather than accumulating stale links.

Add before the feature linking step:
```
await supabase.from('customer_features').delete().eq('customer_id', existingId);
```

### 5. Pass `created_at` During Import (line 303-315)
Include `created_at` in the `customerData` object when inserting new customers (not on updates, to preserve original dates).

### 6. Update Template to Match Export Format (line 380-420)
Update `generateCustomerTemplate()` headers and sample data to match the actual export column names ("Contact Persons", "Contact Emails") so the template and importer stay in sync.

## No Database Changes Required
The `customers` table already has all needed columns.

