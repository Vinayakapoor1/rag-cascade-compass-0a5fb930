

# Fix: CSM Data Entry Not Showing All Scores (1000-Row Limit)

## Problem
The CSM Data Entry matrix is not displaying previously entered scores for some customers (e.g., DCB Bank). The data exists in the database (2,451 rows for period 2026-02), but the queries fetching existing scores are hitting the default 1,000-row limit, causing scores to be silently dropped.

## Root Cause
The database has a default query limit of 1,000 rows. The score-fetching queries in `CSMDataEntryMatrix.tsx` do not override this limit, so only the first 1,000 score rows are returned. Customers whose scores fall beyond row 1,000 appear as if they have no data.

## Fix

### File: `src/components/user/CSMDataEntryMatrix.tsx`

Add `.limit(10000)` to all queries that fetch from `csm_customer_feature_scores` to ensure all rows are returned. There are 3 locations:

1. **Line ~248-252** (Content Management direct scores query):
   ```typescript
   const { data: existingScoresDirect } = await supabase
     .from('csm_customer_feature_scores' as any)
     .select('*')
     .in('indicator_id', indIds)
     .eq('period', period)
     .limit(10000);  // <-- ADD
   ```

2. **Line ~302-306** (Main feature matrix scores query):
   ```typescript
   const { data: existingScores } = await supabase
     .from('csm_customer_feature_scores' as any)
     .select('*')
     .in('indicator_id', indIds)
     .eq('period', period)
     .limit(10000);  // <-- ADD
   ```

3. **Line ~407-412** (CM sub-section scores query -- need to verify exact location):
   Same pattern -- add `.limit(10000)` to any remaining `csm_customer_feature_scores` fetch queries.

This is a one-file fix. No database changes needed. The data is intact; it just needs to be fully loaded.

