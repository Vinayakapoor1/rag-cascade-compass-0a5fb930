

# Fix CSM Department Filtering

## Problem

When a CSM logs in and navigates to the data entry page, they see **all departments** (e.g., Finance, HR, Customer Success, etc.) instead of only the department(s) relevant to their assigned customers. This is because the `fetchDepartments` function in `CSMDataEntry.tsx` runs an unfiltered query on the `departments` table.

## Solution

For CSM users (non-admin), filter the departments by tracing the CSM's assigned customers through to their linked department:

```
CSM (user_id) -> csms table (csm_id) -> customers (csm_id) -> customer_features -> indicator_feature_links -> indicators -> key_results -> functional_objectives -> departments
```

Since this chain is complex, a simpler and more reliable approach is:
1. Look up the CSM's `id` from the `csms` table using `user_id`
2. Find all customers assigned to that CSM
3. Find all features those customers use (via `customer_features`)
4. Find all indicators linked to those features (via `indicator_feature_links`)
5. Trace those indicators back to departments (via `key_results` and `functional_objectives`)
6. Show only those departments

However, given that the current system focuses on **Customer Success** as the primary department, and CSMs are inherently part of the Customer Success function, a practical approach is to filter departments to only those that have indicators linked to features used by the CSM's customers.

## File Changes

### `src/pages/CSMDataEntry.tsx`

Update `fetchDepartments` to filter for CSM users:

- If the user is a CSM (not admin), use `csmId` from auth context to:
  1. Query `customers` where `csm_id` matches
  2. Query `customer_features` for those customers
  3. Query `indicator_feature_links` for those features
  4. Query `indicators` for those indicator IDs, then `key_results`, then `functional_objectives` to get `department_id`s
  5. Query `departments` filtered to only those IDs
- If the user is an admin, show all departments (current behavior)
- Auto-select the first (and likely only) department

This ensures the CSM sees only "Customer Success" (or whichever department their customers' features map to), and can immediately start entering data without confusion.

