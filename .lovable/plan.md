

# Display CSAT Band Labels Instead of Percentages

## Problem
The Indicator Derivation Dialog (the drilldown view shown when clicking a KPI on the Department Detail page) converts raw `rag_numeric` weights (0, 0.5, 1) to percentages (0%, 50%, 100%). For CSAT which uses a 1-5 scale, this is confusing -- users expect to see "4-5", "3", or "1-2" instead.

## Solution
When an indicator has custom RAG bands configured (like CSAT), display the **band label** instead of the percentage in the breakdown table and charts. Fall back to percentage display for indicators that don't have custom bands.

## Changes

**File: `src/components/IndicatorDerivationDialog.tsx`**

1. **Add a helper function** to map a `rag_numeric` value back to its band label using the already-fetched `ragBands` data:
   - Match `value` to `ragBands[x].rag_numeric` and return `ragBands[x].band_label`
   - If no match found, fall back to showing percentage

2. **Update the Customer x Feature Breakdown table** (lines 638-657):
   - When `ragBands` exist, show band label (e.g., "3") instead of percentage (e.g., "50%")
   - Keep the RAG color coding based on the rag_color from the band

3. **Update the Avg column** (lines 659-673):
   - Keep showing the percentage here since it's an actual average, but consider showing the mapped RAG band label

4. **Update the bar chart tooltips and axis** (lines 567-596):
   - When bands exist, show band labels in tooltips alongside percentages

5. **Update the Aggregation Formula summary** (line 603):
   - When bands exist, show band labels in the formula breakdown (e.g., "3 + 4-5" instead of "50% + 100%")

## Technical Details

The `ragBands` data is already fetched in the component (line 146-158). Each band has:
- `band_label`: the display text (e.g., "4-5")
- `rag_numeric`: the stored weight (e.g., 1)  
- `rag_color`: the RAG status (e.g., "green")

The mapping function will match the score's `value` field (which is `rag_numeric`) to find the corresponding `band_label`. Since `rag_numeric` values are 0, 0.5, and 1, exact matching works reliably.

