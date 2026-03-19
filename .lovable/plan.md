

## Plan: Add Operational Health RAG Badge to Customer List Page

### What Changes

The `CustomerWithImpact` type already includes `healthMetricsRAG` and `healthMetricsScore` — they're just not displayed on the customer cards.

### Single File Change

**`src/pages/CustomersPage.tsx`** — In the customer card (around line 631-638), add a second RAG badge for operational health next to the existing "Health" badge:

```
// Current (line 634-638):
<div className="flex flex-col items-center">
  <RAGBadge status={customer.ragStatus} size="md" />
  <span className="text-[10px] text-muted-foreground mt-1">Health</span>
</div>

// Updated — add operational health badge beside it:
<div className="flex flex-col items-center">
  <RAGBadge status={customer.ragStatus} size="md" />
  <span className="text-[10px] text-muted-foreground mt-1">Health</span>
</div>
<div className="flex flex-col items-center">
  <RAGBadge status={customer.healthMetricsRAG} size="md" />
  <span className="text-[10px] text-muted-foreground mt-1">Ops</span>
</div>
```

This adds a compact "Ops" (Operational) RAG dot next to the existing composite "Health" dot, so users can see bugs/promises/NFR health at a glance without clicking into each customer.

### Files Modified
- `src/pages/CustomersPage.tsx` — add one small block (~5 lines)

