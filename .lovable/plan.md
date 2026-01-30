

# Show Full Org Objective Names with Aligned Layout

## Problem

The current implementation uses `line-clamp-3` which truncates long objective names like "Operational Excellence & Cybersecurity Resilience". The user wants to see the **full names** while still maintaining alignment of the status badges and progress bars.

## Solution

Use CSS Grid with a **minimum height** instead of a fixed height, allowing the title area to expand for longer names while ensuring all cards in the same row have equal heights through the grid's implicit row stretching.

---

## File to Modify

`src/components/OrgObjectiveStatBlock.tsx`

---

## Technical Changes

### Current Title Section (Lines 59-70)
```tsx
{/* Title Section - fixed height for alignment */}
<div className="flex items-start gap-3 h-[56px]">
  <div className="p-2 rounded-xl bg-muted/80 flex-shrink-0 shadow-sm">
    <Target className="h-4 w-4 text-muted-foreground" />
  </div>
  <h3 
    className="font-semibold text-sm leading-tight flex-1 line-clamp-3"
    title={name}
  >
    {name}
  </h3>
</div>
```

### New Title Section
```tsx
{/* Title Section - minimum height, grows with content */}
<div className="flex items-start gap-3 min-h-[56px]">
  <div className="p-2 rounded-xl bg-muted/80 flex-shrink-0 shadow-sm">
    <Target className="h-4 w-4 text-muted-foreground" />
  </div>
  <h3 className="font-semibold text-sm leading-tight flex-1">
    {name}
  </h3>
</div>
```

### Key Changes

| Element | Before | After |
|---------|--------|-------|
| Title container height | `h-[56px]` (fixed, clips text) | `min-h-[56px]` (minimum, expands as needed) |
| Line clamping | `line-clamp-3` (truncates) | Removed (shows full text) |
| Title attribute | `title={name}` (for tooltip) | Removed (not needed) |

---

## How Alignment Works

The parent grid in `Portfolio.tsx` uses:
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
```

CSS Grid automatically stretches all items in the same row to match the tallest item. Combined with `h-full` on the card and `flex flex-col` with `mt-auto` on the progress bar:

1. **Grid row**: All 5 cards in a row get the same height (matching the tallest)
2. **Card**: Uses `h-full` to fill the grid cell
3. **Flexbox column**: Content flows top-to-bottom
4. **Progress bar**: `mt-auto` pushes it to the bottom

This means if "Operational Excellence & Cybersecurity Resilience" wraps to 3 lines, all other cards in that row will also be 3-line height, keeping badges and progress bars aligned.

---

## Visual Result

```text
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Brand &         │ │ Customer        │ │ Operational     │
│ Reputation      │ │ Experience &    │ │ Excellence &    │
│                 │ │ Success         │ │ Cybersecurity   │
│                 │ │                 │ │ Resilience      │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ [CORE] [G][85%] │ │ [CORE] [A][72%] │ │ [ENABLER][R]68% │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ ▓▓▓▓▓▓▓▓░░░░░░░ │ │ ▓▓▓▓▓▓▓░░░░░░░░ │ │ ▓▓▓▓▓▓░░░░░░░░░ │
└─────────────────┘ └─────────────────┘ └─────────────────┘
      ↑                    ↑                    ↑
   All cards same height, badges & bars aligned
```

---

## Benefits

1. **Full names visible**: No truncation, all objective names fully displayed
2. **Natural alignment**: CSS Grid handles row height synchronization automatically
3. **Consistent spacing**: Status row and progress bar align perfectly
4. **Responsive**: Works across all breakpoints (2, 3, or 5 columns)

