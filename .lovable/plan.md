

## Plan: Add Bugs, Promises, and NFR Health Parameters per Customer

### What We're Building

Three new health dimensions tracked per customer, each contributing to overall customer health alongside existing OKR indicators:

1. **Bugs** — two sub-metrics:
   - **Bug Count** (per month): <5 = Green, 5-10 = Amber, >10 = Red
   - **Bug SLA Compliance** (%): standard RAG thresholds (76-100% Green, 51-75% Amber, 0-50% Red)

2. **Promises** — (delivered / made) × 100 = percentage, standard RAG thresholds

3. **NFR Compliance** — SLA compliance %, standard RAG thresholds

### Database Changes

**New table: `customer_health_metrics`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| customer_id | uuid (FK) | Links to customers |
| period | text | e.g. "2026-03" |
| bug_count | integer | Bugs received that month |
| bug_sla_compliance | numeric | % of bugs resolved within SLA |
| promises_made | integer | Total promises made |
| promises_delivered | integer | Total promises delivered |
| nfr_compliance | numeric | NFR SLA compliance % |
| created_by | uuid | User who entered data |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |
| notes | text | Optional notes |

- RLS: readable by all authenticated, manageable by authenticated users
- Unique constraint on (customer_id, period) to prevent duplicates

### Code Changes

**1. New hook: `src/hooks/useCustomerHealthMetrics.ts`**
- Fetch health metrics for a customer (latest period or all periods)
- Calculate RAG per dimension:
  - Bug Count: <5 → Green, 5-10 → Amber, >10 → Red
  - Bug SLA: standard percentage thresholds
  - Promises: (delivered/made) × 100, standard thresholds
  - NFR: standard percentage thresholds
- Compute overall health score by averaging all 4 sub-scores + existing indicator scores

**2. New component: `src/components/CustomerHealthMetricsCard.tsx`**
- Display card on Customer Detail page showing the 4 health dimensions with RAG badges
- Show current values and period

**3. New data entry component: `src/components/CustomerHealthMetricsForm.tsx`**
- Form to input/update bug count, bug SLA %, promises made/delivered, NFR compliance % for a given period
- Accessible from Customer Detail page

**4. Update `src/pages/CustomerDetailPage.tsx`**
- Add the health metrics card below the existing KPI Health Breakdown section
- Add button/dialog to enter health metric data

**5. Update `src/hooks/useCustomerImpact.tsx`**
- Extend `CustomerWithImpact` type to include health metric RAG scores
- Factor health metrics into the overall customer RAG status on the Customers list page

### How Overall Health Is Calculated

The final customer health score will average these components:
- Existing indicator-based RAG score (from OKR hierarchy)
- Bug Count RAG (mapped: Green=100, Amber=60, Red=30)
- Bug SLA RAG
- Promises RAG
- NFR RAG

All averaged together → apply standard RAG thresholds for the composite score.

### Files to Create/Modify
- **Create**: `customer_health_metrics` table (migration)
- **Create**: `src/hooks/useCustomerHealthMetrics.ts`
- **Create**: `src/components/CustomerHealthMetricsCard.tsx`
- **Create**: `src/components/CustomerHealthMetricsForm.tsx`
- **Modify**: `src/pages/CustomerDetailPage.tsx` — add health metrics section
- **Modify**: `src/hooks/useCustomerImpact.tsx` — incorporate health metrics into overall RAG
- **Modify**: `src/pages/CustomersPage.tsx` — show composite health in customer list

