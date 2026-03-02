

# Map Data Entry Forms for 5 New Departments

## Overview
Create data entry forms for Security & Technology, Product Engineering, Product Management, Quality Assurance, and Sales departments. Each has a different data entry model:

- **Product Engineering, Product Management, Quality Assurance**: Standard feature-based matrix (10 KPIs x 5 features per customer)
- **Security & Technology**: Hybrid -- 7 indicators use feature-based matrix, 3 deployment indicators (Platform Availability, Resilience & Capacity Compliance, Preventive Security Control Coverage) are single line items per customer (not feature-based)
- **Sales**: All 10 indicators as single line items, NOT tied to customers (department-level only, like Content Management but without customers)

## Current State
- All 5 departments exist in the database with 10 indicators each
- None have `indicator_feature_links` (no features are linked yet)
- The existing `CSMDataEntryMatrix` component already supports:
  - Feature-based matrix mode (customer x feature x KPI)
  - Direct/single-line-item mode (customer x KPI, no features) -- used by Content Management
- The `DepartmentDataEntry` page already renders for any department via `/department/:departmentId/data-entry`

## Implementation Plan

### Step 1: Create Features for Each Department (Database Migration)
Create 5 generic features per department for Product Engineering, Product Management, Quality Assurance, and Sec+Tech (for non-deployment indicators):

```
- Feature 1 through Feature 5 for each department
```

These will be stored in the `features` table with a `category` column to group them by department (e.g., `product_engineering`, `product_management`, `quality_assurance`, `security_technology`).

### Step 2: Create Indicator-Feature Links (Database Migration)
Link the indicators to their respective features:

- **Product Engineering**: All 10 indicators linked to 5 PE features
- **Product Management**: All 10 indicators linked to 5 PM features
- **Quality Assurance**: All 10 indicators linked to 5 QA features
- **Security & Technology**: Only 7 non-deployment indicators linked to 5 SecTech features. The 3 deployment indicators (Platform Availability, Resilience & Capacity Compliance, Preventive Security Control Coverage) get NO feature links -- they'll use single-line-item mode per customer

### Step 3: Create KPI RAG Bands (Database Migration)
Insert RAG bands into `kpi_rag_bands` for each indicator based on the Excel thresholds. Each indicator gets 3 bands (Green/Amber/Red) with the scoring from the spreadsheet.

### Step 4: Handle Sales Department -- New "Department-Level" Mode
Sales indicators are not customer-related. The current matrix component doesn't support a "no customer" mode. Options:

**Approach**: Extend the `DepartmentDataEntry` per-indicator tab to be the primary entry method for Sales. Since Sales already has the per-indicator tab in `DepartmentDataEntry.tsx`, this already works -- the team lead enters a single value per KPI per period. No matrix tab needed for Sales.

Specifically:
- In `DepartmentDataEntry.tsx`, when the department is Sales, hide the "Feature Matrix" tab (since there are no features and no customers to map)
- The per-indicator tab already handles direct value entry with evidence

### Step 5: Handle Sec+Tech Hybrid Mode
For the 3 deployment indicators that are customer-related but NOT feature-based:

**Approach**: Use the existing `indicator_customer_links` table to explicitly link these 3 indicators to customers. Then modify `CSMDataEntryMatrix` to detect indicators with customer links but no feature links, rendering them as single-line items within the same customer accordion.

Alternatively (simpler): Since the matrix already supports "direct mode" (no features = single line items per customer), we can split the Sec+Tech matrix into two sections:
1. Standard feature matrix for the 7 feature-linked indicators
2. A separate "Deployment Indicators" section below showing the 3 single-line items per customer

**Chosen approach**: Modify `CSMDataEntryMatrix` to handle a hybrid scenario -- when some indicators have feature links and some don't within the same department, render both:
- Feature-based grid for linked indicators
- Direct-score rows for unlinked indicators (within the same customer accordion)

### Step 6: Map Customer-Feature Assignments
For the feature-based departments (PE, PM, QA, Sec+Tech), customers need to be assigned features via `customer_features`. This can be done by:
- Admin bulk-assigns all 5 features to relevant customers
- OR auto-assign all 5 department features to all active customers

**Approach**: Create a migration that assigns all 5 features for each department to all active, non-managed-services customers. This can be refined later by admins.

## File Changes Summary

### Database Migrations (3 migrations)
1. **Create department features**: Insert 20 features (5 per department for PE, PM, QA, SecTech)
2. **Create indicator-feature links**: Link indicators to features (37 indicators x 5 features = 185 links for PE/PM/QA, 7 x 5 = 35 for SecTech = 220 total)
3. **Create KPI RAG bands**: Insert bands for all 50 indicators across 5 departments
4. **Assign features to customers**: Bulk-insert `customer_features` for active customers

### Code Changes

1. **`src/components/user/CSMDataEntryMatrix.tsx`** (~50 lines)
   - In the data-fetching query, detect "hybrid" mode: some indicators have feature links, some don't
   - For unlinked indicators, render them as direct-score rows within each customer accordion (below the feature grid)
   - This handles the Sec+Tech 3 deployment indicators

2. **`src/pages/DepartmentDataEntry.tsx`** (~5 lines)
   - Add Sales department detection (like `isContentManagementDept`)
   - When department is Sales, hide the "Feature Matrix" tab since Sales has no features/customers
   - Keep the per-indicator tab as the sole entry method

## Data Model Diagram

```text
Product Engineering / PM / QA:
  Customer --> [Feature 1..5] --> [10 KPIs] --> csm_customer_feature_scores

Security & Technology:
  Customer --> [Feature 1..5] --> [7 standard KPIs] --> csm_customer_feature_scores
  Customer --> [3 deployment KPIs] --> csm_customer_feature_scores (placeholder feature)

Sales:
  [10 KPIs] --> indicator_history (per-indicator direct entry, no customers)
```

