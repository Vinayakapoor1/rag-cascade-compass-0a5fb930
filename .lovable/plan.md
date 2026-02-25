

# Content Management Data Entry Forms

## Overview
Create a dedicated Content Management data entry page that mirrors the existing CSM Data Entry flow, but is specifically scoped to:
- **Only the Content Management department** (auto-selected, no department picker)
- **Only customers with `managed_services = true`** (71 customers)
- **The 10 Content Management KPIs** from your uploaded spreadsheet (all already exist in the database)

## What Changes

### 1. New Page: Content Management Data Entry
**File:** `src/pages/ContentManagementDataEntry.tsx`

A new page at route `/content-management/data-entry` that:
- Has the same layout as CSM Data Entry (period selector, calendar picker, monthly/weekly toggle, instructions card)
- Automatically targets the "Content Management" department (looked up by name, no dropdown needed)
- Passes a new `managedServicesOnly={true}` prop to the matrix component
- Title: "Content Management Data Entry" with appropriate subtitle

### 2. Filter Managed Services Customers in Matrix
**File:** `src/components/user/CSMDataEntryMatrix.tsx`

Add an optional `managedServicesOnly?: boolean` prop:
- When `true`, after building the customer-feature map, query customers where `managed_services = true` and remove all non-managed-services customers from the matrix
- This is a small addition (~10 lines) to the existing query function
- All other matrix logic (bands, scoring, saving, aggregation, apply-to-row/column) works unchanged

### 3. New Role: `content_manager`
**Database migration** to add `content_manager` to the `app_role` enum.

This allows assigning users specifically for Content Management data entry, separate from CSM users. The auth hook will be updated to check for this role.

### 4. Auth Hook Update
**File:** `src/hooks/useAuth.tsx`

Add `isContentManager` boolean to the auth context, checked the same way as `isCSM` -- by querying `user_roles` for `role = 'content_manager'`.

### 5. Route and Navigation
**File:** `src/App.tsx`
- Add route: `/content-management/data-entry` pointing to the new page, wrapped in `ProtectedRoute` + `AppLayout`

**File:** `src/components/AppLayout.tsx`
- Add a "Content Management" button in the header for users with the `content_manager` role (similar to how CSM users see "Enter Data")
- Admins also see this button

### 6. Admin: Assign Content Manager Role
**File:** `src/components/admin/TeamAccessTab.tsx`
- Add "content_manager" as an assignable role in the team access management UI so admins can grant this role to users

## Technical Details

### Database Migration
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_manager';
```

### CSMDataEntryMatrix Prop Change
```typescript
interface CSMDataEntryMatrixProps {
  departmentId: string;
  period: string;
  managedServicesOnly?: boolean;  // NEW
}
```

In the query function, after building `custFeatureMap`:
```typescript
if (managedServicesOnly) {
  const { data: managedCusts } = await supabase
    .from('customers')
    .select('id')
    .eq('managed_services', true);
  const managedIds = new Set(managedCusts?.map(c => c.id));
  for (const custId of custFeatureMap.keys()) {
    if (!managedIds.has(custId)) custFeatureMap.delete(custId);
  }
}
```

### Files Summary
| File | Action |
|------|--------|
| `src/pages/ContentManagementDataEntry.tsx` | Create (mirrors CSMDataEntry pattern) |
| `src/components/user/CSMDataEntryMatrix.tsx` | Add `managedServicesOnly` prop + filter |
| `src/hooks/useAuth.tsx` | Add `isContentManager` role check |
| `src/components/AppLayout.tsx` | Add nav button for content managers |
| `src/App.tsx` | Add new route |
| `src/components/admin/TeamAccessTab.tsx` | Add content_manager as assignable role |
| Database migration | Add `content_manager` to `app_role` enum |

### No New Tables Required
All data storage uses existing tables (`csm_customer_feature_scores`, `indicators`, `indicator_history`, etc.). The 10 KPIs and their RAG bands are already configured in the database.

