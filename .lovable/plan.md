

# RBAC Visibility Control Panel

## What You'll Get

An admin-only "Visibility Settings" page (accessible from Admin Dashboard) that lets you define which **sections** each **role** can see on each **page**. A simple matrix of toggles: Page × Section × Role.

## Current Hardcoded Visibility (Today)

```text
Page                  Section                         Admin  DeptHead  DeptMember  CSM  ContentMgr
─────────────────────────────────────────────────────────────────────────────────────────────────────
Portfolio             Org Objectives                   ✅      ✅        ✅        ✅     ✅
Portfolio             Stats Cards                      ✅      ✅        ✅        ✅     ✅
Portfolio             RAG Filter Cards                 ✅      ✅        ✅        ✅     ✅
Portfolio             Departments                      ✅      ✅        ✅        ✅     ✅
Portfolio             Customer/Feature Counts          ✅      ✅        ✅        ✅     ✅
Portfolio             Sec+Tech Deployment Cards        ✅      ✅(CS/ST) ❌        ✅     ❌
Index                 CSM Compliance Widget            ✅      ❌        ❌        ✅     ❌
Index                 Team Leader Instructions         ❌      ✅        ❌        ❌     ❌
Index                 Data Management Link             ✅      ❌        ❌        ❌     ❌
Customers             Add/Edit/Delete Customer         ✅      ✅        ❌        ❌     ❌
Customers             Ops Health Filters               ✅      ✅        ✅        ✅     ✅
Features              Add/Edit Feature                 ✅      ❌        ❌        ❌     ❌
Data Entry Matrix     Sec+Tech Deployment Params       ✅      ✅(CS/ST) ❌        ❌     ❌
Data Entry Matrix     CM Indicators Sub-section        ✅      ✅(CS)    ❌        ✅     ❌
Header Nav            Admin Dashboard Button           ✅      ❌        ❌        ❌     ❌
Header Nav            Enter Data (CSM)                 ❌      ❌        ❌        ✅     ❌
Header Nav            Enter Data (CM)                  ❌      ❌        ❌        ❌     ✅
Header Nav            Enter Data (DeptHead/Member)     ❌      ✅        ✅        ❌     ❌
Admin Dashboard       All tabs                         ✅      ❌        ❌        ❌     ❌
```

## Implementation Plan

### Step 1 — Create `visibility_settings` table

```sql
CREATE TABLE visibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,        -- e.g. 'portfolio', 'customers', 'header'
  section text NOT NULL,     -- e.g. 'org_objectives', 'rag_filters', 'deployment_cards'
  role text NOT NULL,        -- e.g. 'admin', 'department_head', 'csm', 'department_member', 'content_manager'
  is_visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page, section, role)
);
```

Seed it with the current hardcoded defaults from the matrix above (~90 rows). RLS: admins can manage, all authenticated can read.

### Step 2 — Create `useVisibilitySettings` hook

A React hook that fetches all visibility settings on mount and provides a helper:
```ts
canSee(page: string, section: string): boolean
```
It cross-references the user's roles (from `useAuth`) against the DB settings. If no setting exists for a page/section/role combo, it defaults to `true` (backward compatible).

### Step 3 — Admin Visibility Settings page

Add a new tab "Visibility" in the Admin Dashboard. Renders a grouped table:
- Rows grouped by **Page** (Portfolio, Customers, Features, Header, Data Entry, etc.)
- Within each page, rows for each **Section**
- Columns for each **Role** (Admin, Dept Head, Dept Member, CSM, Content Manager)
- Each cell is a Switch toggle that updates the DB in real-time

### Step 4 — Wire up visibility checks across pages

Replace all hardcoded `isAdmin &&`, `isCSM &&`, `isDepartmentHead &&` visibility guards with `canSee('portfolio', 'deployment_cards')` calls from the hook. Pages affected:

- **`Portfolio.tsx`** — 5 sections (org objectives, stats, RAG filters, departments, deployment cards)
- **`CustomersPage.tsx`** — add/edit controls, ops health filters
- **`FeaturesPage.tsx`** — add/edit controls
- **`AppLayout.tsx`** — header nav buttons
- **`Index.tsx`** — compliance widget, team leader instructions
- **`CSMDataEntryMatrix.tsx`** — CM indicators, deployment params

### Step 5 — Route-level protection remains unchanged

`ProtectedRoute` and authentication flow stay exactly as-is. This RBAC layer controls **section visibility within pages**, not page access.

## What Does NOT Change
- Authentication flow, 2FA, session management
- Data scoping (department access, CSM customer filtering)
- RLS policies on all tables
- Any calculation or scoring logic
- Route-level protection

## Files Modified
1. **Database migration** — create `visibility_settings` table + seed defaults
2. **`src/hooks/useVisibilitySettings.ts`** — new hook
3. **`src/components/admin/VisibilitySettingsTab.tsx`** — new admin UI component
4. **`src/pages/AdminDashboard.tsx`** — add Visibility tab
5. **`src/pages/Portfolio.tsx`** — wrap sections with `canSee()` checks
6. **`src/pages/CustomersPage.tsx`** — wrap sections with `canSee()` checks
7. **`src/pages/FeaturesPage.tsx`** — wrap sections with `canSee()` checks
8. **`src/components/AppLayout.tsx`** — wrap nav buttons with `canSee()` checks
9. **`src/pages/Index.tsx`** — wrap sections with `canSee()` checks
10. **`src/components/user/CSMDataEntryMatrix.tsx`** — wrap sub-sections with `canSee()` checks

