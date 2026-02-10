

# CSM Matrix: Band Dropdown Input with Vector Calculation

## Overview
Replace the current percentage input cells in the CSM Feature Matrix with dropdown selectors showing RAG band labels (Green/Amber/Red). Each selection maps to a fixed vector weight (Green=1, Amber=0.5, Red=0). The aggregation ("Agg RAG") becomes the average of these vector weights, converted to a percentage (x100).

## What Changes

### 1. Cell Input: Percentage Fields to Band Dropdowns
- Each editable cell becomes a compact dropdown with 3 options: **Green** (1), **Amber** (0.5), **Red** (0), plus an empty/unset state
- Cells display a colored dot + label (e.g., a green dot with "Green")
- This replaces the current `<Input type="number">` fields

### 2. Storage
- The `csm_customer_feature_scores.value` column will store the vector weight (1, 0.5, or 0) instead of a raw percentage
- No database schema changes needed -- the `numeric` column already supports these values

### 3. Aggregation Calculation
- **Per-KPI aggregate** = AVG of all vector weights for that KPI across features and customers
- **Per-customer average** = AVG of all vector weights across that customer's cells
- Final percentage = aggregate * 100 (so 0.8 becomes 80%)
- This 80% is saved as the indicator's `current_value` and mapped to RAG thresholds as before

### 4. Display Updates
- **Row Avg** and **Customer Avg** badges will show the computed percentage from vector averages
- **Apply to Row / Apply to Column** controls change from a number input to a band dropdown, applying that vector weight across cells

### 5. Excel Template Updates
- Downloaded template cells will contain band labels ("Green", "Amber", "Red") instead of numbers
- Upload parser will map band labels back to vector weights (1, 0.5, 0)

## Technical Details

### Files Modified

**`src/components/user/CSMDataEntryMatrix.tsx`**
- Add constant: `VECTOR_WEIGHTS = { green: 1, amber: 0.5, red: 0 }`
- Replace `<Input type="number">` in data cells with a `<Select>` component offering Green/Amber/Red options
- Update `handleCellChange` to accept band values ('green'|'amber'|'red') and store corresponding vector weight
- Update `getCustomerOverallAvg` and `getFeatureRowAvg` to compute average of vector weights, then multiply by 100 for display
- Update `applyToRow`/`applyToColumn` to work with band selection instead of numeric input
- Update `handleSaveAll`: the indicator aggregate calculation uses vector weight averages x 100

**`src/lib/matrixExcelHelper.ts`**
- `generateMatrixTemplate`: Write band labels in cells instead of raw numbers; add a legend sheet explaining Green=1, Amber=0.5, Red=0
- `parseMatrixExcel`: Map band labels ("Green", "Amber", "Red") and numeric values (1, 0.5, 0) back to vector weights

### Calculation Flow

```text
Cell Inputs (per feature per customer per KPI):
  Green -> 1, Amber -> 0.5, Red -> 0

KPI Aggregate = AVG(all vector weights for that KPI) x 100
  Example: 3 Green + 2 Amber = (1+1+1+0.5+0.5)/5 = 0.8 -> 80%

Indicator current_value = 80 (saved to DB)
RAG derivation: 80% >= 76% -> Green
```

### No Database Migration Required
- `csm_customer_feature_scores.value` is `numeric` and already supports storing 0, 0.5, 1
- `kpi_rag_bands` table exists but won't be used since weights are fixed globally

