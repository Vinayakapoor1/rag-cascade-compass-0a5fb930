
# Remove Mock Data

Two locations contain mock/placeholder data that should be cleaned up:

## 1. Customers Page Sparkline (`src/pages/CustomersPage.tsx`)

Currently, when a customer has fewer than 2 trend data points, a fake "Sample" sparkline is shown with three dashed colored lines and mock KPI names. This will be replaced with a simple empty state (e.g., a muted "No trend data" label or a flat line placeholder).

**What gets removed:**
- `MOCK_KPI_NAMES` constant (lines ~29-33)
- `MOCK_KPI_COLORS` constant (lines ~35-39)
- `MOCK_DATA` array inside `CustomerSparkline` (lines ~71-80)
- All `isMock` conditional branches (the "Sample" badge, dashed lines, extra kpi2/kpi3 Line elements, tooltip mock label)

**What replaces it:**
- When `data.length < 2`, render a small muted text like "No trend data yet" inside the sparkline container instead of fake lines.

## 2. Data Entry Timeline (`src/pages/DataEntryTimeline.tsx`)

The comment says "Mock user data" but the actual issue is that `user.email` is hardcoded to `'Unknown User'` instead of being fetched. This is a placeholder, not mock data per se.

**What changes:**
- Remove the misleading "Mock user data" comments (lines ~95-96, 98-99)
- Attempt to fetch the actual user email from `activity_log.user_id` via a profiles lookup, or fall back to displaying a truncated user ID instead of the generic "Unknown User" string.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/CustomersPage.tsx` | Remove all mock sparkline data and replace with empty state |
| `src/pages/DataEntryTimeline.tsx` | Remove misleading mock comments, show real user ID as fallback |
