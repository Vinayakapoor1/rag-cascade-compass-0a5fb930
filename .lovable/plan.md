

# Pre-populate Industries Table from Existing Customer Data

## Problem
Customers already have industry values assigned, but the `industries` table (used by the Industry Manager) is empty. This means the manager shows "No industries yet" even though industries are actively in use.

## What Changes

Run a database migration that inserts all 31 distinct industry values from the `customers` table into the `industries` table. This will:

- Populate the Industry Manager with all existing industry names
- Allow you to edit, rename, or delete any of them
- Make them available in the customer form dropdown

## Technical Details

A single SQL migration will:

1. Insert all distinct non-null, non-empty `industry` values from the `customers` table into the `industries` table
2. Use `ON CONFLICT` or deduplication to avoid errors if any already exist
3. Normalize casing duplicates (e.g., "hospitality" vs "Hospitality") -- the lowercase variant will be skipped in favor of the capitalized one

### Industries to be added (31 values):
Banking, Business Process Outsourcing (BPO) and KPO, Capital Markets, Chemical, Consulting Engineering Firm, Defence, Digital Connectivity Infrastructure Partner, Education, Energy, Finance, FMCG, Government - Education, Government - Emergency & Disaster Management, Healthcare, Hospitality, Human Resources Services and Workforce Development industry, Insurance, IT Services, Logistics, Manufacturing, Manufacturing - Chemicals, Media, Pension Fund, Ports & Logistics, Public administration/government, Retail, Technology, Technology - Aviation Software, Technology - Healthcare IT, Telecommunications, Travel & Hospitality

**Note:** "hospitality" (lowercase) will be normalized to "Hospitality" in both the `industries` table and the `customers` table.

### File changes
- **Database migration only** -- no code file changes needed

