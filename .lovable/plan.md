

# Fix Customer Edit Dialog: Missing Data, Scrolling, and Correct Dropdowns

## Problems Found

1. **Tier values mismatch** -- The dropdown shows "Tier 1", "Tier 2", "Tier 3" but the database stores "Tier1", "Tier2" (no spaces), plus "Unassigned". So when editing, the saved value doesn't match any option and appears blank.

2. **Deployment type incomplete** -- Dropdown only has Cloud/On Prem/Hybrid, but the database also allows "India Cloud", "UAE Cloud", "Private Cloud". These values exist in data but can't be selected or shown.

3. **Region is free text** -- Should be a dropdown with the 3 known values: India, Middle East, Others.

4. **Industry is free text** -- Should be a dropdown with the 19 known industry values from the database.

5. **CSM field broken** -- The form uses a free-text `csm` field, but the actual database column is `csm_id` (a UUID foreign key to the `csms` table). So the CSM is never loaded or saved correctly. Should be a dropdown populated from the `csms` table.

6. **Dialog not scrollable** -- The ScrollArea likely isn't working because the Radix ScrollArea viewport needs explicit height constraints.

## Changes

### File: `src/components/CustomerFormDialog.tsx`

**1. Fix the Customer interface:**
- Remove `csm?: string`, add `csm_id?: string`
- Keep other fields

**2. Add CSM data fetching:**
- Fetch all CSMs from `csms` table on dialog open
- Store in state as `{ id, name }[]`

**3. Replace free-text inputs with dropdowns:**

| Field | Current | New |
|-------|---------|-----|
| Tier | Dropdown with "Tier 1/2/3" | Dropdown with "Tier1", "Tier2", "Unassigned" (matching DB values) |
| Region | Free text Input | Select dropdown: India, Middle East, Others |
| Industry | Free text Input | Select dropdown with all 19 industries from DB |
| CSM | Free text Input | Select dropdown populated from `csms` table, saving `csm_id` |
| Deployment Type | Cloud/On Prem/Hybrid | Add India Cloud, UAE Cloud, Private Cloud |

**4. Fix form data initialization:**
- When editing, load `csm_id` from the customer record
- Map CSM name for display

**5. Fix submit data:**
- Send `csm_id` instead of `csm` field
- Remove `csm` from submit payload

**6. Fix ScrollArea scrolling:**
- Add explicit `max-h-[calc(90vh-180px)]` to the ScrollArea so it has a bounded height and can scroll

### No database changes needed
All the correct columns and values already exist.

