

# Replace "Save All" with "Update & Check In" / "No Update & Check In"

## What Changes

Replace the single "Save All" button in the CSM Data Entry Matrix with two distinct action buttons:

1. **"Update & Check In"** -- Saves all changed scores to the database, updates indicator aggregates, logs activity, and records the CSM's check-in for the period (existing save logic).
2. **"No Update & Check In"** -- Records the CSM's check-in for the period WITHOUT saving any score changes. This allows CSMs to confirm they reviewed their data but have no updates to make.

## Why

This gives CSMs a clear way to "check in" even when they have no new data to enter, which supports the weekly compliance system. Currently there's no way for a CSM to signal "I looked, nothing changed" -- they can only save if they have changes.

## Technical Details

### File: `src/components/user/CSMDataEntryMatrix.tsx`

**1. Add a new `handleNoUpdateCheckIn` function** (around line 501):
- Inserts a record into `activity_logs` with action `'update'` and metadata indicating a "no-update check-in" for the current period and department.
- Optionally upserts a minimal entry into `csm_customer_feature_scores` (a sentinel/marker) so the compliance system recognizes a submission for this period -- OR inserts into a dedicated check-in log. Since the compliance system checks `csm_customer_feature_scores` for period data, we will insert a lightweight activity log entry and also touch the scores table with existing values (re-save current scores without changes) to register the period as "submitted."
- Shows a success toast: "Checked in -- no updates for this period."

**2. Replace the Save All button** (lines 620-623):
- Remove the single `<Button>Save All</Button>`.
- Add two buttons side by side:
  - `<Button onClick={handleSaveAll} disabled={saving}>Update & Check In</Button>` -- always enabled (even without changes, re-saves current state as confirmation).
  - `<Button variant="outline" onClick={handleNoUpdateCheckIn} disabled={saving}>No Update & Check In</Button>` -- records the check-in without modifying scores.

**3. Update icons**:
- "Update & Check In" uses `Save` or `ClipboardCheck` icon.
- "No Update & Check In" uses `ClipboardCheck` or `Check` icon.

### Compliance Integration

The existing compliance system (`csm-compliance-check` edge function) checks `csm_customer_feature_scores` for entries in the current period. The "No Update & Check In" flow will re-upsert existing scores for the period (effectively a no-op data-wise) so that the compliance query finds records and marks the CSM as compliant.

