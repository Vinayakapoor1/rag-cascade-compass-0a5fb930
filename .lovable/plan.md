

# Customer Page Enhancements: Trending Graph and Feature Hover

## 1. Add a KPI Trending Mini-Graph on Customer Cards

### What it does
Each customer card on the Customers page will show a small sparkline/trend chart next to the Health badge. This chart will visualize the customer's KPI health trend over time based on `indicator_history` data for their linked indicators.

### Current data situation
The `indicator_history` and `indicator_customer_links` tables are currently empty, so the graph will show a "No data" placeholder until team leaders start entering KPI data. Once data flows in, the chart will automatically render trends.

### How it works
- For each customer, fetch the last 6 periods of `indicator_history` data for their linked indicators (via `indicator_customer_links`)
- Calculate an aggregate health score per period (average of current/target ratios)
- Render a tiny Recharts `<Sparkline>` (LineChart with no axes, ~80x32px) showing the trend
- Color the line based on the latest RAG status (green/amber/red)
- When no history data exists, show a subtle "No trend data" text

### File changes
- **`src/hooks/useCustomerImpact.tsx`**: Add trend data fetching to `fetchCustomersWithImpact` - query `indicator_history` joined with `indicator_customer_links` to get per-period aggregate scores
- **`src/pages/CustomersPage.tsx`**: Add a mini sparkline chart between the Health badge and KPIs count on each customer card row

---

## 2. Show Features as Hoverable Badges on Customer Cards

### What it does
As shown in the screenshots, feature badges (e.g., "VCRO", "ANNOUNCEMENT", "CUSTOM CONTENT", "+7 more") will appear on each customer card. When hovering over the "+N more" badge, a popover/tooltip will show the full list of features.

### Current state
Features are already fetched and displayed on customer cards (lines 297-311 in CustomersPage.tsx), showing up to 3 badges with a "+N more" count. However, there is no hover behavior on the "+N more" to reveal the full list.

### Changes
- **`src/pages/CustomersPage.tsx`**: 
  - Wrap the "+N more" badge in a `HoverCard` component that displays the complete list of features on hover
  - Style feature badges with uppercase text and darker backgrounds to match the screenshot reference (dark pill-style badges)
  - The hover popover will show a grid/list of all remaining feature names

### Technical detail
```tsx
// "+N more" badge wrapped in HoverCard
<HoverCard>
  <HoverCardTrigger asChild>
    <Badge variant="secondary" className="text-xs cursor-pointer">
      +{features.length - 3} more
    </Badge>
  </HoverCardTrigger>
  <HoverCardContent className="w-64">
    <div className="flex flex-wrap gap-1.5">
      {features.slice(3).map(f => (
        <Badge key={f.id} variant="secondary">{f.name}</Badge>
      ))}
    </div>
  </HoverCardContent>
</HoverCard>
```

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/hooks/useCustomerImpact.tsx` | Add trend data (last 6 periods) to `CustomerWithImpact` interface and fetcher |
| `src/pages/CustomersPage.tsx` | Add mini sparkline chart per customer card; wrap "+N more" features badge in HoverCard for full feature list on hover |
