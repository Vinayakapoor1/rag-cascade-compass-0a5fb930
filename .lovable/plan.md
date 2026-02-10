

# CSM Registration and Data Entry Flow

## Current State

Right now, the system has a gap: **11 CSMs exist in the database as names only** (Abhay Singh, Kanika Singhal, etc.), with no email addresses and no linked user accounts. This means there is no way for a CSM to log in and enter data for their assigned customers.

The existing roles are:
- **Admin** (4 users) -- full access to everything
- **Department Head** (2 users) -- can enter data for assigned departments
- **Viewer** -- read-only

There is no "CSM" role, and no self-service way for CSMs to register and get linked to their CSM record.

## Proposed Flow

```text
+------------------+     +------------------+     +-------------------+
|  CSM signs up    | --> | Admin assigns    | --> | CSM logs in and   |
|  at /auth page   |     | "csm" role +     |     | sees only their   |
|  (email/password)|     | links to CSM     |     | customers in the  |
|                  |     | record           |     | Feature Matrix    |
+------------------+     +------------------+     +-------------------+
```

### Step-by-step:

1. **CSM creates an account** at the existing `/auth` page using their email.
2. **Admin goes to Team Access** tab in the Admin Dashboard and assigns:
   - Role: "CSM" (new role option)
   - Links the user to their CSM record (dropdown of existing CSM names)
3. **CSM logs in** and sees a "Enter Data" button in the header (like department heads do).
4. **CSM clicks "Enter Data"** and is taken to a dedicated CSM data entry page showing only their assigned customers in the Feature Matrix.

## Technical Changes

### 1. Database Changes

**Add "csm" to the app_role enum:**
```sql
ALTER TYPE public.app_role ADD VALUE 'csm';
```

**Add email addresses to the CSMs table** (already has `email` and `user_id` columns, they just need to be populated when linking).

### 2. Update Team Access Tab (`src/components/admin/TeamAccessTab.tsx`)

- Add "CSM" as a role option in the role dropdown (alongside Viewer, Department Head, Admin).
- When "CSM" role is selected, show a dropdown of CSM records (from the `csms` table) to link the user to.
- On save, update the `csms` table to set `user_id` and `email` for the selected CSM record.

### 3. Update Auth Hook (`src/hooks/useAuth.tsx`)

- Add `isCSM: boolean` to the auth context.
- Add `csmId: string | null` to the context (the linked CSM record ID).
- Check for `csm` role the same way `isDepartmentHead` is checked.
- Fetch the CSM record's ID by matching `user_id`.

### 4. Update App Layout (`src/components/AppLayout.tsx`)

- Show an "Enter Data" button for CSM users (similar to department heads).
- The button navigates to a new CSM-specific data entry page.

### 5. Create CSM Data Entry Page

- New page at route `/csm/data-entry`.
- Fetches the department(s) that the CSM's customers belong to (via customer -> features -> indicators -> department chain).
- Renders the existing `CSMDataEntryMatrix` component, which already filters by `user_id` in the `csms` table.
- Includes period selector (same as department data entry).

### 6. Update Routing (`src/App.tsx`)

- Add route: `/csm/data-entry` pointing to the new CSM data entry page.

## Files to Create/Modify

1. **New migration SQL** -- Add 'csm' value to `app_role` enum
2. **`src/components/admin/TeamAccessTab.tsx`** -- Add CSM role option and CSM record linking dropdown
3. **`src/hooks/useAuth.tsx`** -- Add `isCSM` and `csmId` to auth context
4. **`src/components/AppLayout.tsx`** -- Show "Enter Data" button for CSMs
5. **`src/pages/CSMDataEntry.tsx`** (new) -- Dedicated CSM data entry page with period selector and the Feature Matrix
6. **`src/App.tsx`** -- Add CSM data entry route

## Access Control Summary

| Role | Can See | Can Edit |
|------|---------|----------|
| Admin | Everything | Everything |
| Department Head | Assigned departments | Indicators for assigned departments |
| CSM | Own assigned customers only | Feature scores for own customers only |
| Viewer | Portfolio overview | Nothing |

