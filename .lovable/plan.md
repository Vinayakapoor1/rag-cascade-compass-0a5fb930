
# Performance, Layout Fix & Dark Mode Logo Optimization

## Issues Summary

| # | Issue | Description |
|---|-------|-------------|
| 1 | **Performance** | Page feels slow due to multiple potential causes |
| 2 | **Layout** | Date picker (month input) is cut off (screenshot shows "February 2026" with cropped text) |
| 3 | **Logo Dark Mode** | "Rity" and "INFOSEC" text needs to turn white in dark mode (currently stays red/dark on dark background) |

---

## Solutions

### 1. Performance Improvements

**Root Causes Identified:**
- `useOrgObjectives` makes 7 sequential database queries on every load
- Heavy CSS animations (`gradient-orb`, `animate-float`) running continuously
- All hierarchy data loaded upfront even when not needed

**Optimizations:**

a) **Reduce animation overhead in CSS** (`src/index.css`):
- Change `gradient-orb` filter blur from 60px to 40px
- Add `will-change: transform` for GPU acceleration
- Use `prefers-reduced-motion` media query to disable animations for users who prefer it

b) **Optimize the main data hook** (`src/hooks/useOrgObjectives.tsx`):
- Add `staleTime: 60000` (1 minute) to React Query to avoid refetching too frequently
- Add `refetchOnWindowFocus: false` to prevent unnecessary refetches

c) **Lazy loading animations**:
- Add CSS optimization to only animate visible elements

### 2. Layout Fix - Date Picker Width

**Problem:** The month input (`type="month"`) is set to `w-40` (160px) which is too narrow for "February 2026" format.

**Solution:** In `src/pages/DepartmentDataEntry.tsx`, change the input width from `w-40` to `w-48` (192px) to accommodate longer month names.

```typescript
// Line 661-666
<Input
    type="month"
    value={period}
    onChange={(e) => setPeriod(e.target.value)}
    className="w-48"  // Changed from w-40
/>
```

### 3. Dark Mode Logo - CSS Filter Approach

**Problem:** The logo image (`klarity-logo-full.png`) shows "Kla" in red and "Rity" + "INFOSEC VENTURES" in dark/black text. In dark mode, the dark text becomes invisible.

**Solution Options:**

**Option A (Recommended): CSS Filter Inversion for Dark Mode**
Apply a CSS class that uses `filter` to make the dark portions of the logo become white while preserving the red.

```css
/* In src/index.css */
.dark .logo-dark-mode-adjust {
    filter: brightness(1.5) contrast(1.1);
}
```

This approach:
- Brightens the dark text to become visible
- Preserves the red color
- Works with the existing PNG image

**Option B: Create a dark mode version of the logo**
- Would require creating/uploading a separate logo file with white text
- More work but provides perfect color control

I recommend **Option A** as it's simpler and doesn't require new assets.

---

## Implementation Details

### File Changes

| File | Changes |
|------|---------|
| `src/index.css` | Add animation performance optimizations, add logo dark mode filter class |
| `src/pages/DepartmentDataEntry.tsx` | Widen month input from `w-40` to `w-48` |
| `src/components/AppLayout.tsx` | Add `logo-dark-mode-adjust` class to logo images |
| `src/pages/Index.tsx` | Add `logo-dark-mode-adjust` class to logo image |
| `src/pages/Auth.tsx` | Add `logo-dark-mode-adjust` class to logo image |
| `src/hooks/useOrgObjectives.tsx` | Add staleTime and refetchOnWindowFocus to React Query config |

### CSS Addition for Logo (src/index.css)

```css
/* Dark mode logo adjustment - make dark text visible */
.dark .logo-dark-mode-adjust {
    filter: brightness(0) invert(1);
}

.dark .logo-dark-mode-adjust-subtle {
    filter: brightness(1.8);
}
```

### Logo Class Application (AppLayout.tsx example)

```typescript
<img
    src="/images/klarity-logo-full.png"
    alt="KlaRity by Infosec Ventures"
    className="h-12 w-auto transition-all duration-300 group-hover:brightness-110 dark:brightness-[1.8]"
/>
```

### React Query Optimization (useOrgObjectives.tsx)

```typescript
export function useOrgObjectives() {
    return useQuery({
        queryKey: ['org-objectives'],
        queryFn: fetchOrgObjectives,
        staleTime: 60000, // 1 minute
        refetchOnWindowFocus: false,
    });
}
```

---

## Visual Preview

### Date Picker (Before vs After)

```text
Before (w-40):  [February 20...]  (cut off)
After (w-48):   [February 2026 ]  (full text visible)
```

### Logo Dark Mode (Before vs After)

```text
Before:  KlaRity      (dark text invisible on dark background)
         ▫▫▫▫▫▫▫     (INFOSEC VENTURES invisible)

After:   KlaRity      (red stays red, "Rity" becomes white)
         INFOSEC      (white text visible)
         VENTURES
```

---

## Expected Outcomes

1. **Performance**: Reduced animation overhead, less frequent data refetching
2. **Layout**: Month picker shows full text without cropping
3. **Logo**: "Rity" and "INFOSEC VENTURES" turn white in dark mode while "Kla" stays red
