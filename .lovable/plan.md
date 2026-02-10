

# Unified Customer Bulk Importer + Improved Matrix Template

## Problem 1: Confusing Matrix Template
The current scores template lists each customer name repeatedly (once per feature), making it hard to read. We will restructure it so **customer names appear once** as merged section headers, with features listed beneath.

## Problem 2: No Single-Sheet Customer Setup
Currently, CSM-to-customer mapping requires manual steps. The existing customer importer already supports a "CSM" column but there is no clear single-sheet path that also maps features. We will enhance the customer importer to handle everything in one sheet.

---

## Changes

### 1. Enhance Customer Excel Importer (`src/lib/customerExcelImporter.ts`)

The existing importer already supports these columns: Company Name, Contact Person, Email, Region, Tier, Industry, CSM, Features, Additional Features, Managed Services.

- **CSM mapping already works**: The importer creates CSM records and links them via `csm_id`.
- **Feature linking already works**: Comma-separated features in the "Features" column are parsed, created if missing, and linked via `customer_features`.
- **No schema changes needed** -- the existing database already has `customers.csm_id` referencing `csms.id`, and `customer_features` linking customers to features.

What we will improve:
- Update the **template** to include clearer sample data showing multiple CSMs and realistic feature lists.
- Add a **"Deployment Type"** column mapping (the DB already has this field).
- Show a **CSM mapping summary** in the import preview (e.g., "Sahil Kapoor: 5 customers, Pooja Singh: 8 customers").
- Show a **features-per-customer count** in the preview so users can verify mappings before importing.

### 2. Update the Customer Template (`generateCustomerTemplate`)

New sample data will include:
- Multiple customers with different CSMs
- Comma-separated feature lists matching existing features
- All relevant columns filled out realistically

### 3. Fix Matrix Excel Template (`src/lib/matrixExcelHelper.ts`)

Restructure the "Scores" sheet so each customer appears as a **section header row** (merged across all columns, highlighted), with feature rows beneath. This eliminates the repeated customer name on every row.

```
Before:
  Customer    | Feature         | Adoption | NPS | ...
  VOIS        | Phishing Email  | 85       | 72  | ...
  VOIS        | LMS             | 60       |     | ...
  VOIS        | Gamification    |          | 45  | ...
  DHA         | Phishing Email  | 90       | 80  | ...

After:
  VOIS  (merged header row, highlighted blue)
  Feature         | Adoption | NPS | ...
  Phishing Email  | 85       | 72  | ...
  LMS             | 60       |     | ...
  Gamification    |          | 45  | ...
  (blank separator row)
  DHA   (merged header row, highlighted blue)
  Feature         | Adoption | NPS | ...
  Phishing Email  | 90       | 80  | ...
```

Update `parseMatrixExcel` to handle the new section-header format when re-importing.

### 4. Update CustomerUploader Preview (`src/components/admin/CustomerUploader.tsx`)

Add to the import preview:
- CSM assignment summary (CSM name -> customer count)
- Features per customer average

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/customerExcelImporter.ts` | Add deployment_type mapping, improve template sample data, add CSM summary to preview |
| `src/lib/matrixExcelHelper.ts` | Restructure template with customer section headers; update parser for new format |
| `src/components/admin/CustomerUploader.tsx` | Show CSM mapping summary in preview |

## No Database Changes Required
All needed columns and relationships already exist.
