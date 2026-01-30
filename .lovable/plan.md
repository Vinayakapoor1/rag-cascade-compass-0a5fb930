

# Improve Org Objective Name Alignment and Text Display

## Problem

The Org Objective names in the 5-column grid have varying text lengths:
- "Brand & Reputation" - Short, single line
- "Customer Experience & Success" - Medium, wraps to 2 lines  
- "Sustainable Growth" - Short, single line
- "Operational Excellence & Cybersecurity Resilience" - Very long, wraps to 3+ lines
- "Talent Development & Culture" - Medium length

This causes the cards to have different text heights, making the layout look uneven even with the fixed row structure we implemented.

## Solution

Apply a **fixed height title area** with CSS that ensures all titles occupy the same vertical space, using line clamping to truncate very long names while showing a tooltip for the full text.

---

## File to Modify

`src/components/OrgObjectiveStatBlock.tsx`

---

## Technical Changes

### Current Title Section (Lines 59-67)
```tsx
<div className="flex items-start gap-3 min-h-[48px] flex-1">
  <div className="p-2 rounded-xl bg-muted/80 flex-shrink-0 shadow-sm">
    <Target className="h-4 w-4 text-muted-foreground" />
  </div>
  <h3 className="font-semibold text-sm leading-snug flex-1">
    {name}
  </h3>
</div>
```

### New Title Section
```tsx
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

### Key Changes

| Element | Before | After |
|---------|--------|-------|
| Title container height | `min-h-[48px] flex-1` (variable) | `h-[56px]` (fixed) |
| Line clamping | None | `line-clamp-3` (max 3 lines, then ellipsis) |
| Title attribute | None | `title={name}` (full name on hover) |
| Line height | `leading-snug` (1.375) | `leading-tight` (1.25) for more lines |

### Layout Structure with Fixed Heights
```text
All cards will have identical structure:
┌─────────────────────────────────┐
│  [Icon]  Objective Name...      │  ← Fixed 56px height
│          (max 3 lines)          │
├─────────────────────────────────┤
│  [CORE]           [RAG] [85%]   │  ← Fixed row height
├─────────────────────────────────┤
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░           │  ← Progress bar
└─────────────────────────────────┘
```

---

## Benefits

1. **Perfect alignment**: All title areas are exactly 56px tall
2. **Consistent spacing**: Status row and progress bar align across all cards
3. **Readable text**: 3 lines is enough for most names; very long ones get ellipsis
4. **Accessibility**: Full name available via tooltip on hover
5. **Better fit**: `leading-tight` allows more text in the fixed height

---

## Visual Comparison

**Before**: Cards have different heights based on text length, causing misalignment of badges, percentages, and progress bars.

**After**: All cards have identical dimensions with:
- Title area: Fixed 56px (fits up to 3 lines)
- Status row: Fixed position
- Progress bar: Fixed at bottom
- Very long names truncated with "..." and full text on hover

