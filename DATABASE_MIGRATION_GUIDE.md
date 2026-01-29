# Database Migration Guide

## Step-by-Step: Migrate to New Supabase Project

### Step 1: Backup Current Database

Open terminal and run:

```bash
cd ~/Downloads/rag-cascade-compass

# Login to Supabase CLI (will prompt for access token)
npx supabase login

# Link to current project
npx supabase link --project-ref jyldgwtaoieiibtwqqlm

# Create database dump
npx supabase db dump -f backup_$(date +%Y%m%d).sql

# This will create a backup file with today's date
```

### Step 2: Create New Supabase Project

1. **Go to:** https://supabase.com/dashboard
2. **Login with:** vinayak.kapoor@infosecventures.com
3. **Click:** "New Project"
4. **Fill in:**
   - Name: `rag-cascade-compass`
   - Database Password: (choose a strong password - save it!)
   - Region: (choose closest to you)
5. **Click:** "Create new project"
6. **Wait** for project to be created (2-3 minutes)

### Step 3: Get New Project Credentials

Once project is created:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (long JWT token)
   - **Project ID** (from URL or settings)

### Step 4: Restore Database to New Project

```bash
# Unlink from old project
npx supabase unlink

# Link to new project (use Project ID from step 3)
npx supabase link --project-ref YOUR_NEW_PROJECT_ID

# Push the backup to new project
npx supabase db push

# If that doesn't work, restore from dump:
# npx supabase db reset --db-url "postgresql://postgres:[YOUR_PASSWORD]@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
```

### Step 5: Apply Evidence Migrations

In Supabase Dashboard → SQL Editor → New Query:

```sql
-- Add evidence columns
ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS evidence_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS no_evidence_reason TEXT,
ADD COLUMN IF NOT EXISTS rag_status TEXT DEFAULT 'amber';

-- Add comments
COMMENT ON COLUMN public.indicators.evidence_url IS 'URL or file path for evidence attachment';
COMMENT ON COLUMN public.indicators.evidence_type IS 'Type of evidence: file or link';
COMMENT ON COLUMN public.indicators.no_evidence_reason IS 'Reason when no evidence is provided';
COMMENT ON COLUMN public.indicators.rag_status IS 'RAG status: red, amber, or green';
```

### Step 6: Update Local .env File

Edit `.env` file with new credentials:

```env
VITE_SUPABASE_PROJECT_ID="YOUR_NEW_PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_NEW_ANON_KEY"
VITE_SUPABASE_URL="https://YOUR_NEW_PROJECT_ID.supabase.co"
```

### Step 7: Test

```bash
# Restart dev server
npm run dev

# Open browser
# Go to http://localhost:8080/data
# Click "Data Controls" tab
# Verify all 60 indicators are there
# Check evidence columns are visible
```

---

## If Supabase CLI Doesn't Work

You can also backup/restore manually:

1. **Backup:** Supabase Dashboard → Database → Backups → Download
2. **Restore:** Upload to new project via Dashboard

---

## Need Help?

If you get stuck at any step, let me know which step and what error you're seeing!
