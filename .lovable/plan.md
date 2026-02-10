
# Venture Selector Button

## Overview
Add a **Venture Selector** dropdown button to the top-right of the Portfolio page (alongside the OKR Structure and RAG Legend buttons). This selector acts as a data lens/filter -- selecting a venture scopes all displayed data to that product. Currently, all data maps to **HumanFirewall**. Future ventures include EmailRemediator, CyberForceHQ, SecurityRating, etc.

## What This Involves

### 1. Database: Create a `ventures` table
A new table to store available ventures/products:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| name | text | e.g. "HumanFirewall" |
| display_name | text | e.g. "Human Firewall" |
| description | text | Optional |
| is_active | boolean | Default true |
| created_at | timestamptz | Auto |

Seed it with:
- **HumanFirewall** (active, default)
- **EmailRemediator** (inactive placeholder)
- **CyberForceHQ** (inactive placeholder)
- **SecurityRating** (inactive placeholder)

Also add a `venture_id` column to `org_objectives` so each objective can be associated with a venture. All existing objectives will default to the HumanFirewall venture.

### 2. UI: Venture Selector Component
A new `VentureSelector` component -- a dropdown button styled consistently with the existing OKR Structure and RAG Legend buttons. It will:
- Show the currently selected venture name (defaults to "HumanFirewall")
- List all active ventures in a dropdown
- Inactive ventures shown greyed out with a "Coming Soon" badge
- Store the selection in React state (passed down via the Portfolio page)

### 3. Data Filtering
The `useOrgObjectives` hook will accept an optional `ventureId` parameter. When provided, the query filters `org_objectives` by that venture. Since all current data belongs to HumanFirewall, selecting it shows everything as-is. Selecting a future venture would show an empty state until data is imported for it.

## Files to Create/Modify

| File | Change |
|------|--------|
| **Migration SQL** | Create `ventures` table, seed 4 ventures, add `venture_id` to `org_objectives`, backfill existing rows |
| `src/components/VentureSelector.tsx` | **New** -- dropdown button component |
| `src/pages/Portfolio.tsx` | Add VentureSelector to the top-right button row, pass selected venture to data hook |
| `src/hooks/useOrgObjectives.tsx` | Accept optional `ventureId` filter parameter |

## Visual Layout

The top-right area of Portfolio will look like:

```text
[HumanFirewall v]  [OKR Structure]  [RAG Legend]
```

The dropdown when clicked:

```text
+---------------------------+
| HumanFirewall        (check) |
| EmailRemediator   Coming Soon |
| CyberForceHQ      Coming Soon |
| SecurityRating    Coming Soon |
+---------------------------+
```

## Technical Notes
- The `ventures` table gets RLS policies allowing all authenticated users to read ventures
- The `venture_id` foreign key on `org_objectives` is nullable initially for backward compatibility, then backfilled to HumanFirewall's ID
- Selected venture is stored in component state (no persistence needed yet -- defaults to HumanFirewall on page load)
