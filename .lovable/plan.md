

# Fix: Clarify KPI Summary Stats on Customers Page

## What's Happening

The current numbers are technically correct but misleading:
- **"Linked to KPIs" shows 78** -- this counts customers that have at least 1 KPI linked (78 out of 80 customers)
- **"Total KPI Links" shows 780** -- this is the sum of all customer-indicator pairs (78 customers x 10 KPIs = 780)

You expected to see **10** because there are exactly 10 Customer Success KPIs that all customers link to through their features.

## Fix

Replace the current stats with more meaningful metrics:

| Stat Card | Current (Confusing) | New (Clear) |
|-----------|-------------------|-------------|
| Card 1 | "Linked to KPIs: 78" | **"Customers with KPIs: 78"** -- how many customers have at least 1 KPI linked |
| Card 2 | "Total KPI Links: 780" | **"Unique KPIs Linked: 10"** -- how many distinct indicators are linked across all customers |

## Technical Changes

### File: `src/pages/CustomersPage.tsx`

1. Update the `stats` memo to calculate the count of **unique indicators** across all filtered customers (instead of summing pairs)
2. Rename labels: "Customers with KPIs" and "Unique KPIs Linked"

### File: `src/hooks/useCustomerImpact.tsx`

3. Add a `linkedIndicatorIds: string[]` field to `CustomerWithImpact` so the page can compute unique KPIs across customers

| File | Change |
|------|--------|
| `src/hooks/useCustomerImpact.tsx` | Add `linkedIndicatorIds` array to each customer's returned data |
| `src/pages/CustomersPage.tsx` | Compute unique KPI count from indicator IDs, update labels |
