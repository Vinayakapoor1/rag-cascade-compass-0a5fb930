

# Shining Yellow "Friday Check-In" Banner

## What Changes

Replace the current small red/destructive banner across all 3 data entry pages with a prominent, animated yellow/amber banner that shines to grab attention.

## Banner Design

- **Background**: Amber/yellow gradient (`from-amber-400 to-yellow-300`, dark mode: `from-amber-600 to-yellow-500`)
- **Text**: Bold, larger copy with a better write-up:
  - Headline: "Weekly Check-In Required Every Friday"
  - Subtext: "All team members must complete their data entry and submit a check-in before end of day Friday. Incomplete check-ins will be flagged."
- **Animation**: A subtle shimmer/shine effect sweeping across the banner using a CSS keyframe animation
- **Icon**: Keep `AlertTriangle` but in a darker amber tone for contrast

## CSS Animation (src/index.css)

Add a `@keyframes banner-shine` animation that creates a diagonal light sweep across the banner, giving it a "shining" effect. Apply via `.animate-banner-shine` class.

## Files to Update

1. **src/index.css** -- Add `banner-shine` keyframe and utility class
2. **src/pages/CSMDataEntry.tsx** (lines 279-285) -- Replace destructive banner with yellow shining banner
3. **src/pages/ContentManagementDataEntry.tsx** (lines 199-205) -- Same replacement
4. **src/pages/DepartmentDataEntry.tsx** (lines 635-641) -- Same replacement

## Banner Markup (applied identically in all 3 files)

```text
+--------------------------------------------------------------+
| [!] Weekly Check-In Required Every Friday                     |
|     All team members must complete their data entry and       |
|     submit before end of day Friday.                          |
+--------------------------------------------------------------+
```

Styled with:
- `bg-gradient-to-r from-amber-400 to-yellow-300` (light), `dark:from-amber-600 dark:to-yellow-500`
- `text-amber-950 dark:text-amber-50`
- Overflow hidden + pseudo-element shimmer via the CSS class
- Rounded corners, padding, bold text
