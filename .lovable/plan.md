

# Simplified CSM-Focused Compliance PPT

## Problem
The current PPT has too many slides -- a flat customer table, per-CSM slides, AND per-customer detail slides. The user wants fewer slides but more actionable CSM-centric information: who filled, what percentage, what's missing.

## New PPT Structure (4 slide types instead of current 5)

### Slide 1: Title (keep as-is)
Period, generation date, branding.

### Slide 2: CSM Leaderboard Summary (replaces old summary + flat customer table)
- A single table ranking all CSMs by completion %
- Columns: CSM Name | Email | Customers | Filled/Expected | Completion % | Status
- Color-coded completion % (green >= 80, amber >= 50, red < 50)
- Shows pending CSMs at bottom in red

### Slide 3+ (one per CSM): CSM Detail Slide (enhanced)
For each CSM, one slide with:
- **Header**: CSM name, email
- **Stats row**: Total Customers, Submitted count, Pending count, Completion %
- **Customers table** with columns: Customer | Type (CSM/CM) | Filled/Expected | Completion % | Status
- **"Not Filled" section**: Below the table, a bulleted list of customer names that are still Pending or Partial, with what's missing (e.g., "CustomerX - 3/8 filled, missing 5 indicators")

### Remove: Per-Customer Feature Detail Slides
These are too granular for a management report. The CSM slides now include what's missing per customer inline.

## Changes

### File: `src/pages/ComplianceReport.tsx` -- `handleDownload` function (lines 279-598)

Rewrite the PPT generation:

1. **Slide 1 (Title)**: Keep existing title slide logic unchanged.

2. **Slide 2 (CSM Leaderboard)**: 
   - Group `rows` by `csmName`
   - For each CSM: compute total customers, filled count, expected count, completion %
   - Sort by completion % ascending (worst first, so action items are at top)
   - Render as a single table with header + one row per CSM

3. **Slides 3+ (Per-CSM Detail)**:
   - Keep existing per-CSM slide logic (lines 410-505) but enhance:
   - Remove `Prev %`, `Current %`, `Trend` columns (too complex per user request)
   - Replace with simpler: Customer | Type | Filled/Expected | Completion % | Status
   - Add a "Missing" text block below the table listing customers that are Partial/Pending with their gap (e.g., "CustomerX: 3/8 filled")
   - If more than ~10 customers for a CSM, paginate across multiple slides

4. **Remove**: Per-customer feature detail slides (lines 507-590) -- delete entirely

This reduces total slide count significantly while giving more actionable CSM-level detail.

## Technical Details

- Only `src/pages/ComplianceReport.tsx` is modified (the `handleDownload` function)
- No database or component changes needed
- PPT library usage remains the same (PptxGenJS)
- Color scheme and styling constants remain the same

