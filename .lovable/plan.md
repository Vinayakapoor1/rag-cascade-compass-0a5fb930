

# Restructure Feature Matrix: Customer-First Data Entry

## The Problem Today

The current matrix is **KPI-first**: 10 collapsible KPI sections, each with a grid of 77 customers x 17 features = ~13,000 cells. This is overwhelming and forces CSMs to jump between KPI sections to fill data for the same customer.

## New Structure: Customer-First

Flip the hierarchy so the **Customer** is primary. Each customer expands to show only their mapped features as rows, with the 10 KPIs as columns.

```text
Before (KPI-first):                    After (Customer-first):
  KPI: Adoption Rate                     Customer: VOIS (16 features)
    Customer A  [F1][F2][F3]...            Feature: Phishing Email  [Adoption][NPS][CSAT]...
    Customer B  [F1][F2][F3]...            Feature: LMS             [Adoption][NPS][CSAT]...
    Customer C  [F1][F2][F3]...            Feature: Gamification    [Adoption][NPS][CSAT]...
  KPI: NPS Score                         Customer: DHA (16 features)
    Customer A  [F1][F2][F3]...            Feature: Phishing Email  [Adoption][NPS][CSAT]...
    Customer B  [F1][F2][F3]...            ...
    ...
```

## User Journey

1. CSM opens the Feature Matrix tab
2. Sees a list of their assigned customers (filtered by CSM mapping)
3. Expands a customer -- sees only the features that customer uses
4. For each feature row, fills in scores across the 10 KPIs (0-100%)
5. Clicks "Save All" -- scores are saved and KPI indicator values are recalculated

## What Stays the Same

- **Rollup logic**: Per-indicator AVG of all customer-feature scores becomes the indicator's `current_value`
- **RAG calculation**: Standard thresholds (Green >= 76%, Amber >= 51%, Red >= 1%)
- **Cascade**: Indicator values flow up through Key Results, Functional Objectives, and Department via existing formulas
- **CSM filtering**: Non-admin users only see customers assigned to them
- **Data storage**: Same `csm_customer_feature_scores` table with same structure

## Files to Modify

- **`src/components/user/CSMDataEntryMatrix.tsx`**: Complete restructure of the component
  - Data model changes from `KPISection[]` to `CustomerSection[]`
  - Each `CustomerSection` contains the customer's features and all applicable KPIs
  - Grid renders features as rows, KPIs as columns
  - Aggregation functions adapted to new grouping but same math
  - Customer-level search filter at top level (not per-section)
  - Each customer card shows an overall RAG badge (average across all their feature-KPI scores)

## Technical Details

### New Data Model

```text
CustomerSection {
  id: string (customer_id)
  name: string
  features: { id, name }[]              -- only features this customer uses
  indicators: { id, name, kr_name, fo_name }[]  -- all KPIs linked to any of their features
  indicatorFeatureMap: Map<indicator_id, Set<feature_id>>  -- which features apply to which KPI
}
```

### Grid Layout Per Customer

| Feature              | Adoption Rate | NPS Score | CSAT Score | ... (10 KPI columns) | Avg |
|----------------------|:---:|:---:|:---:|:---:|:---:|
| Phishing Email       | [85] | [72] | [90] | ... | 82% |
| LMS                  | [60] | [--] | [75] | ... | 68% |
| Gamification         | [--] | [45] | [--] | ... | 45% |
| **Customer Avg**     |      |      |      |     | **65%** |

- Cells show "--" where that feature is not linked to that KPI (via `indicator_feature_links`)
- Customer Avg badge shows overall health

### Aggregation (unchanged math)

1. **Per indicator**: Collect all non-null scores for that indicator across all customers and features, compute AVG
2. **Save**: Update `indicators.current_value` with the aggregate, set `target_value = 100`, derive RAG status
3. **Cascade**: Existing formula system handles KR/FO/Dept rollup

### Estimated Grid Size

- Typical customer has 6-7 features x 10 KPIs = ~60-70 cells per customer
- CSM with ~7 customers = ~420-490 total cells (vs 13,000 before)
- Much more manageable data entry experience

