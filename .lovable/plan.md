
# Fix Customer Edit Dialog: Status Toggle, Scrolling, and Full Data

## Problems Identified

1. **No quick Active/Inactive toggle** -- Users must open the full edit dialog just to change status.
2. **Edit dialog on CustomerDetailPage passes incomplete data** -- Missing `contact_person`, `email`, `csm_id`, `managed_services`, `logo_url`, and `deployment_type`. These fields appear blank when editing from the detail page.
3. **Edit dialog on CustomersPage also passes incomplete data** -- The `CustomerWithImpact` type lacks `contact_person`, `email`, `csm_id`, `managed_services`. The form receives partial data.
4. **Dialog scrolling** -- The dialog already has `ScrollArea` and `max-h-[90vh]`, but may not work well on smaller screens.

## Solution

### 1. Fix CustomerFormDialog to fetch full customer data from the database

Instead of relying on the parent to pass complete customer data, the dialog should fetch the full customer record from the database when a customer `id` is provided. This guarantees all fields are populated regardless of which page opens the dialog.

**Changes to `src/components/CustomerFormDialog.tsx`:**
- In the `useEffect` that runs when `open` changes, if `customer?.id` exists, fetch the full customer record from the database using `supabase.from('customers').select('*').eq('id', customer.id).single()`
- Populate `formData` from the fetched database record instead of the partial prop data
- This eliminates the need for every parent to pass all fields

### 2. Add a quick Status toggle on the Customers list page

**Changes to `src/pages/CustomersPage.tsx`:**
- Make the prominent status badge clickable (on the customer card)
- On click, toggle between Active/Inactive directly via a database update (no dialog needed)
- Show a loading state briefly during the toggle
- Call `refetch()` after the update

### 3. Ensure dialog scrolling works properly

**Changes to `src/components/CustomerFormDialog.tsx`:**
- Adjust `max-h-[calc(90vh-180px)]` to a more generous `max-h-[calc(85vh-140px)]` to account for header/footer
- Add `overflow-y-auto` as a fallback

### 4. Add Managed Services checkbox (currently in the form data but not rendered)

**Changes to `src/components/CustomerFormDialog.tsx`:**
- Add a checkbox field for "Managed Services" in the form so it can be viewed and edited

## Files to Modify

1. **`src/components/CustomerFormDialog.tsx`** -- Fetch full customer data from DB on open; fix scroll height; add managed services field
2. **`src/pages/CustomersPage.tsx`** -- Add quick status toggle on the status badge
3. **`src/pages/CustomerDetailPage.tsx`** -- Simplify the customer prop passed to the form (only `id` is needed now since the dialog fetches its own data)

## Technical Details

### CustomerFormDialog.tsx - Database fetch on open
```typescript
useEffect(() => {
  if (open) {
    fetchFeatures();
    fetchCsms();
    if (customer?.id) {
      // Fetch full customer data from database
      fetchFullCustomer(customer.id);
      fetchCustomerFeatures(customer.id);
    } else {
      resetForm();
    }
  }
}, [open, customer]);

const fetchFullCustomer = async (id: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  if (!error && data) {
    setFormData({
      name: data.name,
      contact_person: data.contact_person || '',
      email: data.email || '',
      region: data.region || '',
      tier: data.tier,
      industry: data.industry || '',
      csm_id: data.csm_id || '',
      status: data.status,
      managed_services: data.managed_services || false,
      logo_url: data.logo_url || '',
      deployment_type: data.deployment_type || '',
    });
    setLogoPreview(data.logo_url || null);
  }
};
```

### CustomersPage.tsx - Quick status toggle
```typescript
const toggleCustomerStatus = async (e, customer) => {
  e.preventDefault();
  e.stopPropagation();
  const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
  await supabase.from('customers')
    .update({ status: newStatus })
    .eq('id', customer.id);
  toast.success(`${customer.name} set to ${newStatus}`);
  refetch();
};
```

The status badge becomes a clickable button that toggles between Active and Inactive with a single click.
