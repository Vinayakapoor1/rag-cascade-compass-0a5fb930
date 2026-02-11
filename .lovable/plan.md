

# QA Checklist: 100 Core Quality Use Cases

This is a comprehensive quality assurance checklist covering every major area of the platform. Each item should be manually verified.

---

## Authentication & Access Control (1-12)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 1 | Sign in with valid admin credentials loads correctly |  |
| 2 | Sign in with valid CSM credentials loads correctly |  |
| 3 | Sign in with valid Department Head credentials loads correctly |  |
| 4 | Sign in with valid Viewer credentials loads correctly |  |
| 5 | Invalid credentials show appropriate error message |  |
| 6 | Sign out clears session and redirects to public view |  |
| 7 | Unauthenticated users see the "Sign In to Update" prompt on Index page |  |
| 8 | Admin badge and "Manage Data" button appear only for admin users on Index page |  |
| 9 | "Admin Dashboard" button in AppLayout header appears only for admins |  |
| 10 | "Enter Data" button appears for CSM users (not admins) linking to /csm/data-entry |  |
| 11 | "Enter Data" button appears for Department Heads (not admins/CSMs) linking to /data |  |
| 12 | Compliance Report page (/compliance-report) redirects non-admin users to / |  |

---

## Navigation & Routing (13-24)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 13 | Logo in AppLayout links to / (Portfolio) |  |
| 14 | "Portfolio" nav link in AppLayout highlights when active |  |
| 15 | Department card click navigates to /department/:id |  |
| 16 | Org Objective click navigates to /org-objective/:id |  |
| 17 | Key Result click navigates to /org-objective/:id/okr/:krId |  |
| 18 | Indicator click navigates to /org-objective/:id/indicator/:indicatorId |  |
| 19 | /customers page loads customer list |  |
| 20 | /features page loads feature list |  |
| 21 | /admin page loads Admin Dashboard (Activity Timeline) |  |
| 22 | /admin/upload page loads the upload interface |  |
| 23 | Unknown route shows NotFound page |  |
| 24 | Back button on Compliance Report navigates to / |  |

---

## Portfolio / Dashboard Page (25-40)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 25 | Business Outcome section displays when data exists |  |
| 26 | Business Outcome percentage calculates as average of org objectives |  |
| 27 | 5 stat cards display correct counts (Org Objectives, Departments, FOs, KRs, Indicators) |  |
| 28 | RAG Legend popover opens and shows color definitions |  |
| 29 | Refresh button triggers data refetch |  |
| 30 | Loading skeleton appears while data is fetching |  |
| 31 | Error state shows "Failed to load data" with Retry button |  |
| 32 | Empty state shows "No Data Yet" with upload prompt for admins |  |
| 33 | Org Objectives render with correct identity colors (green, purple, blue, etc.) |  |
| 34 | Org Objectives show correct RAG badge based on indicator health |  |
| 35 | Org Objectives show classification badge (Core, Enabler, etc.) |  |
| 36 | Department cards render under their parent Org Objective |  |
| 37 | Department cards show correct RAG status |  |
| 38 | Team Leader instructions card appears only for department heads (not admins) |  |
| 39 | Activity Timeline Widget appears only for logged-in users |  |
| 40 | Department visibility is scoped correctly for non-admin users (department_access filtering) |  |

---

## Bell Notifications (41-52)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 41 | Bell icon appears in header for logged-in users only |  |
| 42 | Unread count badge shows correct number with pulse animation |  |
| 43 | Badge shows "9+" when unread count exceeds 9 |  |
| 44 | Clicking bell opens popover with notification list |  |
| 45 | Notifications display title, message (2-line clamp), and relative time |  |
| 46 | Unread notifications have highlighted background (bg-primary/5) |  |
| 47 | Unread dot indicator shows for unread notifications |  |
| 48 | Clicking a notification marks it as read |  |
| 49 | "Mark all read" button clears all unread indicators |  |
| 50 | Compliance/Check-in notifications navigate to /compliance-report on click |  |
| 51 | Other notifications navigate to their link field on click |  |
| 52 | Empty state shows "No notifications yet" message |  |

---

## Activity Pulse (NotificationsPopover) (53-58)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 53 | Activity pulse icon appears in header for logged-in users |  |
| 54 | Clicking opens popover with ActivityTimelineMini (10 items) |  |
| 55 | "View All" link navigates to /admin |  |
| 56 | Recent activity entries display correctly |  |
| 57 | Activity pulse and Bell notifications render side-by-side without overlap |  |
| 58 | Both popovers can open independently without conflict |  |

---

## Compliance Report Page (59-68)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 59 | Page loads with correct current period (YYYY-MM) |  |
| 60 | Deadline label shows correct day calculation relative to Friday |  |
| 61 | Summary cards show correct Total, Submitted, Pending counts |  |
| 62 | Non-compliant CSMs section lists CSMs who haven't submitted |  |
| 63 | Each non-compliant CSM shows pending customer names as badges |  |
| 64 | Pending count badge shows X/Y format (pending/total customers) |  |
| 65 | Compliant CSMs section lists CSMs who have submitted |  |
| 66 | Compliant CSMs show customer count |  |
| 67 | CSMs with no assigned customers are excluded from both lists |  |
| 68 | Loading skeleton shows while data is fetching |  |

---

## Department Detail Page (69-78)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 69 | Breadcrumb navigation displays correctly |  |
| 70 | Department header shows name, owner, and org objective info |  |
| 71 | RAG status filter tabs (All, On Track, At Risk, Critical) work correctly |  |
| 72 | Customer and Feature filter dropdowns are removed (no longer visible) |  |
| 73 | "Clear All" button appears only when a filter is active |  |
| 74 | Horizontal tree layout renders FOs, KRs, and Indicators correctly |  |
| 75 | Indicator cards show current value, target value, and RAG badge |  |
| 76 | Indicator derivation dialog opens on click |  |
| 77 | Calculation breakdown dialog works correctly |  |
| 78 | Filtering by RAG status correctly hides/shows hierarchy nodes |  |

---

## Data Management & Entry (79-86)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 79 | /data page loads DataManagement interface |  |
| 80 | Department data entry (/department/:id/data-entry) loads correctly |  |
| 81 | CSM data entry (/csm/data-entry) loads for CSM users |  |
| 82 | Admin upload (/admin/upload) loads for admin users |  |
| 83 | Data entry saves to database and updates indicator values |  |
| 84 | Activity log entry is created after data submission |  |
| 85 | Admin data timeline (/admin/data-timeline) shows entries |  |
| 86 | Admin status page (/admin/status) shows department status |  |

---

## Theme & UI (87-94)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 87 | Theme toggle switches between light and dark modes |  |
| 88 | Logo adjusts correctly in dark mode (logo-dark-mode-adjust class) |  |
| 89 | Glass-morphism cards render correctly in both themes |  |
| 90 | Gradient orbs are visible but non-intrusive in both themes |  |
| 91 | Footer renders with logo and copyright text |  |
| 92 | Header is sticky and stays on top during scroll |  |
| 93 | All icons use text-foreground for proper theme contrast |  |
| 94 | Responsive layout works on mobile (hamburger behavior, button text hidden) |  |

---

## Edge Cases & Error Handling (95-100)

| # | Test Case | Pass/Fail |
|---|-----------|-----------|
| 95 | Indicators with null current_value display as "not-set" RAG |  |
| 96 | Indicators with null target_value handle division safely (no NaN/Infinity) |  |
| 97 | Notification polling (30s interval) does not cause memory leaks on unmount |  |
| 98 | Session expiry gracefully redirects to sign-in |  |
| 99 | Rapid navigation between pages does not cause stale data or flickering |  |
| 100 | User dropdown menu (sign out) on hover works without jitter |  |

---

## How to Execute

1. Start from the Portfolio page (/) in an unauthenticated state and verify items 7, 23, 30-32.
2. Sign in as admin and work through items 1, 8-9, 25-42, 44-52, 59-68, 79-86.
3. Sign in as CSM and verify items 2, 10, 40, 81.
4. Sign in as Department Head and verify items 3, 11, 38, 80.
5. Sign in as Viewer and verify items 4, 12, 40.
6. Toggle themes and verify items 87-94.
7. Test edge cases 95-100 throughout.

