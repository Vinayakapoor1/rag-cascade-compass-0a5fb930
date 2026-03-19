

# Fix Ops Health Inputs and Remark Layout

## What Changes

### 1. Operational Health — Use Standard Dropdowns

Replace the current free-text numeric inputs with the platform-standard `BandDropdown` (Green/Amber/Red) for 3 of the 4 dimensions. Bug Count stays as a number input since it has a count-based threshold.

**4 Ops Health indicators (down from 5 fields):**
- **Bug Count** — Keep as `<Input type="number">`. Threshold: <5 Green, 5-10 Amber, >10 Red. Store raw count in `bug_count`.
- **Bug SLA** — Replace with `BandDropdown` using `DEFAULT_BANDS`. Store weight (1/0.5/0) in `bug_sla_compliance`.
- **NFR SLA** — Replace with `BandDropdown` using `DEFAULT_BANDS`. Store weight (1/0.5/0) in `new_feature_requests`.
- **Promises Made vs Kept** — Merge the two separate fields (Promises Made + Promises Delivered) into a single `BandDropdown`. Store weight (1/0.5/0) in `promises_made`. Drop `promises_delivered` from the UI (keep column in DB, just stop writing to it).

### 2. Remarks — Separate Column, One Per Indicator

Currently remarks are crammed inside each score cell as a tiny textarea below the dropdown — looks terrible in multi-column layouts.

**New approach:** Add a dedicated "Remarks" column at the end of each indicator row in the matrix table. One clean `Textarea` per indicator row (not per cell). This applies to all 4 rendering modes (standard Feature×KPI, CM direct, ST direct, direct mode).

For Ops Health, add a single consolidated remarks field (already have `notes` column in `customer_health_metrics`).

---

## File Changes

### `src/components/user/CSMDataEntryMatrix.tsx`

**OpsHealthSubSection:**
- Replace Bug SLA, NFR SLA inputs with `BandDropdown` using `DEFAULT_BANDS`
- Merge Promises Made + Delivered into one "Promises" `BandDropdown`
- Keep Bug Count as number input with RAG dot
- Update `onDataChange` signature: `{ bugCount: string; bugSla: string; promises: string; nfrSla: string }`
- Add a `Textarea` for ops notes

**All matrix table modes (4 locations):**
- Remove inline `<textarea>` from inside each score cell
- Add a "Remarks" `<th>` column header
- Add a `<td>` with `<Textarea>` at the end of each indicator row
- The remark key stays the same (`cellKey(ind.id, custId, featId)`) — one remark per indicator per customer per feature

**CustomerSectionCard props:**
- Update `onOpsDataChange` type to match new shape

### `src/hooks/useCustomerHealthMetrics.ts`
- Update `buildHealthSummary` to handle Bug SLA, NFR SLA, and Promises as weight values (1/0.5/0) instead of raw percentages
- Bug Count remains count-based with existing `bugCountRAG`

### `src/components/CustomerHealthMetricsCard.tsx`
- Update dimension display for weight-based values (show "Green"/"Amber"/"Red" instead of raw numbers)

### `src/components/CustomerHealthMetricsForm.tsx`
- Replace numeric inputs for Bug SLA, NFR SLA, Promises with `BandDropdown`-style selectors

---

## Technical Notes

- `DEFAULT_BANDS` already exists with Green(1)/Amber(0.5)/Red(0)
- No database migration needed — existing numeric columns store 1/0.5/0
- The `remark` column in `csm_customer_feature_scores` already stores per-cell remarks; we just move the UI to a separate column
- Ops health notes use the existing `notes` column in `customer_health_metrics`

### Files Modified
1. `src/components/user/CSMDataEntryMatrix.tsx` — bulk of changes
2. `src/hooks/useCustomerHealthMetrics.ts` — scoring logic
3. `src/components/CustomerHealthMetricsCard.tsx` — display
4. `src/components/CustomerHealthMetricsForm.tsx` — form inputs

