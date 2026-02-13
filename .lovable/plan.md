
# Fix CSM Customer Count on Portfolio + Confirm Attachments

## Problem
On the Portfolio page, CSM users (like Abhay) see **all 80 customers** linked to department features instead of only their 3 assigned customers. The customer count query fetches from `customer_features` without filtering by the CSM's assigned customers.

## Changes

### 1. Fix Portfolio customer scoping for CSMs
**File: `src/pages/Portfolio.tsx`**

- Destructure `isCSM` and `csmId` from the existing `useAuth()` call (line 159).
- In the `fetchScopedCustomers` effect (lines 209-226), add a CSM filter:
  - If the user is a CSM (not admin, not department head) and has a `csmId`, query `customer_features` joined with `customers` and filter where `customers.csm_id` equals the CSM's ID.
  - This ensures only customers assigned to the CSM are counted.
- The feature count (`scopedFeatureIds.size`) should also be refined: after identifying the CSM's assigned customers, trace back to only the features those customers use, rather than all features in the department.

### 2. Attachments (already working)
The `CustomerAttachments` component already supports multiple files and links per customer per period. It is rendered inside each `CustomerSectionCard` accordion. No additional changes are needed here -- CSMs and Team Leads can already add multiple files and links.

## Technical Detail

Current problematic query (line 216-219):
```text
supabase.from('customer_features').select('customer_id').in('feature_id', featureIdArr)
```

Fixed approach for CSMs:
```text
supabase.from('customer_features')
  .select('customer_id, customers!inner(csm_id)')
  .in('feature_id', featureIdArr)
  .eq('customers.csm_id', csmId)
```

For admins, department heads, and viewers, the query remains unchanged (no `csm_id` filter).
