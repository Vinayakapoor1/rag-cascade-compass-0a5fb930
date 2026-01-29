

# Plan: Fix Database Schema Mismatch Errors

## Problem Summary
Your code references 2 missing database tables, 1 missing function, and has TypeScript type mismatches that are causing build errors.

## Solution Overview
Create the missing database objects and update the TypeScript types to fix all build errors.

---

## Step 1: Create `indicator_history` Table
This table stores historical data entries for indicators.

**Schema:**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| indicator_id | uuid | Foreign key to indicators |
| value | numeric | The recorded value |
| period | text | Period identifier (e.g., "2025-01") |
| evidence_url | text | Link to evidence file/URL |
| no_evidence_reason | text | Reason if no evidence provided |
| notes | text | Additional notes |
| created_at | timestamp | When the entry was created |
| created_by | uuid | User who created the entry |

---

## Step 2: Create `notifications` Table
This table stores user notifications for nudge functionality.

**Schema:**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Target user |
| title | text | Notification title |
| message | text | Notification message |
| link | text | Optional link |
| is_read | boolean | Read status |
| created_at | timestamp | When created |

---

## Step 3: Create `bulk_reset_indicators` Function
A database function to reset all indicators for a department.

**Logic:**
- Takes `p_department_id` as parameter
- Resets `current_value`, `evidence_url`, `evidence_type`, `no_evidence_reason`, and `rag_status` for all indicators in that department
- Returns the count of reset indicators

---

## Step 4: Apply RLS Policies
Add Row Level Security policies to protect the new tables:
- `indicator_history`: Users can read/write their own department's history
- `notifications`: Users can only read/update their own notifications

---

## Technical Details

### SQL Migrations Required

**Migration 1 - indicator_history table:**
```sql
CREATE TABLE indicator_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid REFERENCES indicators(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  period text NOT NULL,
  evidence_url text,
  no_evidence_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE indicator_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view indicator history"
  ON indicator_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert indicator history"
  ON indicator_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);
```

**Migration 2 - notifications table:**
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
```

**Migration 3 - bulk_reset_indicators function:**
```sql
CREATE OR REPLACE FUNCTION bulk_reset_indicators(p_department_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reset_count integer;
BEGIN
  WITH indicator_ids AS (
    SELECT i.id
    FROM indicators i
    JOIN key_results kr ON i.key_result_id = kr.id
    JOIN functional_objectives fo ON kr.functional_objective_id = fo.id
    WHERE fo.department_id = p_department_id
  )
  UPDATE indicators
  SET 
    current_value = NULL,
    evidence_url = NULL,
    evidence_type = NULL,
    no_evidence_reason = NULL,
    rag_status = 'amber'
  WHERE id IN (SELECT id FROM indicator_ids);
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$;
```

---

## Files Affected
After database changes, the TypeScript types will be automatically regenerated and these files will work:
- `src/components/IndicatorHistoryDialog.tsx`
- `src/components/ActivityTimelineMini.tsx`
- `src/components/admin/AdminDataControls.tsx`
- `src/pages/AdminDepartmentStatus.tsx`
- `src/pages/DepartmentDataEntry.tsx`

---

## Implementation Order
1. Create `indicator_history` table with RLS
2. Create `notifications` table with RLS
3. Create `bulk_reset_indicators` function
4. Types will auto-regenerate, fixing all build errors

