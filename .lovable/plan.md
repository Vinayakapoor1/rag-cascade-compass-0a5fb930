

# Add Dynamic Filter Breakdown Stat Cards

## Overview

Add a row of compact stat cards below the existing summary stats that show individual counts for each active filter's values, computed from the currently filtered customer list. This gives at-a-glance visibility into the composition of the filtered results.

## What You'll See

Below the existing 3 summary cards (Total Customers, Customers with KPIs, Unique KPIs Linked), a new section will appear showing breakdowns for each filter dimension:

- **By Tier**: e.g., Tier1: 30, Tier2: 25, Tier3: 28
- **By Status**: e.g., Active: 75, Inactive: 8
- **By Deployment**: e.g., On Prem: 40, Hybrid: 20, Private Cloud: 15
- **By Region**: e.g., India: 50, UAE: 33
- **By Industry**: e.g., Finance: 12, Aviation: 8, BPO/KPO: 6, ...
- **By CSM**: e.g., John: 15, Jane: 20, ...
- **By RAG**: e.g., Green: 40, Amber: 25, Red: 10, Not Set: 8

Each breakdown section will display as a compact card with the category name and individual value counts as small badges/chips, all dynamically updating as filters change.

## Technical Details

### File: `src/pages/CustomersPage.tsx`

1. **Add a new `useMemo` hook** to compute breakdowns from `filteredCustomers`:
   - Count customers per tier, status, deployment type, region, industry, CSM, and RAG status
   - Return as an object of `{ label: string, counts: { name: string, count: number }[] }[]`

2. **Render breakdown cards** in a responsive grid below the existing stats section:
   - Each card shows the dimension name (e.g., "Tiers") and a list of value-count pairs
   - Use compact Badge components for each value
   - Cards only show dimensions that have more than one distinct value in the filtered set

3. **Styling**: Match existing card style with small text and badges for a clean, information-dense layout

