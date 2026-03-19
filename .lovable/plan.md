

# Add Health/Ops Hover Tooltips + Ops Health Entry on CSM Dashboard

## Summary

Two changes: (1) Wrap the Health and Ops RAG badges on the Customers list page with hover tooltips that explain what drives each score; (2) Add inline operational health fields (Bug Count, Bug SLA, Promises, NFR) inside the CSM data entry matrix so CSMs can fill them per customer.

---

## Part 1 — Hover Tooltips on Customers Page

**File: `src/hooks/useCustomerImpact.tsx`**
- Add `healthDimensions` (array of `{label, value, rag, score}`) and `indicatorScore` to `CustomerWithImpact`
- Populate from `healthSummary.dimensions` and the computed indicator score already calculated at line ~528

**File: `src/pages/CustomersPage.tsx`**
- Import `HealthDimension` type from the health metrics hook
- Wrap the **Health** RAG badge (line 636) in a `HoverCard`:
  - When data exists: show indicator count, average score, breakdown of green/amber/red indicators
  - When no data: explain "Health is derived from linked OKR indicators. No scored indicators yet."
- Wrap the **Ops** RAG badge (line 640) in a `HoverCard`:
  - When data exists: show each dimension (Bug Count, Bug SLA, Promises, NFR) with its value and RAG dot
  - When no data: explain "Operational health is derived from Bug Count, Bug SLA Compliance, Promises Delivery, and NFR Compliance. No data recorded yet — enter via CSM Data Entry."

---

## Part 2 — Ops Health Entry in CSM Data Entry Matrix

**File: `src/components/user/CSMDataEntryMatrix.tsx`**
- Import `useCustomerHealthMetrics` and `useUpsertHealthMetric` from the existing hook
- Inside each customer's `CollapsibleContent` (before the Save button at ~line 2242), add an **"Operational Health"** collapsible sub-section with:
  - Inline fields: Bug Count, Bug SLA %, Promises Made, Promises Delivered, NFR Compliance %
  - Auto-load existing values for the current period
  - A dedicated "Save Ops Health" button that calls the upsert mutation
- This uses the existing `customer_health_metrics` table — no database changes needed

---

## Technical Details

- `HealthDimension` type is already exported from `useCustomerHealthMetrics.ts`
- The `buildHealthSummary` function already computes per-dimension breakdowns
- The `useUpsertHealthMetric` hook handles upsert with `onConflict: 'customer_id,period'`
- No new database tables or migrations required

### Files Modified
1. `src/hooks/useCustomerImpact.tsx` — add `healthDimensions` and `indicatorScore` fields
2. `src/pages/CustomersPage.tsx` — wrap Health/Ops badges in HoverCards with derivation info
3. `src/components/user/CSMDataEntryMatrix.tsx` — add ops health inline entry section per customer

