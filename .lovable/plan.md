

## Plan: Feedback Widget + Admin Feedback Panel

### What We'll Build

1. **Floating feedback widget** — a small button (e.g., "?" or "Feedback") fixed to the bottom-right corner of every page. Clicking it opens a popover/dialog where users can type feedback and submit. It auto-captures the current page URL and user email.

2. **Admin Feedback tab** — a new tab in the Data Management page (`/data`) showing all submitted feedback with status management (open/resolved/dismissed).

### Database

The `feedbacks` table already exists with columns: `id`, `user_id`, `user_email`, `page_url`, `message`, `status`, `created_at`. RLS policies already allow users to insert their own and admins to read/update/delete. No migration needed.

### Implementation

**File 1: `src/components/FeedbackWidget.tsx` (new)**
- Fixed-position button at bottom-right corner with a `MessageSquare` icon
- Clicking opens a popover with a textarea + submit button
- On submit: inserts into `feedbacks` table with `user_id`, `user_email`, `page_url` (from `useLocation`), `message`
- Shows toast on success, resets form
- Only renders when user is logged in

**File 2: `src/components/AppLayout.tsx`**
- Import and render `<FeedbackWidget />` inside the layout (before closing `</div>`)

**File 3: `src/components/admin/FeedbackTab.tsx` (new)**
- Table listing all feedbacks sorted by newest first
- Columns: Date, User Email, Page, Message, Status
- Status badge (open = yellow, resolved = green, dismissed = gray)
- Dropdown to change status (update via supabase)
- Delete button for admins

**File 4: `src/pages/DataManagement.tsx`**
- Add a "Feedback" tab in the admin tabs section
- Render `<FeedbackTab />` in that tab content

### Files Modified
- `src/components/FeedbackWidget.tsx` — new floating widget
- `src/components/AppLayout.tsx` — include widget
- `src/components/admin/FeedbackTab.tsx` — new admin panel
- `src/pages/DataManagement.tsx` — add Feedback tab

