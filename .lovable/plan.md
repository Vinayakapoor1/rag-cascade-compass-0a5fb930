
## Add Feature Hover Tooltips in CSM Data Entry Matrix

### What Changes
When a CSM hovers over a feature name in the data entry matrix table, a tooltip will appear showing the feature's description and category -- giving immediate context without leaving the page.

### Current State
- Feature names are displayed as plain text in the leftmost column of each customer's matrix table (line 932-933 of `CSMDataEntryMatrix.tsx`)
- The `features` table already has `description` and `category` columns, but only `id` and `name` are fetched currently

### Implementation Steps

1. **Update data fetching** in `CSMDataEntryMatrix.tsx`:
   - Change the `features` select query (line 196) to also fetch `description` and `category` fields
   - Update the `CustomerSection.features` type to include `description` and `category`

2. **Add tooltips to feature name cells** (around line 932):
   - Wrap each feature name in a `Tooltip` component (already imported)
   - Show description and category in the tooltip content
   - If no description exists, show "No description available" as fallback

### Technical Details
- The `features` table has `description` (text) and `category` (text) columns -- currently most have "PLATFORM" as description
- The tooltip will use the existing `TooltipProvider` / `Tooltip` / `TooltipTrigger` / `TooltipContent` components already imported in the file
- Zero-delay tooltips (consistent with existing KPI formula tooltips per project style)
