

## Import Sales KPI Scores from Excel

### What the Excel Contains
10 Sales KPIs with band-based aggregate scores (e.g., "25-100%", "1-10%"). These are standalone department-level inputs — no customer or feature association.

### Current State
- All 10 Sales indicators exist in the database with `current_value: null`
- Each indicator has 3 RAG bands defined in `kpi_rag_bands` (green/amber/red)
- The Sales "Per Indicator" tab already renders these indicators with numeric input fields

### What Needs to Happen

**Data insertion only — no code changes required.**

Match each Excel band label to the indicator's `kpi_rag_bands` entry to determine the `rag_numeric` value and RAG color, then:

1. **Update each indicator's `current_value`** with the matched `rag_numeric` score and set `rag_status` accordingly
2. **Insert `indicator_history` records** for audit trail (period: current month)

| KPI | Excel Score | RAG Band Match | Value | Status |
|-----|------------|----------------|-------|--------|
| Net new ARR (%) | 25-100% | green | 1 | green |
| Number of new customers acquired | 13-24% | amber | 0.5 | amber |
| Expansion ARR from renewals | 25-100% | green | 1 | green |
| Cross-sell ARR | 1-10% | red | 0 | red |
| Co-sell influenced ARR | 25-100% | green | 1 | green |
| Partner-sourced ARR | 51-100% | green | 1 | green |
| Enterprise ARR closed | 51-75% | amber | 0.5 | amber |
| Win rate improvement (%) | 1-7% | red | 0 | red |
| Sales cycle reduction (%) | 11-19% | amber | 0.5 | amber |
| Rep quota attainment distribution | 1-50% | red | 0 | red |

### Execution
- 10 UPDATE statements on `indicators` table (set `current_value` and `rag_status`)
- 10 INSERT statements into `indicator_history` (period `2026-03`, created_by = admin user)

No schema changes, no code changes. The Sales Per Indicator tab will immediately reflect the entered values.

