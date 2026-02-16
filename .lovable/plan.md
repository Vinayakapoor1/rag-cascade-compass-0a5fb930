

# Update CSAT RAG Bands to 1-5 Scale

## Current State
The CSAT Score indicator currently uses percentage-based bands:
- 90-100% = Green
- 51-89% = Amber
- 1-50% = Red

## Requested Change
Update to a 1-5 scoring scale:
- **4-5** = Green
- **3** = Amber
- **1-2** = Red

## Implementation
A single database update to modify the three existing rows in the `kpi_rag_bands` table for the CSAT Score indicator (`c582917c-2296-46e9-8cfa-9401ed71577c`):

| Band | Label | RAG Color | RAG Numeric |
|------|-------|-----------|-------------|
| 1 | 4-5 | green | 1 |
| 2 | 3 | amber | 0.5 |
| 3 | 1-2 | red | 0 |

## Technical Details
- Update three rows in `kpi_rag_bands` via database migration
- No code changes needed -- the CSM data entry matrix already reads band labels dynamically from this table
- The `rag_numeric` values stay the same (1, 0.5, 0) so rollup calculations remain consistent

