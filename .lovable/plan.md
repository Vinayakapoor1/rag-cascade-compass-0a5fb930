

# Enhanced Compliance Report: Per-Customer Pending Data View

## What It Does
Redesign the existing Compliance Report page (`/compliance-report`) to show a detailed breakdown of **which specific customers are pending data entry** for each CSM, for the current period. This gives you an actionable view of exactly what's missing and from whom.

## Key Changes

### 1. Add a detailed "Pending Data" table
Below the existing summary cards, add an expandable table grouped by CSM, showing:
- CSM name and email
- Each customer assigned to them
- Whether that customer has scores submitted for the current period
- Status badge: "Submitted" (green) or "Pending" (red)
- Number of scores submitted vs total expected (features x indicators)

### 2. Add an "All Time" vs "Current Period" toggle
- Allow switching between viewing current period compliance and all-time compliance
- "All Time" view shows CSMs who have NEVER submitted any data since inception
- "Current Period" (default) shows what's pending for this month

### 3. Add a per-customer drill-down in the pending section
Instead of just listing customer names as small badges, show them as rows in a table with columns:
- Customer Name
- CSM Name
- Features scored / Total features
- Last submission date (if any, from any period)
- Status

### 4. Add summary stats
- Total customers pending
- Total customers completed
- Percentage completion for the period

## Technical Details

### File: `src/pages/ComplianceReport.tsx`

**New queries to add:**
- Fetch all `indicator_feature_links` to know the total expected scores per customer
- Fetch scores grouped by `customer_id` with count to show progress per customer
- Fetch historical scores (without period filter) for the "all time" toggle

**UI changes:**
- Add a `Tabs` component with "Current Period" and "All Time" views
- Replace the badge-based pending customer list with a proper `Table` component
- Each row: Customer name, CSM name, scores submitted count, status badge
- Add a search/filter input to quickly find a specific customer or CSM
- Sortable columns (by CSM name, customer name, status)

**Data structure:**
```text
For each CSM:
  For each assigned customer:
    - customer_name
    - scores_this_period (count of csm_customer_feature_scores rows)
    - total_expected (count of indicator_feature_links for applicable features)
    - last_ever_submission (max created_at from any period)
    - status: "complete" | "partial" | "pending"
```

### No database changes needed
All required data is already available in existing tables.

### No new routes needed
This enhances the existing `/compliance-report` page.
