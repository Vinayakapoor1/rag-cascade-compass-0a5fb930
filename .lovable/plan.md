

# Unified Save, NFR SLA % Field, and Inline Remarks

## Three Problems to Fix

1. **Two save buttons** — "Save Ops Health" and "Save {customer}" are separate. Merging into one.
2. **New Feature Requests should be a percentage** (NFR SLA Compliance %), scored with the platform-standard threshold (≥76% Green, ≥51% Amber, <51% Red).
3. **Remarks missing** — the Remarks section exists at the bottom but users can't find it. Moving remark textareas inline directly under each score cell in the matrix.

---

## Database Migration

Change `new_feature_requests` from integer to numeric to store a percentage:

```sql
ALTER TABLE customer_health_metrics 
  ALTER COLUMN new_feature_requests TYPE numeric USING new_feature_requests::numeric;
```

---

## File Changes

### 1. `src/hooks/useCustomerHealthMetrics.ts`
- Change `new_feature_requests` type from `number | null` to `number | null` (numeric/percentage)
- Replace `bugCountRAG`/`bugCountScore` for Feature Requests with `pctRAG`/`pctScore` (platform standard)
- Update dimension label from "Feature Requests" to "NFR SLA"
- Update dimension value display to show `%`

### 2. `src/components/user/CSMDataEntryMatrix.tsx`

**Unified Save (merge ops health into per-customer save):**
- Lift ops health state (`bugCount`, `bugSla`, `promisesMade`, `promisesDelivered`, `newFeatureRequests`) from `OpsHealthSubSection` up into `CustomerSectionCard`
- Pass state + setters as props to `OpsHealthSubSection`
- Remove `handleSaveOps` and the "Save Ops Health" button from `OpsHealthSubSection`
- In `doSaveCustomer`, after saving scores, also call `upsertMutation.mutateAsync()` with the ops health data
- The `useUpsertHealthMetric` hook is already imported at line 18

**NFR field change:**
- Rename "New Feature Requests" label to "NFR SLA Compliance %"
- Change input to `type="number" min={0} max={100}` with placeholder "0-100"

**Inline remarks:**
- In the matrix table cells (both standard Feature×KPI matrix and CM/ST/direct modes), add a small `Textarea` directly below each `BandDropdown` — visible only when the cell has a score
- Auto-expand textarea for red scores; collapsed single-line for others
- Remove the separate `RemarksSection` component and its usage

### 3. `src/components/CustomerHealthMetricsCard.tsx`
- Update "Feature Requests" icon mapping to "NFR SLA"

### 4. `src/components/CustomerHealthMetricsForm.tsx`
- Change `new_feature_requests` field from integer to percentage (max 100, label "NFR SLA Compliance %")

---

## Technical Notes

- The `remark` field is already stored in `csm_customer_feature_scores` table and already included in `doSaveCustomer` upserts (line 847: `remark: remarks[key] || null`)
- Remarks state management (`remarks`, `setRemarks`, `originalRemarks`) already exists at the parent level (lines 135-136)
- `onRemarkChange` callback is already wired through to `CustomerSectionCard` (line 1611)
- No new database columns needed for remarks — just a UI relocation

### Files Modified
1. Migration SQL (type change for `new_feature_requests`)
2. `src/hooks/useCustomerHealthMetrics.ts`
3. `src/components/user/CSMDataEntryMatrix.tsx` (bulk of changes)
4. `src/components/CustomerHealthMetricsCard.tsx`
5. `src/components/CustomerHealthMetricsForm.tsx`

