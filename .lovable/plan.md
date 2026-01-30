

# Align CORE and Enabler Classification Badges

## Problem

The classification badges ("CORE" / "Enabler") are in the status row below the title section. Since the title section uses `min-h-[56px]` and can grow with longer names, the badges are still at different vertical positions across cards - they're pushed down by varying amounts of title text.

## Solution

Restructure the card to use a **two-part flex layout**:
1. **Top section** (flexible): Title area that can grow
2. **Bottom section** (fixed): Classification + RAG status + Progress bar - always anchored to the bottom

This ensures the CORE/Enabler badges, RAG status, percentages, and progress bars are all perfectly aligned across all cards regardless of title length.

---

## File to Modify

`src/components/OrgObjectiveStatBlock.tsx`

---

## Technical Changes

### New Card Structure

```text
┌─────────────────────────────────┐
│  [Icon]  Objective Name         │  ← Flexible area (flex-1)
│          (can grow as needed)   │
│                                 │
├─────────────────────────────────┤
│  [CORE]           [RAG] [85%]   │  ← Fixed at bottom (mt-auto)
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░           │
└─────────────────────────────────┘
```

### Updated Layout Code

```tsx
<div className="p-4 h-full flex flex-col">
  {/* Title Section - flexible, grows with content */}
  <div className="flex items-start gap-3 flex-1">
    <div className="p-2 rounded-xl bg-muted/80 flex-shrink-0 shadow-sm">
      <Target className="h-4 w-4 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-sm leading-tight">
      {name}
    </h3>
  </div>
  
  {/* Bottom Section - fixed position, anchored to bottom */}
  <div className="mt-auto">
    {/* Status Row */}
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground">
        {classification}
      </span>
      <div className="flex items-center gap-2">
        <RAGBadge status={displayStatus} size="sm" />
        <span className="text-base font-bold">{percentage}%</span>
      </div>
    </div>
    
    {/* Progress Bar */}
    <Progress ... />
  </div>
</div>
```

### Key Changes

| Element | Before | After |
|---------|--------|-------|
| Title container | `min-h-[56px]` (min height) | `flex-1` (takes available space) |
| Status row | `mt-2 mb-3` (relative to title) | Inside `mt-auto` wrapper (anchored to bottom) |
| Progress bar | Separate with `mt-auto` | Inside same bottom wrapper |

---

## How Alignment Works

1. **CSS Grid** (parent): All cards in the row have the same height (tallest card wins)
2. **h-full**: Each card fills its grid cell completely
3. **flex-col** + **flex-1**: Title area expands to fill available space
4. **mt-auto wrapper**: Classification badge + progress bar group sticks to the bottom

This means regardless of how many lines the title takes, the CORE/Enabler badges, RAG status, and progress bars will always be at the exact same vertical position across all cards.

---

## Visual Result

```text
Card 1               Card 2               Card 3
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Brand &          │ │ Customer         │ │ Operational      │
│ Reputation       │ │ Experience &     │ │ Excellence &     │
│                  │ │ Success          │ │ Cybersecurity    │
│                  │ │                  │ │ Resilience       │
│                  │ │                  │ │                  │
├──────────────────┤ ├──────────────────┤ ├──────────────────┤ ← Same line
│ [CORE]    [G]85% │ │ [CORE]    [A]72% │ │ [Enabler] [R]68% │
│ ▓▓▓▓▓▓▓░░░░░░░░░ │ │ ▓▓▓▓▓▓░░░░░░░░░░ │ │ ▓▓▓▓▓░░░░░░░░░░░ │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

All CORE/Enabler badges perfectly aligned horizontally ✓

