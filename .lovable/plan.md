

# Rename Badge Labels: Health → KPI-Driven, Ops → Ops Health

## Changes in `src/pages/CustomersPage.tsx`

1. **Line ~685**: Change label under the composite RAG badge from `Health` to `KPI-Driven`
2. **Line ~689**: Change tooltip title from `Health Score Derivation` to `KPI-Driven Score Derivation`
3. **Line ~702**: Change tooltip line from `Ops Health Score` to `Ops Health Score` (already correct)
4. **Line ~707**: Update composite explanation text to reference "KPI-Driven" instead of "Indicator"
5. **Line ~712**: Update the no-data explanation to say "KPI-Driven status" instead of "Health"
6. **Line ~722**: Change label under the ops RAG badge from `Ops` to `Ops Health`
7. **Line ~726**: Change tooltip title from `Operational Health Breakdown` to `Ops Health Breakdown`
8. **Line ~42** (sparkline tooltip): Change `Health Score` to `KPI-Driven Score`

## Files Modified
1. **`src/pages/CustomersPage.tsx`** — Label and tooltip text updates only

