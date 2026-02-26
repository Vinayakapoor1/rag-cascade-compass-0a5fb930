

# Animated Save Buttons Across All Data Entry Dashboards

## Current State
The `CSMDataEntryMatrix` component is already shared between both the CSM Data Entry (`/csm/data-entry`) and Content Management Data Entry (`/content-management/data-entry`) pages. The per-customer save functionality is already implemented in the shared component, so **both dashboards already have per-customer saves**.

The remaining request is to make save buttons visually "alive" with animation to draw attention.

## Changes

### 1. Add pulse animation to per-customer Save buttons
**File:** `src/components/user/CSMDataEntryMatrix.tsx`

- Detect if a customer has **unsaved changes** (scores differ from originalScores for that customer)
- When unsaved changes exist and the customer is NOT yet saved, apply a pulse/glow animation to the Save button
- Once saved (green "Saved" badge appears), stop the animation

### 2. Add pulse animation to the global "Update & Check In" button
**File:** `src/components/user/CSMDataEntryMatrix.tsx`

- When `hasChanges` is true OR any customers have been individually saved (ready for final check-in), pulse the "Update & Check In" button
- Use the same animation style for visual consistency

### 3. Add the animation CSS
**File:** `src/index.css`

- Add a `@keyframes save-pulse` animation with a subtle glow effect using the primary color
- Create a `.animate-save-pulse` utility class

### Technical Details

**New helper in CSMDataEntryMatrix:**
- `customerHasUnsavedChanges(section)` -- compares current scores vs originalScores for that customer's cells, returns true if any differ

**Button styling when active:**
- Per-customer Save: `animate-pulse ring-2 ring-primary/50 bg-primary text-primary-foreground` (switches from outline to filled + pulse)
- Update & Check In: `animate-pulse ring-2 ring-primary/50` when savedCustomers.size > 0 or hasChanges

**Props update for CustomerSectionCard:**
- Add `hasUnsavedChanges: boolean` prop so the card knows whether to animate its Save button

This approach uses Tailwind's built-in `animate-pulse` class combined with ring styling for a clean, attention-grabbing effect without custom CSS.

