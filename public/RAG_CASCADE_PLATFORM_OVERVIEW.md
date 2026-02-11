# RAG Cascade — Venture Health Intelligence Platform
## Executive Overview for Senior Management

---

## 1. Platform Purpose

A **color-coded decision engine** that gives senior management instant visibility into organizational health across three interconnected pillars: **OKR Performance**, **Customer Health**, and **Feature Adoption**. Every metric is traceable from the top-level Business Outcome down to individual data points entered by frontline teams.

---

## 2. Hierarchy Architecture

```
Business Outcome
 └── Organizational Objective (identity color: Green/Purple/Blue/Yellow/Orange)
      └── Department
           └── Functional Objective
                └── Key Result
                     └── KPI Indicator ← scored via CSM Feature Matrix
```

Each level's RAG status is **calculated bottom-up** from child entities using configurable formulas.

---

## 3. RAG Status Engine — The Algorithm

### 3.1 Bottom-Up Calculation Flow

| Level                  | Calculation Method                                                                 |
|------------------------|------------------------------------------------------------------------------------|
| **KPI Indicator**      | CSM Feature Matrix → Vector weights (Green=1, Amber=0.5, Red=0) → Customer AVG → KPI Aggregate × 100 = % |
| **Key Result**         | Aggregates child KPIs using stored formula (AVG / SUM / MIN / MAX / WEIGHTED_AVG)  |
| **Functional Objective** | Aggregates child KRs using stored formula                                        |
| **Department**         | Average of its Functional Objectives                                               |
| **Org Objective**      | Average of its Departments                                                         |
| **Business Outcome**   | Average of all Org Objectives                                                      |

### 3.2 Universal RAG Thresholds

| Color       | Range      | Label     |
|-------------|------------|-----------|
| 🟢 Green    | 76–100%    | On Track  |
| 🟡 Amber    | 51–75%     | At Risk   |
| 🔴 Red      | 1–50%      | Critical  |
| ⚪ Not Set  | 0% / null  | No Data   |

### 3.3 Formula-Driven Aggregation

- Every aggregation at FO, KR, and KPI levels uses **explicit formulas** stored in the database (MIN, MAX, AVG, SUM, WEIGHTED_AVG).
- If no formula is provided, the system defaults to **Simple Average (AVG)**.
- Formulas are imported via Excel and can be updated by Admins.

---

## 4. CSM Feature Matrix — The Data Entry Engine

CSMs do **not** enter raw percentages. Instead, they select **KPI-specific band labels** from dropdowns:

| Example KPI   | Band Options                    | Vector Mapping        |
|---------------|---------------------------------|-----------------------|
| Adoption Rate | "76-100%", "51-75%", "1-50%"    | Green=1, Amber=0.5, Red=0 |
| Onboarding    | "1-30 Days", "31-60 Days", "60+ Days" | Green=1, Amber=0.5, Red=0 |
| NPS           | "Promoter", "Passive", "Detractor"   | Green=1, Amber=0.5, Red=0 |

### Rollup Formula

```
Band Selection → Vector Weight (1 / 0.5 / 0)
→ AVG across features per customer = Customer Average
→ AVG across all customers = KPI Aggregate
→ KPI Aggregate × 100 = Indicator %
→ Apply RAG thresholds → Cascade upward through hierarchy
```

### Derivation Transparency

Any authorized user can **click on a KPI** to see:
- A **bar chart** of customer averages (color-coded by RAG)
- A **Customer × Feature breakdown table** with individual scores and band labels
- The **aggregation formula** showing how the final value was derived

---

## 5. Three-Way Interconnection

Every entity links **bidirectionally** across all three pillars:

```
Key Results ↔ Customers ↔ Features ↔ Key Results
```

This enables **root-cause discovery**:

> "Why is this Org Objective red?"
> → Drill into Department → KR → KPI
> → See which customers scored low
> → See which features they're underperforming on

Each detail page shows:
- **Feature Detail**: customers using it + impacted KRs
- **Customer Detail**: features used + specific affected KRs
- **Key Result Detail**: customers impacting it + features affecting it

---

## 6. Role-Based Access Control (RBAC)

| Role              | Visibility                                      | Capabilities                                                                 |
|-------------------|--------------------------------------------------|------------------------------------------------------------------------------|
| **Admin**         | All departments, all data                        | Full CRUD, user management, role/dept assignment, bulk import/export, metadata editing, CSM score oversight |
| **Department Head** | Assigned departments only                      | Enter data for assigned departments, view derivation breakdowns              |
| **CSM**           | Assigned departments + assigned customers only   | Enter Feature Matrix scores for their customers, view derivation for their customers only |
| **Viewer**        | Assigned departments only (read-only)            | Browse dashboards, view derivation data                                      |

### Access Control Mechanism
- Admins assign departments to non-admin users via the **Team Access** tab.
- CSMs are additionally scoped by their assigned customers (CSM → Customers → Features → Indicators → Departments).
- Unauthenticated users have full read-only visibility (public view).

---

## 7. Dashboards & Pages

| Page                     | Purpose                                                                 | Primary Users        |
|--------------------------|-------------------------------------------------------------------------|----------------------|
| **Portfolio**            | Top-level: Business Outcome → Org Objectives → Departments with RAG cards | All (filtered by access) |
| **Department Detail**    | Horizontal tree: FO → KR → KPI with clickable derivation               | All                  |
| **Indicator Derivation** | Bar chart + matrix showing CSM scores behind a KPI                      | All (RBAC-filtered)  |
| **Department Data Entry**| CSM Feature Matrix for entering band-based scores                       | CSM, Dept Head, Admin |
| **Customers Page**       | Health cards with tier/region/industry, trend sparklines, feature badges | All                  |
| **Customer Detail**      | Full customer profile with linked KRs and features                      | All                  |
| **Features Page**        | Feature adoption overview with customer linkage                         | All                  |
| **Feature Detail**       | Feature profile with linked customers and KRs                           | All                  |
| **Data Management**      | Admin control: bulk import, CSM oversight, activity logs, OKR metadata  | Admin only           |
| **Team Access**          | User role + department assignment management                            | Admin only           |
| **Activity Timeline**    | Audit trail of all platform changes                                     | Admin only           |

---

## 8. Data Flow — End to End

```
Step 1: Admin imports OKR structure via Excel
        (Org Objectives, Departments, FOs, KRs, KPIs)
            ↓
Step 2: Admin configures KPI-specific RAG bands
        (band labels + vector weights per indicator)
            ↓
Step 3: Admin creates linkages
        (Customer ↔ Feature ↔ Indicator mappings)
            ↓
Step 4: CSMs enter qualitative band scores
        (per Customer × Feature × KPI × Period)
            ↓
Step 5: Engine calculates
        Vector weights → Customer AVGs → KPI Aggregate
        → Formula-driven rollup through KR → FO → Dept → Org Obj → Business Outcome
            ↓
Step 6: Dashboard displays real-time RAG status
        Every color is clickable for full derivation transparency
            ↓
Step 7: Senior management sees organizational health
        on a single Portfolio page
```

---

## 9. Key Design Principles

| Principle                    | Description                                                                              |
|------------------------------|------------------------------------------------------------------------------------------|
| **Formula-Driven**           | Every aggregation uses explicit formulas stored in the database — no hardcoded logic      |
| **Transparency**             | Every RAG color can be clicked to see exactly how it was derived                          |
| **Qualitative → Quantitative** | CSMs select human-readable bands; system converts to numeric weights for rollup        |
| **Venture Lens**             | Portfolio can be filtered by product line (venture) without changing org structure         |
| **Audit Trail**              | Every change is logged with user, timestamp, old value, and new value                     |
| **RBAC by Design**           | Visibility is scoped at every level — no user sees data outside their assigned scope      |
| **Bidirectional Traceability** | Any entity can be traced to its impact across OKR, Customer, and Feature pillars        |

---

## 10. Technology Stack

| Layer          | Technology                     |
|----------------|--------------------------------|
| Frontend       | React + TypeScript + Vite      |
| Styling        | Tailwind CSS + shadcn/ui       |
| Charts         | Recharts                       |
| State          | TanStack React Query           |
| Backend        | Lovable Cloud (Supabase)       |
| Database       | PostgreSQL with RLS policies   |
| Auth           | Email-based with role management |
| Data Import    | Excel (ExcelJS) with multi-sheet parsing |

---

*Document generated from RAG Cascade Venture Health Intelligence Platform*
*Version: February 2026*
