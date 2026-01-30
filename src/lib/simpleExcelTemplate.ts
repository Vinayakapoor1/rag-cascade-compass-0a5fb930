import * as XLSX from 'xlsx-js-style';

// ============= V5.4 OKR IMPORT TEMPLATE =============
// 9-column format with positional formula detection
// RAG thresholds are UNIVERSAL: 1-50 Red, 51-75 Amber, 76-100 Green

interface V54OKRRow {
  department: string;
  owner: string;
  orgObjective: string;
  functionalObjective: string;
  foFormula: string;
  keyResult: string;
  krFormula: string;
  kpi: string;
  kpiFormula: string;
}

const sampleData: V54OKRRow[] = [
  // Functional Objective 1: Enhance Partner Technical Enablement
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Enhance Partner Technical Enablement', 
    foFormula: '(KR1 % + KR2 %) / 2', 
    keyResult: 'Partner Pre-Sales Technical Enablement - Ensure >=75% partners are technically ready for pre-sales engagements', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Partner Pre-Sales Readiness Compliance %', 
    kpiFormula: '(No. of partner-led pre-sales engagements meeting readiness criteria / Total evaluated engagements) × 100' 
  },
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Enhance Partner Technical Enablement', 
    foFormula: '', 
    keyResult: 'Partner Solution Design Compliance - Achieve 90% partner-led solution designs fully compliant with architecture standards', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Partner Solution Design Compliance %', 
    kpiFormula: '(No. of compliant partner-led solution designs / Total partner-led solution designs) × 100' 
  },
  
  // Functional Objective 2: Ensure On-Time and Quality Technical Delivery
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Ensure On-Time and Quality Technical Delivery', 
    foFormula: '(KR1 % + KR2 %) / 2', 
    keyResult: 'On-Time Secure Delivery - Deliver 95% of projects on time with zero critical security defects', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'On-Time & Secure Delivery Rate %', 
    kpiFormula: '(No. of projects delivered on-time with zero P1/P2 security defects / Total projects delivered) × 100' 
  },
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Ensure On-Time and Quality Technical Delivery', 
    foFormula: '', 
    keyResult: 'Post Delivery Stability - Achieve 90% post-go-live stability with no critical incidents within 30 days', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Post-Go-Live Stability Rate %', 
    kpiFormula: '(No. of projects with no P1 incidents in 30 days post go-live / Total go-lives) × 100' 
  },
  
  // Functional Objective 3: Sustain and Scale a Reliable, Resilient Technology Environment
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Sustain and Scale a Reliable, Resilient Technology Environment', 
    foFormula: '(KR1 % + KR2 %) / 2', 
    keyResult: 'Platform Availability & Performance - Maintain >=99.9% uptime and SLA compliance across all critical systems', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Platform Availability %', 
    kpiFormula: '(Total uptime minutes / Total minutes in period) × 100' 
  },
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Sustain and Scale a Reliable, Resilient Technology Environment', 
    foFormula: '', 
    keyResult: 'Recoverability & Capacity Readiness - Achieve 100% DR readiness and capacity headroom across all critical systems', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Resilience & Capacity Compliance %', 
    kpiFormula: '(No. of systems meeting DR and capacity standards / Total critical systems) × 100' 
  },
  
  // Functional Objective 4: Fortify Security of Managed IT Environment
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Fortify Security of Managed IT Environment', 
    foFormula: '(KR1 % + KR2 %) / 2', 
    keyResult: 'Preventive Control Coverage - Ensure 100% coverage of critical security controls (patching, hardening, endpoint protection)', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Preventive Security Control Coverage %', 
    kpiFormula: '(No. of systems with all critical controls in place / Total managed systems) × 100' 
  },
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Fortify Security of Managed IT Environment', 
    foFormula: '', 
    keyResult: 'Detection & Response Effectiveness - Achieve 95% SLA compliance for security incident detection and response', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Security Incident SLA Compliance %', 
    kpiFormula: '(No. of security incidents resolved within SLA / Total security incidents) × 100' 
  },
  
  // Functional Objective 5: Drive Automation and Continuous Optimization in Technical Operations
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Drive Automation and Continuous Optimization in Technical Operations', 
    foFormula: '(KR1 % + KR2 %) / 2', 
    keyResult: 'Automation of Repetitive Operations - Automate 80% of repetitive operational tasks', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Operational Automation Coverage %', 
    kpiFormula: '(No. of automated tasks / Total identified repetitive tasks) × 100' 
  },
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Achieve Operational Excellence - People, Process, Technology', 
    functionalObjective: 'Drive Automation and Continuous Optimization in Technical Operations', 
    foFormula: '', 
    keyResult: 'Operational Outcome Improvement - Achieve 15% improvement in key operational metrics (MTTR, ticket resolution time)', 
    krFormula: 'MIN((Actual KPI % / Target KPI %) × 100,100)', 
    kpi: 'Operational Outcome Improvement %', 
    kpiFormula: '((Baseline metric - Current metric) / Baseline metric) × 100' 
  },
];

function createInstructionsSheet(): XLSX.WorkSheet {
  const instructions = [
    ['📋 OKR Import Template V5.4'],
    [''],
    ['=== HOW TO USE ==='],
    ['1. Fill in the "OKR Data" sheet - each row represents one KPI'],
    ['2. Use merged cells or repeat parent values (Department, Org Objective, etc.)'],
    ['3. Formula columns follow their parent entity (FO Formula after Functional Objective, etc.)'],
    ['4. Upload the file - hierarchy is auto-detected from column positions'],
    [''],
    ['=== COLUMN STRUCTURE (9 COLUMNS) ==='],
    ['Column A: Department - Department name'],
    ['Column B: Owner - Owner of the department/team'],
    ['Column C: Organizational Objective - High-level strategic objective'],
    ['Column D: Functional Objective - Team-level objective under Department'],
    ['Column E: Formula - Formula for aggregating Key Results (e.g., (KR1 % + KR2 %) / 2)'],
    ['Column F: Key Result - Measurable outcome under Functional Objective'],
    ['Column G: Formula (BODMAS rule) - Formula for calculating KR from KPI (e.g., MIN((Actual KPI % / Target KPI %) × 100,100))'],
    ['Column H: KPI - Key Performance Indicator'],
    ['Column I: Formula - How the KPI value is calculated'],
    [''],
    ['=== FORMULA TYPES ==='],
    ['FO Formula: Aggregation formulas like (KR1 % + KR2 %) / 2, AVG(KRs), SUM(KRs)'],
    ['KR Formula: Calculation formulas like MIN((Actual KPI % / Target KPI %) × 100,100)'],
    ['KPI Formula: Mathematical expressions describing how to calculate the KPI value'],
    [''],
    ['=== UNIVERSAL RAG CALCULATION ==='],
    [''],
    ['RAG status is calculated automatically based on % of target achieved:'],
    [''],
    ['  📗 GREEN (On Track):  76% - 100% of target'],
    ['  📙 AMBER (At Risk):   51% - 75% of target'],
    ['  📕 RED (Critical):    1% - 50% of target'],
    [''],
    ['=== TIPS ==='],
    ['• Same Org Objective name = same Org Objective (auto-grouped)'],
    ['• Same Department name under same Org Objective = same Department'],
    ['• Hierarchy is inferred from repeating values - no manual linking needed!'],
    ['• Leave formula cells empty for rows that inherit from the row above'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(instructions);
  ws['!cols'] = [{ wch: 100 }];
  return ws;
}

function createOKRDataSheet(): XLSX.WorkSheet {
  const headers = [
    'Department',
    'Owner', 
    'Organizational Objective',
    'Functional Objective',
    'Formula',
    'Key Result',
    'Formula (BODMAS rule)',
    'KPI',
    'Formula'
  ];

  const rows = sampleData.map(row => [
    row.department,
    row.owner,
    row.orgObjective,
    row.functionalObjective,
    row.foFormula,
    row.keyResult,
    row.krFormula,
    row.kpi,
    row.kpiFormula
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  ws['!cols'] = [
    { wch: 22 },  // Department
    { wch: 18 },  // Owner
    { wch: 55 },  // Organizational Objective
    { wch: 50 },  // Functional Objective
    { wch: 22 },  // Formula (FO)
    { wch: 80 },  // Key Result
    { wch: 45 },  // Formula (BODMAS rule)
    { wch: 40 },  // KPI
    { wch: 70 },  // Formula (KPI)
  ];

  return ws;
}

export function generateSimpleOKRTemplate(): void {
  const wb = XLSX.utils.book_new();
  
  const instructionsSheet = createInstructionsSheet();
  const okrDataSheet = createOKRDataSheet();
  
  XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');
  XLSX.utils.book_append_sheet(wb, okrDataSheet, 'OKR Data');
  
  XLSX.writeFile(wb, 'OKR_Import_Template_V5.4.xlsx');
}
