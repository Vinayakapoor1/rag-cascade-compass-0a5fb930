

# Map Data Entry Forms for 5 New Departments

## What We'll Do

Set up database data (features, indicator-feature links, KPI RAG bands, customer-feature assignments) and adjust two UI files so all 5 departments have working data entry forms.

## Department Models (from updated Excel)

| Department | Model | Page |
|---|---|---|
| Product Engineering | 10 KPIs x 5 features per customer | Page 6 |
| Product Management | 10 KPIs x 5 features per customer | Page 5 |
| Quality Assurance | 10 KPIs x 5 features per customer | Page 4 |
| Security & Technology | Hybrid: 7 KPIs x 5 features + 3 Deployment KPIs as direct line items per customer | Page 3 |
| Sales | 10 KPIs as direct line items, department-level only (like Content Management, no customers) | Page 7 |

## Database Inserts (4 steps, using insert tool)

### 1. Create 20 Features
Insert 5 features per department into `features` table with category tags: `product_engineering`, `product_management`, `quality_assurance`, `security_technology`.

### 2. Create Indicator-Feature Links
Insert into `indicator_feature_links`:
- **PE**: 10 indicators x 5 features = 50 links
- **PM**: 10 indicators x 5 features = 50 links
- **QA**: 10 indicators x 5 features = 50 links
- **SecTech**: 7 non-deployment indicators x 5 features = 35 links
- 3 Deployment indicators (Platform Availability, Resilience & Capacity, Preventive Security) get NO links
- **Total**: 185 links

### 3. Create KPI RAG Bands
Insert 3 bands (Green/Amber/Red) per indicator into `kpi_rag_bands` for all 50 indicators. Band labels extracted from the updated Excel:

**Example bands from Excel:**
- On-Time Release Rate (PE): `96-100%` (Green), `51-95%` (Amber), `1-50%` (Red)
- Platform Availability (SecTech): `99-100%` (Green), `81-98%` (Amber), `1-80%` (Red)
- PMF Validation Rate (PM): `76-100%` (Green), `51-75%` (Amber), `1-50%` (Red)

For **Sales**, since it uses Content Management-style entry (per-indicator direct, no features), RAG bands will use the same pattern -- derive 3-tier bands from the shown aggregate scores in the Excel.

### 4. Assign Features to Active Customers
Bulk-insert into `customer_features` -- assign all 5 features per department to all active, non-managed-services customers (8 customers currently).

## Code Changes

### 1. `src/pages/DepartmentDataEntry.tsx` (~3 lines)
- Add `isSalesDept` detection: `const isSalesDept = department?.name === 'Sales';`
- When `isSalesDept`, hide the "Feature Matrix" tab (line 649) -- Sales has no features/customers
- Only show the "Per Indicator" tab for Sales

### 2. `src/components/user/CSMDataEntryMatrix.tsx` (~50 lines)
Handle SecTech hybrid mode:
- After fetching `indicator_feature_links`, split indicators into two groups:
  - `linkedIndicators`: indicators with feature links (7 standard KPIs)
  - `directIndicators`: indicators with zero feature links (3 Deployment KPIs)
- For each customer accordion, render both:
  1. Feature-based grid for `linkedIndicators` (existing behavior)
  2. Below the grid, a "Deployment Indicators" section with direct-score dropdowns for `directIndicators` (using placeholder feature ID `00000000-0000-0000-0000-000000000000`)
- This hybrid rendering only activates when both groups are non-empty

## Indicator ID Reference

**SecTech Deployment indicators (NO feature links):**
- `182d7aea-4003-4e87-8038-002e42e2f53d` -- Platform Availability %
- `136e1e14-c3ab-409e-a1af-0fa020d95e92` -- Resilience & Capacity Compliance %
- `0ba15bb3-d7ae-414d-aee1-058f947b7941` -- Preventive Security Control Coverage %

**Sales Department ID:** `663a95ea-5e81-453b-8846-21c17528cd98`

