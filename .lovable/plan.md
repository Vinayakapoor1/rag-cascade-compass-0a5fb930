

# Remarks for Red Scores + Enhanced Compliance Reporting + Audit Trail in Admin Dashboard

## Summary

Three interconnected changes:
1. Add a free-text "remark" field on every score entry (especially when marked red) explaining the reasoning
2. Surface those remarks in the compliance report with full per-customer, per-department parameter breakdown
3. Restructure the Admin Dashboard to include both the Activity Timeline (audit trail) and a "Reports" tab linking to compliance details

---

## Part 1 — Remarks on Score Entries

**Database Migration**: Add a `remark` column to `csm_customer_feature_scores`
```sql
ALTER TABLE csm_customer_feature_scores ADD COLUMN remark text;
```

**File: `src/components/user/CSMDataEntryMatrix.tsx`**
- Add a `remarkMap` state (`Record<string, string>`) parallel to the existing `scores` state
- After each score dropdown (BandDropdown), show a text input row that expands when the score is "red" (auto-expand) but is always available for any score
- Persist remarks alongside scores in the upsert call (add `remark` field to the upsert payload)
- Load existing remarks when hydrating scores from the database

---

## Part 2 — Compliance Report Enhancement

**File: `src/components/compliance/ComplianceCustomerDetail.tsx`**
- Fetch and display remarks alongside each feature/indicator row
- Show the remark text in a muted italic style below the indicator status
- Query `csm_customer_feature_scores` with `remark` field included

**File: `src/pages/ComplianceReport.tsx`**
- Add a new "Department Breakdown" tab showing per-department, per-parameter fill status across all customers
- Include department-level queries for indicators, key results, and functional objectives to show which parameters each department has filled
- Show remarks log: a filterable list of all remarks (especially red-flagged ones) with customer name, CSM name, indicator, and timestamp

---

## Part 3 — Admin Dashboard Restructuring

**File: `src/pages/AdminDashboard.tsx`**
- Convert from a single Activity Timeline view to a tabbed layout with:
  - **Audit Trail** tab: the existing DataEntryTimeline (activity logs)
  - **Reports** tab: embedded compliance report summary with links to full CSM and Content Management compliance reports, plus the department-level breakdown
- Add navigation buttons: "CSM Compliance Report", "Content Mgmt Compliance Report"
- This replaces the need to access reports only from notifications

**File: `src/components/AppLayout.tsx`**
- No changes needed — the Admin Dashboard button already exists

---

## Technical Details

- Only one database migration: adding `remark text` column to `csm_customer_feature_scores`
- No new tables needed — remarks are stored inline with scores
- The remark field is unlimited text (no character cap as requested)
- Existing RLS policies on `csm_customer_feature_scores` already cover read/write access
- The compliance report queries already pull from `csm_customer_feature_scores` — just need to include the new `remark` column in selects

### Files Modified
1. **Migration**: Add `remark` column to `csm_customer_feature_scores`
2. `src/components/user/CSMDataEntryMatrix.tsx` — remark input per score, persist on save
3. `src/components/compliance/ComplianceCustomerDetail.tsx` — show remarks in drilldown
4. `src/pages/ComplianceReport.tsx` — add department breakdown tab, remarks log
5. `src/pages/AdminDashboard.tsx` — tabbed layout with Audit Trail + Reports

