

# Add Unique Descriptions to Content Management Indicator Tooltips

## What's happening now
When CSMs hover over any indicator name in the data entry form, they see a tooltip showing only the indicator name and its hierarchy path (e.g., "Content Production → Release Timeliness Rate"). This is the same structure for every indicator — repetitive and unhelpful.

## What will change

### 1. Update 10 CM indicator descriptions in the database
Using the data insert tool, populate the `description` column on the `indicators` table:

| Indicator | Description |
|-----------|-------------|
| Release Timeliness Rate | Measures whether planned content drops are released on or before their scheduled date. |
| Rights Management Compliance | Tracks whether all content assets have proper rights/licensing documentation and reusable asset tagging in place. |
| Version Control Enforcement | Measures whether content assets follow version control standards — every edit is tracked with proper versioning. |
| Avg. Production Cycle Time | How long it takes from content brief to final delivery. Lower cycle times indicate better operational efficiency. |
| Production Cost per Asset | Average cost to produce a single content asset. Reflects efficiency of templates, AI tools, and standardized workflows. |
| Completion Depth within 30 days | Percentage of users who complete published content to full depth within 30 days of release. |
| Content Engagement Coverage (30 days) | Percentage of published content that achieves target engagement within 30 days of going live. |
| Expansion Pipeline Influence | Measures whether industry-specific content packs are directly influencing expansion pipeline and upsell opportunities. |
| Pack Launch Count vs Target | Number of industry-specific content packs launched this quarter versus the planned target. |
| Asset Launch Count vs Target | Number of new high-impact content assets launched versus the planned target. |

### 2. Update `CSMDataEntryMatrix.tsx`
- Add `description?: string | null` to the `IndicatorInfo` interface
- Include `description` in the indicator select queries (main dept query ~line 201 and CM query ~line 441)
- Update all three tooltip locations (~lines 1883-1886, ~lines 2009-2010, ~lines 2344-2347) to show the description below the hierarchy path when available

### Files modified
- `src/components/user/CSMDataEntryMatrix.tsx` — type, queries, and tooltip rendering
- Database — UPDATE 10 indicator description values

