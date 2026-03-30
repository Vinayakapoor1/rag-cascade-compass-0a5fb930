

# Map All Non-Sales Departments to Customers & Features for Scoring

## Current State

| Department | Indicators | Feature Links | Scoring Method |
|---|---|---|---|
| Customer Success | 10 | 170 (all 10 × 17 features) | CSM Feature Matrix ✅ |
| Content Management | 10 | 0 | ❌ No feature links |
| Quality Assurance | 10 | 0 | ❌ No feature links |
| Product Engineering | 10 | 0 | ❌ No feature links |
| Product Management | 10 | 0 | ❌ No feature links |
| Security & Technology | 10 | 0 | ❌ No feature links |
| HR / People | 10 | 0 | ❌ No feature links |
| Finance | 10 | 0 | ❌ No feature links |
| Marketing | 10 | 0 | ❌ No feature links |
| Sales | 10 | 0 | KPI Scoring Grid (standalone — correct) |

**Only Customer Success** has its indicators linked to the 17 features. All other non-Sales departments have zero feature links, which means their data entry page shows "No Feature-Linked Indicators" and CSMs cannot score them via the feature matrix.

## What Needs to Happen

For **8 departments** (all except Sales), every indicator needs to be linked to the 17 core features (excluding "CM Direct Score" which is Content Management's standalone feature). This mirrors exactly how Customer Success is set up.

**Total new links to create**: 8 departments × 10 indicators × 17 features = **1,360 rows** in `indicator_feature_links`.

Content Management already has "CM Direct Score" as its 18th feature — its 10 indicators should be linked to the same 17 core features as CS.

## Steps

### Step 1 — Insert indicator_feature_links for all 8 non-Sales departments

For each department's 10 indicators, create a link to each of the 17 core features. This is a bulk INSERT into `indicator_feature_links` with `impact_weight = 1.0`.

SQL pattern:
```sql
INSERT INTO indicator_feature_links (indicator_id, feature_id, impact_weight)
SELECT i.id, f.id, 1.0
FROM indicators i
JOIN key_results kr ON i.key_result_id = kr.id
JOIN functional_objectives fo ON kr.functional_objective_id = fo.id
JOIN departments d ON fo.department_id = d.id
CROSS JOIN features f
WHERE d.name != 'Sales'
AND f.name != 'CM Direct Score'
AND NOT EXISTS (
  SELECT 1 FROM indicator_feature_links ifl
  WHERE ifl.indicator_id = i.id AND ifl.feature_id = f.id
);
```

### Step 2 — No code changes needed

The CSM data entry matrix (`CSMDataEntryMatrix.tsx`) already reads from `indicator_feature_links` to build the scoring grid. Once the links exist, each department's data entry page will automatically show the feature matrix with all 17 features × 10 indicators for scoring.

### Step 3 — Verify the existing customer-feature mappings cover all customers

82 customers already have `customer_features` entries for the 17 features. This means when a CSM opens any non-Sales department's data entry page, they'll see the full Customer × Feature × Indicator matrix ready for scoring.

## What Does NOT Change
- Customer Success mappings (already has 170 links — untouched)
- Sales department (stays on KPI Scoring Grid with no feature mapping)
- All algorithms, formulas, and RAG calculations
- All existing scored data

## Files Modified
- **Zero code files** — database INSERT only into `indicator_feature_links`

