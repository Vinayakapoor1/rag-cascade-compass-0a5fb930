

# Fix: Show Custom RAG Band Labels in CM Dropdowns

## Problem
The Content Management data entry dropdowns are showing generic "Green / Amber / Red" labels instead of the custom band labels from the Excel file (e.g., "76-100%", "0-30 Days", "90-100%"). This is caused by stale cached data from before the custom bands were inserted into the database.

## Root Cause
The matrix query has a `staleTime` of 5 minutes, meaning cached results from before the RAG band inserts persist in the browser. The bands data IS correctly stored in the database, but the UI is serving old cached data where no custom bands existed -- falling back to the hardcoded default labels ("Green", "Amber", "Red").

## Changes

### 1. Force cache invalidation for CM matrix data
**File:** `src/components/user/CSMDataEntryMatrix.tsx`
- Reduce `staleTime` to 0 for the initial load or add the bands query timestamp to the cache key to force a fresh fetch
- Alternatively, add a `refetchOnMount: true` to ensure fresh data each time the page loads

### 2. Add logging to confirm bands are loaded (temporary debug)
- Add a brief `console.log` in the `getBandsForIndicator` function to verify which bands are being used per indicator -- this will be removed after confirming the fix works

### 3. Verify dropdown rendering
After the cache fix, each KPI dropdown will display:

| KPI | Green Band | Amber Band | Red Band |
|-----|-----------|------------|----------|
| Asset Launch Count vs Target | 76-100% | 51-75% | 0-50% |
| Content Engagement Coverage | 0-30 Days | 31-60 Days | 60+ Days |
| Completion Depth within 30 days | 0-30 Days | 31-60 Days | 60+ Days |
| Pack Launch Count vs Target | 76-100% | 51-75% | 0-50% |
| Expansion Pipeline Influence | 76-100% | 51-75% | 0-50% |
| Avg. Production Cycle Time | 1-12% Decrease | 1-12% Increase | 12%+ Increase |
| Production Cost per Asset | 12%+ Decrease | 1-12% Decrease | 1%+ Increase |
| Release Timeliness Rate | 90-100% | 70-89% | 0-69% |
| Rights Management Compliance | 90-100% | 70-89% | 0-69% |
| Version Control Enforcement | 90-100% | 70-89% | 0-69% |

## Technical Detail
- Change `staleTime` from `5 * 60 * 1000` to `30 * 1000` (30 seconds) so fresh band data loads reliably
- Add `refetchOnMount: 'always'` to the query options to ensure the latest bands are fetched each time the page is visited
- No database changes needed -- all 30 band rows (10 indicators x 3 bands each) are already correctly stored

