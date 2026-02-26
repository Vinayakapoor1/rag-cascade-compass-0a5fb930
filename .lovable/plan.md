

# Add Content Management Indicators as Sub-Section in CSM Data Entry

## Overview
Add a collapsible "Content Management Indicators" sub-section inside each customer accordion in the CSM Feature Matrix. This section will appear for **all customers assigned to the CSM** (based on existing `csm_id` mapping), NOT filtered by `managed_services`. Every customer the CSM manages will have CM indicator scoring available.

## What Changes

### File: `src/components/user/CSMDataEntryMatrix.tsx`

**1. Fetch Content Management department data alongside main query**
- In the `queryFn`, after fetching the main department's indicators, also fetch the "Content Management" department by name
- Fetch its full chain: `functional_objectives` -> `key_results` -> `indicators`
- Fetch `kpi_rag_bands` for the CM indicators
- Fetch existing `csm_customer_feature_scores` for CM indicators in the current period
- Return this as additional fields: `cmIndicators`, `cmBands`, `cmExistingScores`
- Skip this fetch entirely if the current department IS Content Management (avoid duplication)

**2. Extend each `CustomerSection` with CM data**
- For every customer in the main matrix (regardless of `managed_services` status), attach the full set of CM indicators
- Use the existing nil UUID placeholder (`00000000-0000-0000-0000-000000000000`) as `feature_id` for CM scores (same pattern as CM direct mode)
- Load existing CM scores into the same `scores` state map using `cellKey(cmIndicatorId, customerId, placeholderFeatureId)`

**3. Add CM sub-section UI in `CustomerSectionCard`**
- After the main Feature x KPI matrix table and before the Save button / attachments area
- Render a `Collapsible` section with header "Content Management Indicators"
- Inside: a simplified KPI-only scoring grid (same as CM direct mode) with columns: KPI Name | Score Dropdown | RAG dot
- Include a "Score Total" aggregate footer row showing the average across all CM indicators
- Include "Apply to all" quick-fill buttons

**4. Integrate CM scores into save flows**
- `doSaveCustomer`: also upsert CM indicator scores (using placeholder feature ID) when saving a customer
- `doSaveAll` (Update & Check In): also aggregate CM indicator scores and update CM indicators' `current_value` and `rag_status`

**5. Conditional visibility**
- Do NOT show the CM sub-section when `managedServicesOnly` prop is true (standalone CM data entry page)
- Do NOT show when the current `departmentId` IS the Content Management department
- Show for ALL customers in the CSM view, not just managed services ones

## Key Clarification
The customer-to-CSM assignment (`csm_id` on the `customers` table) controls which customers appear in the CSM data entry. The CM sub-section will appear for all of those customers -- the `managed_services` flag is NOT used as a filter here.

## Technical Notes
- The CM department ID is fetched once via `supabase.from('departments').select('id').eq('name', 'Content Management').maybeSingle()`
- CM indicator cell keys use a different indicator ID namespace so they won't collide with main department indicator keys
- No database changes needed -- uses existing `csm_customer_feature_scores` table with the nil UUID placeholder pattern

