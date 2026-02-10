

# Show CSM Names and Ensure Dynamic KPI Data on Customers Page

## What Changes

### 1. Show CSM Name on Each Customer Card
Each customer has a `csm_id` foreign key linking to the `csms` table. Currently the Customers page doesn't fetch or display the CSM name. We'll add it as a small label on each customer card (e.g., "CSM: John Doe" next to region/industry).

### 2. Confirm KPI Counts Are Dynamic
The "Linked to KPIs" and "Total KPI Links" summary stats are already dynamically calculated from the `indicator_customer_links` table -- no mock data. The per-customer KPI count shown on the right side of each card is also live. No changes needed here, but we'll make sure the summary cards reflect filtered results (they already do).

## Technical Changes

### File: `src/hooks/useCustomerImpact.tsx`

**Add `csmName` to the `CustomerWithImpact` interface and fetch it:**
- Update the customer query to also fetch `csm_id`
- Fetch all CSMs from the `csms` table in parallel
- Map `csm_id` to CSM name for each customer
- Add `csmName: string | null` to the returned data

### File: `src/pages/CustomersPage.tsx`

**Display CSM name on each customer card:**
- Show a small "CSM: [Name]" label in the metadata row (next to region and industry)
- If no CSM is assigned, skip the label

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useCustomerImpact.tsx` | Add `csmName` field, fetch CSMs, join by `csm_id` |
| `src/pages/CustomersPage.tsx` | Display `customer.csmName` on each card |

