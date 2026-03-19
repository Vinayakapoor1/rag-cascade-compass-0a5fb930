

## Plan: Fix Aggregation Formula to Show Percentages Instead of Band Labels

### Problem
The Indicator Derivation Dialog's aggregation formula displays custom RAG band labels (e.g., "0-30 Days") instead of percentage values. This produces nonsensical output like `(0-30 Days + 0-30 Days + 31-60 Days + ...) ÷ 31 = 96.8%` — you cannot add "days" together and divide to get a percentage. The math operates on percentages, so the formula should show percentages.

### What Changes

**File: `src/components/IndicatorDerivationDialog.tsx`**

1. **Aggregation Formula (line 642-646)** — Always show percentage values in the formula string, never band labels. Change from:
   ```typescript
   const label = getBandLabel(c.average, ragBands);
   return label ? label : `${pct}%`;
   ```
   To:
   ```typescript
   return `${pct}%`;
   ```
   This makes the formula read: `(100% + 100% + 50% + ...) ÷ 31 = 96.8%`

2. **Individual cell values in breakdown table (lines 686-698)** — Keep showing band labels here since they provide meaningful context per score (e.g., "0-30 Days" for a single customer). This is fine because each cell represents a single data entry.

3. **Avg column (lines 706-716)** — Keep showing both the band label and percentage (e.g., "0-30 Days (100%)") since the average per customer is still a single mapped value.

### Summary
Only one line changes: the aggregation formula will always display percentages regardless of whether custom RAG bands exist, because the formula is a mathematical average and should show the numbers being averaged.

### Files Modified
- `src/components/IndicatorDerivationDialog.tsx` — Show percentages in aggregation formula

