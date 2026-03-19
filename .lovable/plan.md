

## Plan: Show Percentages Instead of Band Labels in Derivation Dialog Averages

### Problem
The bar chart tooltip and the "Avg" column in the Indicator Derivation Dialog still display band labels like "0-30 Days (100%)" instead of just showing the percentage. The previous fix only addressed the aggregation formula string — these two other locations were missed.

### Changes

**File: `src/components/IndicatorDerivationDialog.tsx`**

1. **Bar chart tooltip (lines 610-616)** — Remove band label lookup, always show `${value}%`:
   ```typescript
   formatter={(value: number) => [`${value}%`, 'Avg Score']}
   ```

2. **Avg column in breakdown table (lines 705-715)** — Remove band label, show only `${avgPct}%`:
   ```typescript
   const avgPct = Math.round(customer.average * 100);
   return <span className={...}>{avgPct}%</span>;
   ```

### Files Modified
- `src/components/IndicatorDerivationDialog.tsx` — two small changes

