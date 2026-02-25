

# Align Content Management Flow with Customer Success Flow

## Current State
Most of the Content Management infrastructure is already built and functional:
- Data entry page exists at `/content-management/data-entry` using the same matrix component as CSM
- The `content_manager` role exists in the database
- Auth hook tracks `isContentManager`
- Navigation button "Content Mgmt" appears in the header for content managers and admins
- Compliance widget and compliance report pages exist
- RAG algorithms are identical (same `CSMDataEntryMatrix` component with `managedServicesOnly` filter)

## What Needs to Change

### 1. Portfolio Page: Add Content Manager Instructions Card
**File:** `src/pages/Index.tsx`

Currently, the Portfolio page shows a "Team Leader Data Entry Guide" card for department heads, but there is no equivalent for content managers. Add a similar instruction card that:
- Is visible when the logged-in user has the `content_manager` role (and is not admin)
- Shows a "Content Management Data Entry Guide" with steps
- Has a "Go to Data Entry" button linking to `/content-management/data-entry`
- Mirrors the exact same pattern as the department head card (lines 186-207)

This requires adding `isContentManager` to the destructured auth values on line 24.

### 2. Portfolio Page: Show Compliance Widget Only for Relevant Roles
**File:** `src/pages/Index.tsx`

Currently both the CSM Compliance Widget and Content Management Compliance Widget show for all logged-in users. Refine visibility:
- CSM Compliance Widget: show for admins and CSMs
- Content Management Compliance Widget: show for admins and content managers

This gives each role a focused view of their responsibilities on the portfolio dashboard.

### 3. AppLayout: Content Manager Navigation Parity
**File:** `src/components/AppLayout.tsx`

Currently the "Content Mgmt" button shows for `isContentManager || isAdmin`. This is correct but should also show for content managers who are also department heads (currently the department head button takes precedence at line 135 with `!isCSM` check). Ensure that a user who is both a department head and a content manager sees both buttons. The current logic already handles this since the content manager check is independent (line 125), but verify the department head block doesn't hide it.

## Technical Details

### Index.tsx Changes
```typescript
// Line 24: Add isContentManager to destructured values
const { user, isAdmin, isDepartmentHead, isContentManager, loading: authLoading } = useAuth();

// After the department head instructions card (after line 207), add:
{user && isContentManager && !isAdmin && (
  <div className="card-premium p-6 border-primary/20">
    <div className="flex items-start gap-5 relative z-10">
      <div className="p-4 rounded-2xl bg-primary/10 animate-float">
        <ClipboardCheck className="h-7 w-7 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-lg mb-2">Content Management Data Entry Guide</p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Navigate to Content Management Data Entry</li>
          <li>Select the reporting period (month or week)</li>
          <li>Expand a managed services customer to see their feature x KPI matrix</li>
          <li>Select the appropriate RAG band for each cell</li>
          <li>Use "Apply to Row" or "Apply to Column" for bulk entry</li>
          <li>Click Save to submit your scores</li>
        </ol>
      </div>
      <Button asChild className="hover-glow shadow-lg shadow-primary/30">
        <Link to="/content-management/data-entry">Go to Data Entry</Link>
      </Button>
    </div>
  </div>
)}

// Refine compliance widget visibility:
// CSM widget: show for admin or CSM users
{user && (isAdmin || isCSM) && <CSMComplianceWidget />}
// Content Mgmt widget: show for admin or content manager users  
{user && (isAdmin || isContentManager) && <ContentMgmtComplianceWidget />}
```

This requires also adding `isCSM` to the destructured auth values.

### Files Summary
| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add content manager instruction card, refine compliance widget visibility, add `isContentManager` and `isCSM` to auth destructuring |

### No Database Changes Required
All roles, tables, and algorithms are already in place. This is purely a UI/UX alignment to give content managers the same portfolio experience as CSMs.
