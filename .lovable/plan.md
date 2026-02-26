

# Prominent "Legit Reason Required" Warning for Check-In

## What Changes

Add a highly visible warning banner/callout near the "Update & Check In" and "No Update & Check In" buttons, plus enhance the skip reason dialog to make it crystal clear that reasons are audited and incorrect/lazy reasons will be flagged.

## Changes

### 1. Add a prominent warning banner above the check-in buttons (CSMDataEntryMatrix.tsx)

Insert a bold, eye-catching callout box directly above the "No Update & Check In" / "Update & Check In" button row. This banner will use a red/destructive gradient style to stand out:

**Copy:**
- **Headline:** "Legitimate Reason Required for Every Check-In"
- **Body:** "All check-in submissions are audited. You must provide an accurate, verifiable reason when updating or skipping customer data. Generic, vague, or incorrect reasons (e.g. 'N/A', 'no reason', 'test') will be flagged for review and escalated to your manager. Repeated violations may result in restricted platform access."

Styled with a prominent red-tinted card with a `ShieldAlert` icon.

### 2. Enhance the Skip Reason Dialog (CSMDataEntryMatrix.tsx)

Update the existing skip reason dialog to include a stronger warning:
- Change the dialog title to: "Mandatory: Provide a Legitimate Reason"
- Add a warning note inside the dialog: "This reason is logged and audited. Inaccurate or placeholder reasons will be flagged and escalated."
- Add a minimum character requirement (at least 10 characters) before the "Confirm & Continue" button is enabled
- Show character count feedback

### 3. Files to Update

Only **one file** needs changes: `src/components/user/CSMDataEntryMatrix.tsx`

- Lines ~930-955: Insert a warning callout div above the button row
- Lines ~983-1026: Enhance the skip reason dialog with stronger copy and validation
- Add `ShieldAlert` to the lucide-react imports (line 13)

Since `CSMDataEntryMatrix` is the shared component used by all three data entry pages (CSM, Content Management, Department), this change automatically applies everywhere.

