

# Add Ops Health RAG Filtering to Customers Page

## Three Critiques of the Approach

**Critique 1 — Worst-child vs current average scoring.**
The current `buildHealthSummary` in `useCustomerHealthMetrics.ts` averages the four ops dimensions to produce a composite RAG. The user wants "worst child" logic: if ANY dimension is red, the whole customer is red. This is a fundamental scoring change. The fix is straightforward — compute ops RAG as `min(all dimension weights)` instead of averaging, but it changes the meaning of the existing `healthMetricsRAG` and `compositeRAG` fields used elsewhere (e.g. the `CustomerHealthMetricsCard`). The safest approach is to add a **new** `opsWorstRAG` field on `CustomerWithImpact` rather than breaking existing composite logic.

**Critique 2 — Customers with no ops health data.**
Many customers may have zero ops health entries. Under worst-child logic, should they appear as "Not Set" (a 4th category), or be hidden from the filter entirely? Showing them as "Not Set" is the correct default — it preserves visibility while making clear that data is missing. The filter cards should show 4 states: On Track (green), At Risk (amber), Critical (red), Not Set.

**Critique 3 — Cascading filter interaction with existing RAG filter.**
The page already has a `ragFilter` dropdown that filters by the composite indicator+ops RAG status. Adding a separate Ops Health filter creates two RAG-like filters. The cleanest UX: replace the current generic "RAG Status" dropdown with prominent **Ops Health status cards** at the top (like the Portfolio page), and keep the existing RAG dropdown for indicator health. This avoids confusion about "which RAG" is being filtered.

---

## Implementation Plan

### 1. Add worst-child ops RAG to the data layer

**File: `src/hooks/useCustomerImpact.tsx`**

In the `fetchCustomersWithImpact` function (around line 536-546), after building `healthSummary`, compute a new `opsWorstRAG` field:
- Look at all non-null dimensions from `healthSummary.dimensions`
- If any dimension is `red` → red. Else if any is `amber` → amber. Else if all are `green` → green. Else → `not-set`
- Add `opsWorstRAG: RAGStatus` to the `CustomerWithImpact` interface and the return object

### 2. Add Ops Health filter cards to the Customers page

**File: `src/pages/CustomersPage.tsx`**

- Add a new state: `opsHealthFilter` (values: `'all' | 'green' | 'amber' | 'red' | 'not-set'`)
- Render 4 clickable summary cards below the header stats (similar to Portfolio): **On Track**, **At Risk**, **Critical**, **Not Set** — each showing the count of customers in that ops health bucket
- Clicking a card sets `opsHealthFilter`; clicking the active card resets to `'all'`
- Integrate `opsHealthFilter` into the existing `filterExcluding` function so all downstream filters (tier, region, CSM, industry, deployment, status) only show options relevant to the ops-health-filtered set
- The existing `ragFilter` dropdown continues to work independently for indicator-based RAG

### 3. No database changes, no new tables

All data already exists in `customer_health_metrics`. The change is purely in how the composite is calculated (worst-child vs average) and how filters interact.

## Files Modified

1. **`src/hooks/useCustomerImpact.tsx`** — Add `opsWorstRAG` field to `CustomerWithImpact`
2. **`src/pages/CustomersPage.tsx`** — Add ops health filter cards and integrate into cascading filter logic

