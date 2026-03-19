

# Show Ops Health & Remarks by Default + Replace NFR with New Feature Requests

## Summary

Three changes: (1) Replace "NFR Compliance" with "New Feature Requests" count field in both the database and UI, (2) make the Operational Health and Remarks collapsible sections open by default so users see them immediately, (3) update the health scoring model accordingly.

---

## Part 1 — Database: Replace NFR with New Feature Requests

**Migration**: Rename `nfr_compliance` to `new_feature_requests` (integer count) on `customer_health_metrics`

```sql
ALTER TABLE customer_health_metrics RENAME COLUMN nfr_compliance TO new_feature_requests;
ALTER TABLE customer_health_metrics ALTER COLUMN new_feature_requests TYPE integer USING new_feature_requests::integer;
```

---

## Part 2 — Update Health Scoring Model

**File: `src/hooks/useCustomerHealthMetrics.ts`**
- Rename all references from `nfr_compliance` to `new_feature_requests`
- Change the "NFR Compliance" dimension to "Feature Requests" with count-based scoring (like bug_count — lower is better)
- Update `HealthMetricRow` interface
- Update `buildHealthSummary` to use the new field name and scoring logic

---

## Part 3 — Open Collapsibles by Default

**File: `src/components/user/CSMDataEntryMatrix.tsx`**
- `OpsHealthSubSection`: Change `useState(false)` → `useState(true)` for `opsOpen`, and set `loaded` trigger to fire immediately
- `RemarksSection`: Change `useState(false)` → `useState(true)` for `remarksOpen`
- Rename "NFR Compliance %" label → "New Feature Requests" with `type="number"` (no max=100)
- Update the field state from `nfrCompliance` to `newFeatureRequests` and adjust the save payload

---

## Part 4 — Update Related Components

**File: `src/components/CustomerHealthMetricsCard.tsx`**
- Update dimension icon mapping: replace `'NFR Compliance'` → `'Feature Requests'`

**File: `src/components/CustomerHealthMetricsForm.tsx`** (if exists)
- Update field references

---

## Files Modified
1. **Migration**: rename column `nfr_compliance` → `new_feature_requests` (integer)
2. `src/hooks/useCustomerHealthMetrics.ts` — update interface, scoring, dimension label
3. `src/components/user/CSMDataEntryMatrix.tsx` — open by default, rename NFR field
4. `src/components/CustomerHealthMetricsCard.tsx` — update icon mapping

