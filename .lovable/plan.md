

# Link Customers to KPIs via Features and Make Them Clickable

## Problem
The "Linked to KPIs" and "Total KPI Links" on the Customers page show 0 because they read from the `indicator_customer_links` table which is empty. However, the real relationships exist indirectly:
- **496** customer-feature links (`customer_features`)
- **170** feature-indicator links (`indicator_feature_links`)
- = **780** indirect customer-to-indicator connections

## Solution

### 1. Update `useCustomerImpact.tsx` -- Derive KPI Links via Features

Replace the current query against `indicator_customer_links` with an indirect join through features:

```
customer_features (customer -> feature)
  + indicator_feature_links (feature -> indicator)
  = customer -> indicator relationship
```

**Steps in `fetchCustomersWithImpact()`:**
- Fetch `customer_features` (customer_id, feature_id)
- Fetch `indicator_feature_links` (feature_id, indicator_id)
- Build a map: for each customer, find all indicators reachable through their features
- Use this derived link set for `linkedIndicatorCount`, RAG calculation, and trend data (instead of the empty `indicator_customer_links`)

Also update `fetchCustomerImpact()` (single customer detail) to use the same indirect path so the detail page stays consistent.

### 2. Update `CustomersPage.tsx` -- Make KPI Count Clickable

- Wrap the KPI count number on each customer card in a `Link` to `/customers/{id}` (the detail page already shows the full indicator hierarchy)
- Make the "Linked to KPIs" and "Total KPI Links" summary stat cards clickable/interactive -- clicking scrolls to the customer list below

### 3. Add More Filters to Customers Page

Add these new filter dropdowns alongside existing ones:
- **Region** -- distinct regions from customer data
- **Industry** -- distinct industries from customer data
- **CSM** -- CSM names from customer data
- **RAG Status** -- Green, Amber, Red, Not Set

Update the search to also match CSM names.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useCustomerImpact.tsx` | Derive indicator links via `customer_features` + `indicator_feature_links` instead of empty `indicator_customer_links` (both list and detail functions) |
| `src/pages/CustomersPage.tsx` | Make KPI counts clickable (link to customer detail), add Region/Industry/CSM/RAG filters |

## No Database Changes Required
All the data already exists in `customer_features` and `indicator_feature_links`.
