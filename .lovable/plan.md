

# Fix: 2 Missing Customers (CCED and Viresec)

## Root Cause

The database has two CHECK constraints that reject values from your Excel file:

1. **`customers_tier_check`** -- only allows `Tier1`, `Tier2`, `Tier3`. Your file has "Unassigned" (CCED's tier), which the importer now correctly preserves but the database rejects.

2. **`customers_deployment_type_check`** -- only allows `On Prem`, `Cloud`, `Hybrid`. Your file has `India Cloud`, `UAE Cloud`, `Private Cloud`, etc. These silently fail, causing the column to be NULL for existing records (updated via prior imports), but for brand-new customers like CCED and Viresec, the entire INSERT is rejected.

This is why 80 of 82 customers exist: the other 80 were likely imported before these constraints existed, or their updates partially succeeded. CCED and Viresec are new and fail on insert.

## Fix

### 1. Database Migration -- Relax CHECK Constraints

Update both constraints to allow real-world values:

| Constraint | Current Values | New Values |
|---|---|---|
| `customers_tier_check` | Tier1, Tier2, Tier3 | Tier1, Tier2, Tier3, **Unassigned** |
| `customers_deployment_type_check` | On Prem, Cloud, Hybrid | On Prem, Cloud, Hybrid, **India Cloud**, **UAE Cloud**, **Private Cloud** |

### 2. Code Change -- Normalize Deployment Type in Importer

Update `src/lib/customerExcelImporter.ts` to pass through all deployment type values as-is (they're already clean strings from the Excel). No normalization needed since we're expanding the constraint.

### 3. Backfill Deployment Types

Run an update to set the correct `deployment_type` for existing customers that had it silently nulled out. This will happen automatically on the next re-import of the same Excel file.

## Files Modified

| File | Change |
|---|---|
| **Database migration** | Drop and recreate both CHECK constraints with expanded allowed values |
| `src/lib/customerExcelImporter.ts` | No code change needed -- deployment_type is already passed through as-is |

After this migration, re-importing the same Excel file will successfully import all 82 customers including CCED and Viresec, and backfill deployment types for existing records.

