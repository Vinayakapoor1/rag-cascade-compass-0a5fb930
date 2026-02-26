

# Per-Customer Save with Final Check-In

## Problem
Currently, the entire matrix has a single "Update & Check In" button that saves ALL customers at once, and requires individual skip reasons for every empty customer -- tedious when dealing with many customers.

## Solution

### 1. Add a "Save" button inside each customer accordion
- Each `CustomerSectionCard` gets its own **Save** button (bottom of the expanded card)
- Clicking it saves only that customer's scores to the database immediately
- Shows a green checkmark/badge on the customer header once saved for this session
- No skip reason required at this stage

### 2. Track per-customer save status
- New state: `savedCustomers: Set<string>` -- tracks which customers have been individually saved in this session
- When a customer is saved, their ID is added to this set
- The customer header shows a saved indicator (checkmark icon + "Saved" badge)

### 3. Simplify the final "Update & Check In"
- The global "Update & Check In" button remains at the top
- When clicked, it aggregates all saved scores, updates KPI indicators, and logs the activity
- For customers with NO scores and NOT individually saved, instead of asking a reason per customer, show a **single textarea** with a general reason (e.g., "No data available this period") that applies to all skipped customers
- Option to mark all unsaved/empty customers as "No Change" with one click

### 4. Per-customer save logic
- The individual save only upserts/deletes scores for that one customer to `csm_customer_feature_scores`
- It does NOT update indicator aggregates (that happens only on final check-in)
- Shows a toast: "Saved scores for [Customer Name]"

## Technical Changes

**File: `src/components/user/CSMDataEntryMatrix.tsx`**

- Add `savedCustomers` state and `onSaveCustomer` callback to `CSMDataEntryMatrix`
- New function `doSaveCustomer(customerId)` -- upserts only that customer's scores
- Pass `onSaveCustomer` and `isSaved` props to `CustomerSectionCard`
- Add a Save button at the bottom of each customer's expanded content
- Show a saved badge on the customer header when saved
- Simplify skip reason dialog: replace per-customer textareas with a single "General reason for customers without data" textarea that applies to all empty/unsaved customers
- Keep "Update & Check In" as the final action that does indicator aggregation + compliance check-in

## UX Flow
1. User expands a customer, fills in scores, clicks "Save" inside that card
2. Card header shows a green "Saved" badge
3. Repeat for other customers
4. Click "Update & Check In" at the top
5. If any customers have no scores, a single dialog asks for one general reason (not per-customer)
6. Final save aggregates indicators and logs activity

