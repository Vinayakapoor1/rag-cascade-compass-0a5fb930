
# Update OKR Import Template with Your Data

## Summary

Update the downloadable OKR Import Template and Admin UI to match your uploaded file format, replacing the generic sample data with your "Security & Technology" department data.

## Changes Overview

### 1. Update Template File (`src/lib/simpleExcelTemplate.ts`)

**Current sample data** (generic):
- Customer Success, Product Development, Operations departments
- Simple formulas: `AVG(KRs)`, `SUM(KPIs)`

**New sample data** (from your file):
- Security & Technology department with Rishiraj Nigam as owner
- Organizational Objective: "Achieve Operational Excellence - People, Process, Technology"
- 6 Functional Objectives with their Key Results and KPIs
- Real formulas: `(KR1 % + KR2 %) / 2` and `MIN((Actual KPI % / Target KPI %) × 100,100)`

### 2. Update Instructions Sheet

Align the instructions with the exact column headers from your file:
- Column E: "Formula" (for FO aggregation)
- Column G: "Formula (BODMAS rule)" (for KR calculation)
- Column I: "Formula" (for KPI calculation)

### 3. Update Admin UI Preview (`src/pages/AdminUpload.tsx`)

Update the V5 Format tab description to show the 9-column structure matching your template.

---

## New Sample Data (from your file)

| Department | Owner | Org Objective | Functional Objective | FO Formula | Key Result | KR Formula | KPI | KPI Formula |
|------------|-------|---------------|---------------------|------------|------------|------------|-----|-------------|
| Security & Technology | Rishiraj Nigam | Achieve Operational Excellence - People, Process, Technology | Enhance Partner Technical Enablement | (KR1 % + KR2 %) / 2 | Partner Pre-Sales Technical Enablement... | MIN((Actual KPI % / Target KPI %) x 100,100) | Partner Pre-Sales Readiness Compliance % | (No. of partner-led pre-sales engagements meeting readiness criteria / Total evaluated engagements) x 100 |
| ... | ... | ... | Partner Solution Design Compliance | ... | Achieve 90% partner-led solution designs... | ... | Partner Solution Design Compliance % | ... |
| ... | ... | ... | Ensure On-Time and Quality Technical Delivery | (KR1 % + KR2 %) / 2 | On-Time Secure Delivery... | ... | On-Time & Secure Delivery Rate % | ... |
| ... | ... | ... | | | Post Delivery Stability... | ... | Post-Go-Live Stability Rate % | ... |
| ... | ... | ... | Sustain and Scale a Reliable, Resilient Technology Environment | (KR1 % + KR2 %) / 2 | Platform Availability & Performance... | ... | Platform Availability % | ... |
| ... | ... | ... | | | Recoverability & Capacity Readiness... | ... | Resilience & Capacity Compliance % | ... |
| ... | ... | ... | Fortify Security of Managed IT Environment | (KR1 % + KR2 %) / 2 | Preventive Control Coverage... | ... | Preventive Security Control Coverage % | ... |
| ... | ... | ... | | | Detection & Response Effectiveness... | ... | Security Incident SLA Compliance % | ... |
| ... | ... | ... | Drive Automation and Continuous Optimization in Technical Operations | (KR1 % + KR2 %) / 2 | Automation of Repetitive Operations... | ... | Operational Automation Coverage % | ... |
| ... | ... | ... | | | Operational Outcome Improvement... | ... | Operational Outcome Improvement % | ... |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/simpleExcelTemplate.ts` | Replace sample data with your Security & Technology data; update column headers to match your file |
| `src/pages/AdminUpload.tsx` | Update V5 Format description to show accurate 9-column structure |

---

## Technical Details

### Sample Data Structure

```typescript
const sampleData: V54OKRRow[] = [
  // Functional Objective 1: Enhance Partner Technical Enablement
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Enhance Partner Technical Enablement', 
    foFormula: '(KR1 % + KR2 %) / 2', 
    keyResult: 'Partner Pre-Sales Technical Enablement - Ensure >=75% partners are technically ready...', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Partner Pre-Sales Readiness Compliance %', 
    kpiFormula: '(No. of partner-led pre-sales engagements meeting readiness criteria / Total evaluated engagements) × 100' 
  },
  // ... 9 more rows covering all 6 Functional Objectives
];
```

### Column Headers

```typescript
const headers = [
  'Department',
  'Owner', 
  'Organizational Objective',
  'Functional Objective',
  'Formula',                    // FO Formula
  'Key Result',
  'Formula (BODMAS rule)',      // KR Formula
  'KPI',
  'Formula'                     // KPI Formula
];
```

---

## Result

After implementation:
- Downloading the V5 template will produce an Excel file with your exact data structure
- The sample data will be relevant to your Security & Technology use case
- The formulas will reflect your actual calculation patterns
