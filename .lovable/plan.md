
# Fix Light Mode Button Visibility Issues

## Problem Analysis

Based on the screenshot and code review, there are visibility issues with certain buttons and interactive elements in light mode when hovering:

| Element | Issue | Root Cause |
|---------|-------|------------|
| Ghost buttons (e.g., "Clear Filter") | May become hard to read on hover | The ghost variant uses `hover:bg-accent hover:text-accent-foreground` which was recently changed |
| Outline buttons with custom classes | Inconsistent hover states | Some use `hover-glow` without explicit text color preservation |
| Button text disappearing | Text becomes same color as background | The accent change may have affected text contrast |

---

## Solution Overview

### Step 1: Refine Light Mode Accent Colors

Update the CSS variables in `src/index.css` to ensure proper contrast for hover states in light mode:

```css
/* Light mode - ensure accent provides good contrast */
--accent: 0 0% 93%;  /* Slightly darker background */
--accent-foreground: 0 0% 10%;  /* Dark text for readability */
```

### Step 2: Add Explicit Hover Styles to Ghost Buttons

Update the button component or specific instances to ensure text remains visible on hover:

**File**: `src/components/ui/button.tsx`

Change the ghost variant to include more explicit light mode contrast:
```typescript
ghost: "hover:bg-accent hover:text-accent-foreground",
// Change to:
ghost: "hover:bg-muted hover:text-foreground",
```

This ensures:
- Light mode: Uses the subtle muted background with dark foreground text
- Dark mode: Still works correctly with the existing muted color scheme

### Step 3: Update Outline Button Hover States

For outline buttons that currently use only `hover:bg-accent`, add explicit text color:

**File**: `src/components/ui/button.tsx`

```typescript
outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
// Change to:
outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
```

---

## Technical Details

### CSS Variable Changes

**File**: `src/index.css`

In the `:root` (light mode) section, update:
```css
/* Before */
--accent: 0 0% 95%;
--accent-foreground: 0 0% 8%;

/* After - using muted for better consistency */
/* Keep accent for other uses, but buttons will now use muted */
```

### Button Component Changes

**File**: `src/components/ui/button.tsx`

```typescript
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-muted hover:text-foreground",  // Changed
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",  // Changed
        link: "text-primary underline-offset-4 hover:underline",
      },
      // ... rest unchanged
    },
  },
);
```

---

## Why This Works

1. **`muted` is designed for subtle backgrounds**: It's specifically styled for both light and dark modes with proper contrast
2. **`foreground` ensures readable text**: Using `text-foreground` instead of `text-accent-foreground` guarantees the text stays the standard readable color
3. **Consistent across themes**: The muted color variables are already properly set for both light and dark modes

---

## Visual Comparison

| State | Before | After |
|-------|--------|-------|
| Ghost button (light mode, hover) | Light gray bg, possibly invisible text | Light gray bg, dark text (visible) |
| Outline button (light mode, hover) | Similar issue | Proper contrast maintained |
| Ghost button (dark mode, hover) | Works correctly | Still works correctly |

---

## Files to Modify

1. **`src/components/ui/button.tsx`**: Update ghost and outline variant hover classes
2. **`src/index.css`** (optional): Ensure accent variables have proper contrast values

---

## Implementation Notes

- This is a minimal change that fixes the visibility issue
- No changes to component logic, only styling classes
- Backwards compatible with existing button usage
- Works correctly in both light and dark modes
