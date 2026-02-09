

# Fix Customer Cards: Bigger Sparkline and Visible Feature Badges

## Changes to `src/pages/CustomersPage.tsx`

### 1. Enlarge the Sparkline Graph
Currently the sparkline is `w-20 h-8` (80px x 32px) -- too small. Will increase to `w-36 h-10` (144px x 40px) to better use the available row space. The "No trend" placeholder will also be widened to match.

- Line 32: Change `w-20` to `w-36` on the no-data fallback
- Line 40: Change `w-20 h-8` to `w-36 h-10` on the chart container

### 2. Fix Feature Badges Visibility
The feature badges use `bg-foreground/10 text-foreground/80` which can be nearly invisible depending on the theme. Will update to use more visible styling:

- Change feature badge classes from `bg-foreground/10 text-foreground/80` to `bg-primary/15 text-primary border border-primary/20` for better contrast and visibility
- Apply the same fix to the "+N more" hover card content badges
- Ensure the Tag icon and badges have enough contrast in both light and dark modes

### Files Modified
| File | Lines | Change |
|------|-------|--------|
| `src/pages/CustomersPage.tsx` | 32 | Widen no-data placeholder from `w-20` to `w-36` |
| `src/pages/CustomersPage.tsx` | 40 | Enlarge sparkline from `w-20 h-8` to `w-36 h-10` |
| `src/pages/CustomersPage.tsx` | 338, 345, 353 | Update badge styling for better visibility |

