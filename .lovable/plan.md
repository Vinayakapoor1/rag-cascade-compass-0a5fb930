

# Execute Vinayak's Backup + CS/CM OKR Updates

## Step 1 — Create "Vinayak's Backup"

Call the `daily-backup` edge function to snapshot all 14 tables. Then insert a labeled activity log entry:

```sql
INSERT INTO activity_logs (action, entity_type, entity_name, metadata)
VALUES ('create', 'import', 'Vinayak''s Backup', '{"label": "vinayak_backup", "timestamp": "2026-03-30"}');
```

This marks the backup so it can be found by searching for "Vinayak's Backup" in activity logs, with the corresponding data snapshot in `daily_backups`.

## Step 2 — Update CS Key Results (5 renames + 4 formula changes)

Match KRs by current name via join to `functional_objectives → departments` where department name = 'Customer Success'. Update `name` and `formula` columns only — IDs untouched.

| Current Name (partial) | New Name | Formula Change |
|---|---|---|
| "KR: Increase product usage by 25% for all key customers..." | "Increase product usage by 25%" | No |
| "Conduct QBRs for 100% Key Accounts" | "Achieve 100% QBR coverage for all key accounts per quarter" | → `Current QBR Coverage Rate % / 100 × 100` |
| "Achieve CSAT ≥ 90% for 100% Key Accounts Quarterly" | "Achieve CSAT score ≥90% across all key accounts each quarter" | → `Current CSAT Coverage % / 100 × 100` |
| "Check-in with all key accounts monthly" | "Achieve confirmed renewal intent from ≥80% of accounts up for renewal" | → `Current Renewal Commitment Signal % / 80 × 100` |
| "Maintain up-to-date SOPs and processes" | "Achieve 100% SOP compliance rate across all CS processes" | → `Current SOP Compliance Rate % / 100 × 100` |

## Step 3 — Update CM Key Results (5 renames, no formula changes)

Match KRs via department name = 'Content Management'. Update `name` column only.

| Current Name (partial) | New Name |
|---|---|
| "Produce and launch 3 new high-impact content assets..." | "Achieve ≥3 new high-impact content assets launched per quarter..." |
| "Achieve 90% engagement and completion..." | "Achieve ≥90% content engagement rate..." |
| "Co-create at least 3 industry-specific content packs..." | "Launch ≥3 industry-specific content packs..." |
| "Reduce content production cycle time by 25% and improve..." | "Reduce content production cycle time by 25% from baseline" |
| "Implement version control, rights management..." | "Achieve 100% of content assets managed under version control..." |

## What does NOT change
- All indicator names, values, formulas, and links
- All functional objective names and formulas
- All customer health metrics, feature scores, and history
- All KR IDs (foreign keys preserved)
- All algorithms and calculation logic

## Files Modified
- Zero code files — database data updates only via insert tool
- Edge function call for backup

