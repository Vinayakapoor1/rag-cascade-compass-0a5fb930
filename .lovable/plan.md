

# Reposition Ops Health Filters and Add Customer Border Colors

## Changes to `src/pages/CustomersPage.tsx`

### 1. Move Ops Health filter cards below the breakdown stats
Currently the order is: Summary Stats → Ops Health Cards → Filter Breakdowns → Dropdown Filters → Customer List.
New order: Summary Stats → Filter Breakdowns → **Ops Health Cards (smaller)** → Dropdown Filters → Customer List.

### 2. Make Ops Health cards smaller
- Reduce padding from `p-4` to `p-2.5`
- Reduce number font from `text-2xl` to `text-lg`
- Reduce icon size from `h-5 w-5` to `h-4 w-4`
- This makes them feel like filter chips rather than stat cards

### 3. Add ops health colored border to each customer card
On each customer card (line ~585), apply a left-4 border + subtle ring based on `customer.opsWorstRAG`:
- **Green**: `border-l-4 border-l-rag-green`
- **Amber**: `border-l-4 border-l-rag-amber`
- **Red**: `border-l-4 border-l-rag-red`
- **Not set**: default border (no colored accent)

This gives an instant visual indicator of each customer's ops health status without needing to filter.

## Files Modified
1. **`src/pages/CustomersPage.tsx`** — Reorder sections, shrink ops health cards, add colored border to customer cards

