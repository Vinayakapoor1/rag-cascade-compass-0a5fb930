import * as XLSX from 'xlsx-js-style';

// ============= V5.4 OKR IMPORT TEMPLATE =============
// 10-column format with positional formula detection
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
  // Customer Success samples
  { department: 'Customer Success', owner: 'Jane Smith', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Drive Product Adoption and Retention', foFormula: 'AVG(KRs)', keyResult: 'Achieve 95% Customer Satisfaction Score', krFormula: 'AVG(KPIs)', kpi: 'Weekly survey response rate', kpiFormula: '(responses / sent) * 100' },
  { department: 'Customer Success', owner: 'Jane Smith', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Drive Product Adoption and Retention', foFormula: '', keyResult: 'Achieve 95% Customer Satisfaction Score', krFormula: '', kpi: 'Monthly CSAT score', kpiFormula: '(satisfied / total) * 100' },
  { department: 'Customer Success', owner: 'Jane Smith', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Drive Product Adoption and Retention', foFormula: '', keyResult: 'Reduce Customer Churn to Below 5%', krFormula: 'SUM(KPIs)', kpi: 'Monthly churn rate', kpiFormula: '(churned / total) * 100' },
  
  // Product Development samples
  { department: 'Product Development', owner: 'Mike Johnson', orgObjective: 'Drive Market-Leading Innovation', functionalObjective: 'Accelerate Product Releases', foFormula: 'AVG(KRs)', keyResult: 'Launch 3 Major Features This Quarter', krFormula: 'AVG(KPIs)', kpi: 'Features shipped', kpiFormula: 'COUNT(features WHERE status = shipped)' },
  { department: 'Product Development', owner: 'Mike Johnson', orgObjective: 'Drive Market-Leading Innovation', functionalObjective: 'Accelerate Product Releases', foFormula: '', keyResult: 'Reduce Bug Count by 50%', krFormula: 'AVG(KPIs)', kpi: 'Open bug count', kpiFormula: 'COUNT(bugs WHERE status = open)' },
  
  // Operations samples
  { department: 'Operations', owner: 'Sarah Wilson', orgObjective: 'Achieve Operational Excellence', functionalObjective: 'Optimize System Performance', foFormula: 'AVG(KRs)', keyResult: 'Maintain 99.9% System Uptime', krFormula: 'AVG(KPIs)', kpi: 'Monthly uptime percentage', kpiFormula: '(uptime_minutes / total_minutes) * 100' },
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
    ['=== COLUMN STRUCTURE (10 COLUMNS) ==='],
    ['Column A: Department - Department name'],
    ['Column B: Owner - Owner of the department/team'],
    ['Column C: Organizational Objective - High-level strategic objective'],
    ['Column D: Functional Objective - Team-level objective under Department'],
    ['Column E: FO Formula - Formula for aggregating Key Results (AVG, SUM, WEIGHTED_AVG, MIN, MAX)'],
    ['Column F: Key Result - Measurable outcome under Functional Objective'],
    ['Column G: KR Formula (Apply BODMAS rule) - Formula for aggregating KPIs'],
    ['Column H: KPI - Key Performance Indicator'],
    ['Column I: KPI Formula - How the KPI value is calculated'],
    ['Column J: (Reserved for future use)'],
    [''],
    ['=== FORMULA TYPES ==='],
    ['FO Formula & KR Formula: Use aggregation functions like AVG(KRs), SUM(KPIs), WEIGHTED_AVG, MIN, MAX'],
    ['KPI Formula: Use mathematical expressions like (current / target) * 100'],
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
  ws['!cols'] = [{ wch: 90 }];
  return ws;
}

function createOKRDataSheet(): XLSX.WorkSheet {
  const headers = [
    'Department',
    'Owner', 
    'Organizational Objective',
    'Functional Objective',
    'FO Formula',
    'Key Result',
    'KR Formula (Apply BODMAS rule)',
    'KPI',
    'KPI Formula',
    '' // Reserved column
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
    row.kpiFormula,
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  ws['!cols'] = [
    { wch: 20 },  // Department
    { wch: 18 },  // Owner
    { wch: 40 },  // Organizational Objective
    { wch: 35 },  // Functional Objective
    { wch: 18 },  // FO Formula
    { wch: 40 },  // Key Result
    { wch: 25 },  // KR Formula
    { wch: 30 },  // KPI
    { wch: 35 },  // KPI Formula
    { wch: 10 },  // Reserved
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
