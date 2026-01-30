
# Fix Progress Bar Alignment in Org Objective Cards

## Problem

The progress bars at the bottom of the 5 Organizational Objective cards are not aligned horizontally. This happens because:
- Each card has different text lengths for the objective names
- The current layout doesn't push the progress bar to the bottom of the card
- Cards use `h-full` but the internal content doesn't use flex to distribute space

## Solution

Restructure the card layout to use flexbox column layout with the progress bar pushed to the bottom using `mt-auto`.

---

## File to Modify

`src/components/OrgObjectiveStatBlock.tsx`

---

## Technical Changes

### Current Structure (Lines 57-81)
```tsx
<div className="p-4">
  <div className="flex items-start justify-between gap-2 mb-3">
    {/* Title, icon, badge, percentage */}
  </div>
  
  <Progress ... />
</div>
```

### New Structure
```tsx
<div className="p-4 h-full flex flex-col">
  <div className="flex items-start justify-between gap-2 flex-1">
    {/* Title, icon, badge, percentage */}
  </div>
  
  <Progress className="mt-auto" ... />
</div>
```

Key changes:
1. Add `h-full flex flex-col` to the inner padding container
2. Change `mb-3` to `flex-1` on the content section so it grows to fill space
3. Add `mt-auto` to the Progress bar to push it to the bottom

---

## Result

After this fix:
- All 5 progress bars will be perfectly aligned at the same vertical position
- Cards will maintain equal heights due to the grid layout
- The progress bar will always sit at the bottom regardless of text length
