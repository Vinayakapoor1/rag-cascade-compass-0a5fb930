
# Align Classification Badges and Improve Text Layout

## Problem

Currently, the "CORE" and "Enabler" classification badges are positioned directly below the objective name text. When names have different lengths (some wrap to 2-3 lines, others are shorter), the badges end up at different vertical positions across the 5 cards.

## Solution

Restructure the card layout into clearly defined rows:
1. **Row 1**: Icon + Title (with flexible height for text wrapping)
2. **Row 2**: Classification badge (fixed position, aligned across all cards)
3. **Row 3**: RAG status + Percentage (aligned to the right)
4. **Row 4**: Progress bar (already fixed at bottom)

---

## File to Modify

`src/components/OrgObjectiveStatBlock.tsx`

---

## Technical Changes

### New Card Structure

```text
┌─────────────────────────────────┐
│  [Icon]  Objective Name         │  ← Title section (flexible)
│          (can wrap)             │
├─────────────────────────────────┤
│  [CORE]           [RAG] [85%]   │  ← Status row (fixed position)
├─────────────────────────────────┤
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░           │  ← Progress bar (bottom)
└─────────────────────────────────┘
```

### Key Layout Changes

1. **Separate title from badge row**: Move the classification badge out of the title div into its own row
2. **Fixed height title area**: Use `min-h-[48px]` on the title section to ensure consistent spacing
3. **Badge row alignment**: Create a flex row with badge on left, RAG + percentage on right
4. **Better text styling**: Slightly larger font with better line height for readability

### Code Structure

```tsx
<div className="p-4 h-full flex flex-col">
  {/* Title Section - flexible height with minimum */}
  <div className="flex items-start gap-3 min-h-[48px]">
    <div className="p-2 rounded-xl bg-muted/80 flex-shrink-0">
      <Target className="h-4 w-4" />
    </div>
    <h3 className="font-semibold text-sm leading-snug flex-1">
      {name}
    </h3>
  </div>
  
  {/* Status Row - fixed position */}
  <div className="flex items-center justify-between mt-2 mb-3">
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/80">
      {classification}
    </span>
    <div className="flex items-center gap-2">
      <RAGBadge status={displayStatus} size="sm" />
      <span className="text-base font-bold">{percentage}%</span>
    </div>
  </div>
  
  {/* Progress Bar - bottom */}
  <Progress className="h-1.5 mt-auto" ... />
</div>
```

---

## Visual Improvements

| Element | Before | After |
|---------|--------|-------|
| Title font | `text-xs` (12px) | `text-sm` (14px) with `leading-snug` |
| Title area | Variable height | Minimum 48px height |
| Badge position | Below title (varies) | Fixed row, aligned across cards |
| Status/Percentage | Top right corner | Middle row, right aligned |

---

## Result

After implementation:
- All "CORE" and "Enabler" badges will be horizontally aligned
- RAG badges and percentages will be in a consistent row
- Text will be more readable with improved font size
- Card layout will look more structured and professional
