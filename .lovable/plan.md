

## Plan: Global Feedback Widget + Admin Feedback Log

### Overview
Add a floating feedback button on every page (via AppLayout) that opens a dialog for users to submit issues/feedback. Store submissions in a new `feedbacks` table and display them in a new tab on the Admin Dashboard.

### Database Changes

**New table: `feedbacks`**
```sql
CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  page_url text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON public.feedbacks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback" ON public.feedbacks
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Users can read own feedback
CREATE POLICY "Users can read own feedback" ON public.feedbacks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins can update feedback (mark resolved)
CREATE POLICY "Admins can update feedback" ON public.feedbacks
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback" ON public.feedbacks
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));
```

### New Components

**1. `src/components/FeedbackWidget.tsx`**
- Floating button (bottom-right corner) with a `MessageSquare` icon
- Opens a dialog with a textarea for the feedback message
- Auto-captures current page URL via `useLocation()`
- Submits to `feedbacks` table with user_id, email, page_url, message
- Shows toast on success

**2. `src/components/admin/FeedbacksTab.tsx`**
- Table showing all feedback: date, user email, page, message, status
- Admin can mark feedback as "resolved" or delete it
- Sortable by date (newest first)

### Integration Points

**AppLayout.tsx**
- Import and render `<FeedbackWidget />` inside the layout, visible to all logged-in users

**AdminDashboard.tsx**
- Add a Tabs component with "Activity Timeline" and "User Feedback" tabs
- "User Feedback" tab renders `<FeedbacksTab />`

### Files Modified
- **Database migration** — create `feedbacks` table with RLS
- `src/components/FeedbackWidget.tsx` — new floating feedback button + dialog
- `src/components/admin/FeedbacksTab.tsx` — new admin feedback viewer
- `src/components/AppLayout.tsx` — add `<FeedbackWidget />` for logged-in users
- `src/pages/AdminDashboard.tsx` — add tabs with feedback log

