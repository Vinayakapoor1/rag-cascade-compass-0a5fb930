

# Display All 5 Org Objective Cards in One Line with Full Text

## Problem

Currently, the Organizational Objectives section displays cards in a `grid-cols-4` layout on large screens, causing the 5th card to wrap to a second row. Additionally, the objective names are truncated with `line-clamp-2`, cutting off text like "Achieve Operational Excellence - People,..." and "Maximize Customer Success and...".

## Solution

Make two changes:
1. Update the grid layout to display all 5 cards in a single row on large screens
2. Remove text truncation so full objective names are visible

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Portfolio.tsx` | Change grid to `lg:grid-cols-5` for 5-column layout |
| `src/components/OrgObjectiveStatBlock.tsx` | Remove `line-clamp-2` so full text is visible |

---

## Technical Details

### 1. Portfolio.tsx (Line 361)

**Current:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

**Updated:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
```

Changes:
- `lg:grid-cols-4` → `lg:grid-cols-5` to fit all 5 cards in one row
- `gap-4` → `gap-3` to slightly reduce spacing and give cards more room

### 2. OrgObjectiveStatBlock.tsx (Line 65)

**Current:**
```tsx
<h3 className="font-semibold text-sm leading-tight line-clamp-2">{name}</h3>
```

**Updated:**
```tsx
<h3 className="font-semibold text-xs leading-tight">{name}</h3>
```

Changes:
- Remove `line-clamp-2` to show full text without truncation
- `text-sm` → `text-xs` to allow longer names to fit within the card width

---

## Result

After implementation:
- All 5 Organizational Objectives display in a single row on large screens
- Full objective names are visible without "..." truncation
- Cards adjust to smaller gap for better spacing with 5 columns
- Responsive behavior preserved (2 columns on mobile, 3 on medium screens)

