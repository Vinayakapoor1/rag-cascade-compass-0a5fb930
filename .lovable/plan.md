

# Fix: Make Content Management Sub-Section Visible

## Problem
The Content Management Indicators sub-section IS implemented in the code and the data exists, but users can't see it because:
1. The section is **collapsed by default** (`cmOpen` starts as `false`)
2. It's placed below the Feature x KPI matrix table, requiring scrolling
3. Users may not realize they need to expand a customer accordion first and then look for a collapsible section within it

## Solution
Make the CM sub-section more discoverable:

### File: `src/components/user/CSMDataEntryMatrix.tsx`

1. **Default to open** -- Change `useState(false)` to `useState(true)` in `CMSubSectionBlock` so the Content Management Indicators section is **expanded by default** instead of collapsed.

2. **Add a visual indicator on the customer accordion header** -- Add a small badge like "CM" or "Content Management" next to each customer name in the accordion trigger so users know there's CM scoring available inside.

3. **Style the CM section header more prominently** -- Add a colored left border or background tint to the "Content Management Indicators" collapsible trigger so it stands out visually from the surrounding content (similar to how the instructions card uses `border-primary/20 bg-primary/5`).

## Technical Details
- Line ~1858: Change `useState(false)` to `useState(true)` for the `cmOpen` state
- Line ~1807: The condition `cmIndicators.length > 0` is correct and will render when viewing Customer Success department (not CM department itself)
- The `managedServicesOnly` guard at line 354 correctly prevents duplication on the standalone CM page
- Add a `<Badge>` with "CM" text next to customer name in the `CustomerSectionCard` trigger area (around line ~1700)
