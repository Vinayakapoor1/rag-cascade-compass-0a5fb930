

# CSM-Filtered Customer x Feature Matrix

## Overview
Filter the Feature Matrix so each Customer Success Manager only sees customers assigned to them, and each customer row only shows features that are mapped to that customer.

## Current State
- The `customers` table has a `csm_id` field linking each customer to a CSM (77 out of 78 customers have a CSM assigned)
- There are 11 CSMs in the `csms` table
- The `csms` table currently has no `email` or `user_id` column to link CSMs to logged-in users
- The matrix currently shows all customers and uses "--" for unmapped feature cells

## What Changes

### 1. Link CSMs to User Accounts

Add a `user_id` column to the `csms` table so the system knows which logged-in user is which CSM.

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | References auth user, nullable until mapped |

You mentioned you will provide this mapping data later, so the column will be created now but left empty. Once mapped, the matrix will automatically filter.

### 2. Filter Customers by Logged-In CSM

When a CSM logs in, the matrix will:
- Look up their `csm_id` from the `csms` table using their `auth.uid()`
- Only fetch customers where `customers.csm_id` matches
- If no CSM match is found (e.g., admin users), show all customers (fallback to current behavior)

### 3. Feature Columns Per Customer

Currently, unmapped customer-feature cells show "--". The matrix already handles this correctly -- cells are only editable where the customer uses that feature. No column hiding is needed since different customers within the same KPI section may use different features, so all linked feature columns must remain visible.

## Files to Modify
- **Database migration**: Add `user_id` column to `csms` table
- **`src/components/user/CSMDataEntryMatrix.tsx`**: Add CSM lookup and customer filtering logic

## Technical Details

```text
Login (auth.uid()) --> csms.user_id --> csm_id --> customers.csm_id --> filtered customer list
```

The filtering happens at the data fetch level: after determining the logged-in user's `csm_id`, the query for customers is scoped to only those assigned to that CSM. Admin users bypass this filter and see all customers.

## Next Steps After Implementation
- You will provide the CSM-to-user mapping data (which auth user corresponds to which CSM)
- Once mapped, each CSM will only see their assigned customers in the matrix
