

## Plan: Daily Midnight Data Backup via Scheduled Edge Function

### What This Does
Creates a scheduled edge function that runs every day at midnight UTC. It snapshots all critical tables into a `daily_backups` table as JSON, giving you a point-in-time recovery option accessible from the admin panel.

### Approach

Since we can't run `pg_dump` from an edge function, the backup will serialize key tables into a JSONB column in a new `daily_backups` table. This covers data recovery for the most important entities.

### Changes

**1. Database migration — create `daily_backups` table**

```sql
CREATE TABLE public.daily_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  backup_type text NOT NULL DEFAULT 'scheduled',
  tables_included text[] NOT NULL,
  data jsonb NOT NULL,
  row_counts jsonb,
  size_bytes bigint
);

ALTER TABLE public.daily_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read backups"
  ON public.daily_backups FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete backups"
  ON public.daily_backups FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- Auto-cleanup: keep only last 30 days
CREATE POLICY "Service can insert backups"
  ON public.daily_backups FOR INSERT TO public
  WITH CHECK (true);
```

**2. Edge function — `supabase/functions/daily-backup/index.ts`**

- Uses service role key to read all rows from critical tables: `customers`, `indicators`, `indicator_history`, `csm_customer_feature_scores`, `customer_health_metrics`, `features`, `departments`, `functional_objectives`, `key_results`, `org_objectives`, `csm_feature_scores`, `profiles`, `user_roles`
- Serializes each table's data into a single JSONB object
- Inserts into `daily_backups`
- Deletes backups older than 30 days (retention policy)
- Logs to `activity_logs`
- Returns summary with row counts and approximate size

**3. Schedule via `cron.schedule` (SQL insert, not migration)**

```sql
SELECT cron.schedule(
  'daily-midnight-backup',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jyldgwtaoieiibtwqqlm.supabase.co/functions/v1/daily-backup',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{"scheduled":true}'::jsonb
  ) AS request_id;
  $$
);
```

**4. Admin panel — add "Backups" section to SnapshotsTab or a new sub-tab**

- List recent backups with date, row counts, and size
- "Download as JSON" button per backup
- "Run Backup Now" manual trigger button
- "Delete" button for old backups

### Config
- Add to `supabase/config.toml`: `[functions.daily-backup]` with `verify_jwt = false`

### Tables Backed Up (14 tables)
customers, indicators, indicator_history, csm_customer_feature_scores, customer_health_metrics, features, departments, functional_objectives, key_results, org_objectives, csm_feature_scores, profiles, user_roles, customer_features

### Technical Details
- Retention: 30 days automatic cleanup
- Schedule: Daily at 00:00 UTC
- Storage: JSONB in Postgres (no external storage needed)
- For large datasets (10k+ rows per table), the backup may hit edge function timeout (60s). Tables are fetched in parallel to minimize this risk.

### Files Created/Modified
- `supabase/functions/daily-backup/index.ts` — new edge function
- `supabase/config.toml` — add function config (handled automatically)
- Database migration — `daily_backups` table
- SQL insert — cron schedule (non-migration)
- `src/components/admin/SnapshotsTab.tsx` — add backup list + manual trigger UI

