
# Plan: Fix Data Entry Flow Consistency

## Problem Summary
There are two data entry paths with inconsistent behavior:
1. **DataEntryDialog** (individual indicator entry) - does NOT save to `indicator_history`
2. **DepartmentDataEntry** (bulk entry) - correctly saves to `indicator_history`

This means historical data tracking only works when using the bulk entry page.

## Solution Overview
Update `DataEntryDialog.tsx` to also insert records into `indicator_history`, making both entry paths consistent.

---

## Step 1: Update DataEntryDialog to Insert History Records

Modify the `handleSave` function to also create a history record when saving values.

**Current behavior:**
- Updates `indicators.current_value` ✅
- Logs to `activity_logs` ✅  
- Inserts to `indicator_history` ❌

**New behavior:**
- Updates `indicators.current_value` ✅
- Logs to `activity_logs` ✅
- Inserts to `indicator_history` ✅ (NEW)

---

## Step 2: Add Period Selection (Optional Enhancement)

The `DepartmentDataEntry` page has a period selector (YYYY-MM format). Consider adding a similar period selector to `DataEntryDialog` so history records have proper period values.

---

## Technical Details

### File to Modify: `src/components/DataEntryDialog.tsx`

**Add after the `indicators` update (around line 60):**

```typescript
// Create history record
const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

const { error: historyError } = await supabase
  .from('indicator_history')
  .insert({
    indicator_id: indicator.id,
    value: value,
    period: currentPeriod,
    created_by: user.id
  });

if (historyError) {
  console.error('History insert error:', historyError);
  // Don't fail the whole operation, just log the error
}
```

---

## Implementation Order
1. Modify `DataEntryDialog.tsx` to add history insertion
2. Test the flow by entering a value through the dialog
3. Verify the record appears in `indicator_history`
4. Confirm admin can see the entry in activity timeline

---

## Expected Outcome
After implementation:
- Both data entry methods will create history records
- Admins will have complete audit trails
- Historical trending data will be captured regardless of entry method
