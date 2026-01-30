
# Fix Dark Mode Logo + Show Full Date in Activity Logs

## Issues to Fix

| # | Issue | Root Cause |
|---|-------|------------|
| 1 | **Logo not visible in dark mode** | `brightness(1.8)` filter only makes colors brighter, doesn't turn black text to white |
| 2 | **Activity logs show relative time only** | Uses `formatDistanceToNow()` which shows "2 hours ago" instead of full date |

---

## Solution 1: Dark Mode Logo Fix

### The Problem

The current logo has:
- **Red text**: "Kla" and "VENTURES" 
- **Black text**: "Rity", "by", "INFOSEC"

In dark mode, the black text disappears against the dark background. The `brightness(1.8)` filter just makes colors lighter but doesn't effectively convert black to white.

### The Solution

Use `filter: invert(1) brightness(2)` which:
1. **Inverts** all colors (black → white, red → cyan)
2. **Increases brightness** to make the inverted colors pop

However, this changes red to cyan which may not be ideal. A better approach is to use `filter: brightness(0) invert(1)` which:
1. Makes everything black first
2. Then inverts to white

**Result**: The entire logo becomes white, which provides excellent contrast on dark backgrounds while maintaining brand recognition through the shape.

### CSS Change

**File**: `src/index.css`

```css
/* Dark mode logo adjustment - make dark text visible */
.logo-dark-mode-adjust {
    @apply transition-all duration-300;
}

.dark .logo-dark-mode-adjust {
    filter: brightness(0) invert(1);
}
```

This makes the entire logo white in dark mode, which is a common approach for logos with dark text portions.

---

## Solution 2: Show Full Date in Activity Logs

### Current Behavior
```text
Updated 2 hours ago
```

### Desired Behavior
```text
Jan 30, 2026, 2:45 PM
```

### Files to Update

Both activity log components need to change from `formatDistanceToNow()` to `format()`:

1. **`src/components/ActivityTimelineMini.tsx`** (line 221)
2. **`src/components/ActivityTimelineWidget.tsx`** (line 271)

### Code Change

```typescript
// Import format function from date-fns
import { format } from 'date-fns';

// Replace:
{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}

// With:
{format(new Date(log.created_at), 'MMM d, yyyy, h:mm a')}
```

**Format explanation**:
- `MMM` = Short month name (Jan, Feb, Mar)
- `d` = Day of month (1-31)
- `yyyy` = Full year (2026)
- `h:mm` = Hour and minutes (2:45)
- `a` = AM/PM

---

## Implementation Summary

| File | Change |
|------|--------|
| `src/index.css` | Update dark logo filter from `brightness(1.8)` to `brightness(0) invert(1)` |
| `src/components/ActivityTimelineMini.tsx` | Change date format from relative to full date |
| `src/components/ActivityTimelineWidget.tsx` | Change date format from relative to full date |

---

## Visual Preview

### Dark Mode Logo (Before vs After)

```text
Before:  KlaRity              (Rity invisible)
         by INFOSEC VENTURES  (INFOSEC invisible)

After:   KlaRity              (entire logo white)
         by INFOSEC VENTURES  (fully visible)
```

### Activity Log Date (Before vs After)

```text
Before:  📅 2 hours ago
After:   📅 Jan 30, 2026, 2:45 PM
```
