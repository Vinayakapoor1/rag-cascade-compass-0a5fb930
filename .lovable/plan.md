
# Multi-Feature Enhancement Plan

## Summary of Changes

This plan addresses the following issues and enhancements:

1. **Dashboard Org Objective Cards**: No issue found - the 0% cards are displaying correctly with empty progress bars
2. **Department Detail Cards**: Remove extra text labels from KR and KPI cards
3. **Customers Page**: Dynamic stats, colored status badges, RAG status, logo support, and deployment type filtering

---

## Part 1: Remove Text Labels from Department Cards

**Files to modify:** `src/pages/DepartmentDetail.tsx`

### Changes to KRStatBlock (Line 419)
Remove the "X KPIs" text label from Key Result cards:
- **Current:** Shows `{kpiCount} KPIs`
- **Updated:** Remove this line entirely

### Changes to IndicatorStatBlock (Lines 472-487)
Remove the detailed text showing values and tier from KPI cards:
- **Current:** Shows `{current} / {target} {unit} • {tier} • {timestamp}`
- **Updated:** Remove this line entirely - the progress bar and percentage already communicate the status

This simplifies the cards to show only:
- Icon + Name + Info button
- RAG Badge + Percentage
- Progress bar

---

## Part 2: Customers Page Enhancements

### 2A. Dynamic Stats Based on Filtering

**File:** `src/pages/CustomersPage.tsx`

**Current behavior:** Summary stats use all customers regardless of filters
```tsx
const stats = useMemo(() => {
    if (!customers) return { ... };
    // Uses 'customers', not 'filteredCustomers'
});
```

**New behavior:** Stats will recalculate based on filtered results:
- Total Customers: Count of filtered customers
- Linked to KPIs: Count of filtered customers with KPI links
- Total KPI Links: Sum of KPI links from filtered customers

### 2B. Active = Green, Inactive = Red Status Badges

**File:** `src/pages/CustomersPage.tsx`

Update the status Badge styling:
| Status | Color |
|--------|-------|
| Active | Green (bg-rag-green/10, text-rag-green) |
| Inactive | Red (bg-red-500/10, text-red-600) |
| Prospect | Yellow (bg-yellow-500/10, text-yellow-600) |

### 2C. Add RAG Status for Each Customer

**Approach:** Calculate customer RAG status based on their linked KPI performance

**New hook needed:** Fetch KPI status breakdown for each customer to calculate aggregate RAG

The RAG status will be:
- Based on their linked indicators' performance
- Shows "Not Set" if no KPIs linked
- Displays as a RAG badge on each customer card

### 2D. Customer Logo Support

**Database change:** Add `logo_url` column to `customers` table

**Form change:** Add logo upload field to CustomerFormDialog
- Upload to Supabase Storage
- Display as avatar/icon on customer cards

### 2E. Deployment Type Filter (On Prem / Cloud)

**Database change:** Add `deployment_type` column to `customers` table
- Values: 'On Prem', 'Cloud', 'Hybrid', or null

**UI changes:**
- Add dropdown filter for deployment type
- Add field in CustomerFormDialog
- Display badge on customer cards

---

## Database Migration Required

```sql
-- Add new columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS deployment_type TEXT CHECK (deployment_type IN ('On Prem', 'Cloud', 'Hybrid'));
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DepartmentDetail.tsx` | Remove text labels from KRStatBlock and IndicatorStatBlock |
| `src/pages/CustomersPage.tsx` | Dynamic stats, colored badges, RAG status, logo display, deployment filter |
| `src/components/CustomerFormDialog.tsx` | Add logo upload, deployment type field |
| `src/hooks/useCustomerImpact.tsx` | Add RAG status calculation per customer |

---

## Technical Implementation Details

### 1. KRStatBlock Simplification
```tsx
// Remove this line (around line 419):
<span className="text-xs text-muted-foreground">{kpiCount} KPIs</span>
```

### 2. IndicatorStatBlock Simplification
```tsx
// Remove lines 472-487 (the entire flex container with value/tier/timestamp)
<div className="flex items-center gap-2 mt-1">
    <span className="text-xs text-muted-foreground">...</span>
    ...
</div>
```

### 3. Dynamic Stats Calculation
```tsx
// Change from using 'customers' to 'filteredCustomers'
const stats = useMemo(() => {
    if (!filteredCustomers) return { total: 0, linked: 0, totalLinks: 0 };
    const linked = filteredCustomers.filter(c => c.linkedIndicatorCount > 0).length;
    const totalLinks = filteredCustomers.reduce((sum, c) => sum + c.linkedIndicatorCount, 0);
    return { total: filteredCustomers.length, linked, totalLinks };
}, [filteredCustomers]);
```

### 4. Status Badge Colors
```tsx
<Badge
    className={cn(
        customer.status === 'Active' && 'bg-rag-green/10 text-rag-green border-rag-green/20',
        customer.status === 'Inactive' && 'bg-red-500/10 text-red-600 border-red-500/20',
        customer.status === 'Prospect' && 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    )}
>
    {customer.status}
</Badge>
```

### 5. Customer RAG Status
Add to `useCustomersWithImpact` hook:
- Fetch all indicator_customer_links with indicator status
- Calculate average RAG for each customer
- Return as part of CustomerWithImpact interface

---

## Result After Implementation

1. **Department cards** will be cleaner with just name, percentage, and progress bar
2. **Customer stats** will update dynamically as filters are applied
3. **Status badges** will use meaningful colors (green for active, red for inactive)
4. **RAG status** will show customer health at a glance
5. **Logo upload** will allow brand identity on customer cards
6. **Deployment filter** will enable filtering by On Prem vs Cloud
