

# Rename "Type" to "Inclusion" and "CM" to "Content Management"

## Summary
Rename the "Type" column/label to "Inclusion" and expand the short "CM" badge text to "Content Management" across the compliance dashboard, table filters, PPT export, and data entry views.

## Changes

### 1. Compliance Customer Table (`src/components/compliance/ComplianceCustomerTable.tsx`)
- Badge next to customer name: `CM` -> `Content Management`
- Filter dropdown labels: `CM Only` -> `Content Management Only`, `CSM Only` stays as-is
- Widen the filter dropdown to accommodate longer text

### 2. Compliance Report PPT (`src/pages/ComplianceReport.tsx`)
- Per-CSM detail table header: `Type` -> `Inclusion`
- Cell values: `CM` -> `Content Management`, `CSM` stays as `CSM`
- Adjust column widths to fit longer "Content Management" text

### 3. CSM Data Entry Matrix (`src/components/user/CSMDataEntryMatrix.tsx`)
- Badge in accordion header: `CM` -> `Content Management`

All internal variable names (`isManagedServices`, `TypeFilter`, etc.) remain unchanged -- only user-facing labels are updated.
