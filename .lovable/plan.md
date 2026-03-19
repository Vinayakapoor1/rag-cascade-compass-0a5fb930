

# Fix Ops Health Dropdown Labels and Bug Count Selector

## Changes

### 1. Bug Count — Replace free-text input with a dropdown
Replace the `<Input type="number">` with a `Select` dropdown offering 3 specific threshold options:
- **< 5** (Green, rag_numeric: 1)
- **5 – 10** (Amber, rag_numeric: 0.5)
- **> 10** (Red, rag_numeric: 0)

Store weight (1/0.5/0) in `bug_count` column instead of a raw count. The `bugCountRAG` helper in `useCustomerHealthMetrics.ts` already maps weights to RAG — will align it.

### 2. Bug SLA, Promises, NFR SLA — Show percentage thresholds instead of "Green/Amber/Red"
Replace the current `DEFAULT_BANDS` labels ("Green", "Amber", "Red") with percentage-based labels:
- **76 – 100%** (Green, rag_numeric: 1)
- **51 – 75%** (Amber, rag_numeric: 0.5)
- **0 – 50%** (Red, rag_numeric: 0)

### 3. Rename "Promises" to "Promises Made vs Kept"

---

## File Changes

### `src/components/user/CSMDataEntryMatrix.tsx`

- Add two new band constants:
  ```typescript
  const BUG_COUNT_BANDS: KPIBand[] = [
    { band_label: '< 5', rag_color: 'green', rag_numeric: 1, sort_order: 1 },
    { band_label: '5 – 10', rag_color: 'amber', rag_numeric: 0.5, sort_order: 2 },
    { band_label: '> 10', rag_color: 'red', rag_numeric: 0, sort_order: 3 },
  ];

  const PCT_BANDS: KPIBand[] = [
    { band_label: '76 – 100%', rag_color: 'green', rag_numeric: 1, sort_order: 1 },
    { band_label: '51 – 75%', rag_color: 'amber', rag_numeric: 0.5, sort_order: 2 },
    { band_label: '0 – 50%', rag_color: 'red', rag_numeric: 0, sort_order: 3 },
  ];
  ```

- **Bug Count**: Replace `<Input>` with a `<Select>` using `BUG_COUNT_BANDS`
- **Bug SLA, NFR SLA, Promises**: Replace `DEFAULT_BANDS` with `PCT_BANDS`
- Rename "Promises" label to "Promises Made vs Kept"
- Update `bugRAG` helper (used for RAG dot) to use weight-based logic instead of count-based
- Update `scoredCount` logic for bug count (check for non-empty string instead of truthy number)

### `src/hooks/useCustomerHealthMetrics.ts`
- Update `bugCountRAG` / `bugCountScore` to treat stored value as weight (1/0.5/0) instead of raw count
- Update dimension value display for Bug Count to show threshold label ("< 5", "5 – 10", "> 10")

### `src/components/CustomerHealthMetricsForm.tsx`
- Replace Bug Count `<Input>` with a Select dropdown using the same threshold options
- Replace Bug SLA, Promises, NFR SLA selectors to show percentage labels

### `src/components/CustomerHealthMetricsCard.tsx`
- Update Bug Count dimension display to show threshold label from weight value

### Files Modified
1. `src/components/user/CSMDataEntryMatrix.tsx`
2. `src/hooks/useCustomerHealthMetrics.ts`
3. `src/components/CustomerHealthMetricsForm.tsx`
4. `src/components/CustomerHealthMetricsCard.tsx`

