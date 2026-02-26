

# Remove Content Management Elements from Portfolio & Navigation

## Problem
The "Content Management Data Entry Guide" instruction card still appears on the Portfolio page, and the "Content Mgmt" navigation button is in the header. Since content managers are already directed to their data entry form post-login (matching the CSM workflow), these elements are unnecessary.

## Changes

### 1. Remove Content Manager Instruction Card from Portfolio
**File:** `src/pages/Index.tsx`
- Remove the content manager instruction card block (lines 208-231) that shows the "Content Management Data Entry Guide"
- Remove `isContentManager` from the `useAuth()` destructuring since it will no longer be used on this page

### 2. Remove "Content Mgmt" Navigation Button from Header
**File:** `src/components/AppLayout.tsx`
- Remove the "Content Mgmt" button block (lines 125-132) that links to `/content-management/data-entry`
- Remove the `isContentManager` reference from the auth destructuring if no longer used in this file

## Result
The Portfolio page will be clean of any Content Management-specific UI elements. Content managers will continue to access their data entry form through the post-login redirect, matching the CSM experience exactly.

