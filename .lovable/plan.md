

# Fix Info Button Tooltips Not Showing

## Problem Analysis

The info buttons (ℹ️) for KPI formulas are not showing anything because:

| Issue | Cause | Impact |
|-------|-------|--------|
| **Long hover delay** | Radix UI `TooltipProvider` defaults to 700ms delay | Users hover briefly and move away before tooltip appears |
| **User expectation mismatch** | Users may be clicking the button expecting a popup | Tooltips only work on hover, not click |

The formula data IS being fetched correctly (confirmed in network requests showing formula text like "Key Acocunts with CSAT score ≥ 90% / Total key accounts assessed * 100").

---

## Solution

### Option 1: Quick Fix - Reduce Tooltip Delay

Update the `TooltipProvider` to show tooltips immediately (0ms delay):

```typescript
// Line 603 in DepartmentDataEntry.tsx
<TooltipProvider delayDuration={0}>
```

This makes the tooltip appear instantly on hover instead of waiting 700ms.

### Option 2: Add Click-to-Show Alternative (Enhanced UX)

For mobile users and those who expect click behavior, we can add `open` state management:

```typescript
// The Tooltip component can be controlled
<Tooltip open={openFormulaId === ind.id} onOpenChange={(open) => setOpenFormulaId(open ? ind.id : null)}>
    <TooltipTrigger asChild>
        <button onClick={() => setOpenFormulaId(openFormulaId === ind.id ? null : ind.id)}>
            <Info className="h-4 w-4" />
        </button>
    </TooltipTrigger>
    ...
</Tooltip>
```

---

## Implementation Plan

I recommend **Option 1** (quick fix) as the primary solution, with a small enhancement for better visibility:

### Step 1: Set Immediate Tooltip Delay

**File**: `src/pages/DepartmentDataEntry.tsx` (line 603)

Change:
```typescript
<TooltipProvider>
```

To:
```typescript
<TooltipProvider delayDuration={0}>
```

### Step 2: Visual Enhancement for Info Button

Make the info button more obviously interactive:

```typescript
<button
    type="button"
    className="p-1 rounded-full hover:bg-primary/10 transition-colors group"
    onClick={(e) => e.stopPropagation()}
>
    <Info className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
</button>
```

This makes the button:
- Have a subtle primary-colored background on hover
- Start with a more visible primary tint (instead of muted-foreground)
- Transition smoothly for better feedback

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/DepartmentDataEntry.tsx` | Add `delayDuration={0}` to TooltipProvider, enhance info button styling |

---

## Expected Result

After implementation:
1. Hovering over the ℹ️ icon will **immediately** show the formula tooltip
2. The formula text (e.g., "Key Accounts with CSAT score >= 90% / Total key accounts assessed * 100") will display in a styled popup
3. The button will be more visually prominent indicating it's interactive

