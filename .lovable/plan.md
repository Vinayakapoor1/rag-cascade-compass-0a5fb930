
# Connect Customer Form Industry Dropdown to Managed Industries

## What Changes

Update the `CustomerFormDialog` so the **Industry** dropdown pulls its options from the `industries` database table (managed via the Industry Manager in Configuration) instead of using a hardcoded list.

This means any industry added, edited, or removed in the Industry Manager will immediately appear in the customer add/edit form.

## Technical Steps

### Modified file: `src/components/CustomerFormDialog.tsx`

1. **Remove** the hardcoded `INDUSTRY_OPTIONS` array (lines 49-56)
2. **Add state** for dynamic industries: `const [industries, setIndustries] = useState<string[]>([]);`
3. **Add a fetch function** that queries `supabase.from('industries').select('name').order('name')` and maps results to a string array
4. **Call the fetch** inside the existing `useEffect` when `open` is true (alongside `fetchFeatures()` and `fetchCsms()`)
5. **Replace** `INDUSTRY_OPTIONS` reference in the Select dropdown (line 346) with the new `industries` state variable

No other files need changes -- the Industry Manager and industries table already exist and work correctly.
