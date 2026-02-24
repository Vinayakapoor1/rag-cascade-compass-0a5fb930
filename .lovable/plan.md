
# Add Managed Services Breakdown to Customers Page

## What Changes

Add a "By Managed Services" stat card to the filter breakdown section on the /customers page, matching the style of the existing cards (By Region, By Industry, etc.). It will show counts for "With Managed Services" and "Without Managed Services".

## Technical Steps

### 1. Update `src/hooks/useCustomerImpact.tsx`
- Add `managed_services` to the customer query select string (line 375): append `, managed_services` to the select
- Add `managedServices: boolean | null` to the `CustomerWithImpact` interface
- Map `c.managed_services` to `managedServices` in the return object (around line 516-531)

### 2. Update `src/pages/CustomersPage.tsx`
- Add a new breakdown entry in the `filterBreakdowns` useMemo (around line 220-227):
  ```
  countBy(c => c.managedServices === true ? 'Yes' : c.managedServices === false ? 'No' : 'Unknown', 'By Managed Services', 'settings')
  ```
- This will render as a stat card with the Settings icon, showing counts like "Yes: 42" and "No: 41", consistent with the existing breakdown cards
- Import the `Settings` icon (already imported on line 14)
- Add `'settings': Settings` to the icon mapping object (line 327)
