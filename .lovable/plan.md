
# Bulk Industry Update + Managed Services Stats

## Two Changes

### 1. Bulk Industry Updater (Admin Panel - Data Management > Customers tab)

Add a new "Update Industry" uploader component alongside the existing `CustomerUploader` on the Data Management page. This uploader will:

- Accept an Excel file with two columns: **Company Name** and **Industry**
- Parse the file and show a preview of how many customers will be updated
- On import, **only update the `industry` column** -- no other fields will be touched (no upsert of the full record, no deletion of feature links)
- Match customers by name (case-insensitive) against existing records
- Show warnings for any company names not found in the database
- Log the bulk update action to `activity_logs`

This is deliberately separate from the full `CustomerUploader` to prevent accidental overwrites of other fields.

### 2. Managed Services Stats (Customers Overview)

Update `CustomersOverviewTab` to fetch the `managed_services` field and display summary stat badges showing:
- Total customers with Managed Services
- Total customers without Managed Services

These will appear as stat cards above the table.

---

## Technical Details

### New file: `src/components/admin/CustomerIndustryUpdater.tsx`
- Excel upload + preview UI (similar pattern to `CustomerUploader`)
- Parses Excel for "Company Name" and "Industry" columns
- Matches against existing customers by name (case-insensitive)
- Calls `supabase.from('customers').update({ industry }).eq('id', matchedId)` for each match
- Shows count of matched vs unmatched customers in preview
- Only the `industry` column is written -- all other data remains untouched

### Modified file: `src/pages/DataManagement.tsx`
- Import and render `CustomerIndustryUpdater` below the existing `CustomerUploader` in the "customers" tab

### Modified file: `src/components/admin/CustomersOverviewTab.tsx`
- Add `managed_services` to the customer query
- Compute counts: `withManagedServices` and `withoutManagedServices`
- Render two small stat badges/cards above the table (e.g., "Managed Services: 42" and "Without: 58")
