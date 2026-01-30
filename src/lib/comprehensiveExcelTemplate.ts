import * as XLSX from 'xlsx-js-style';

// ============= COMPREHENSIVE OKR TEMPLATE =============
// 9-column template: Department, Owner, Organizational Objective, Functional Objective, FO Formula, Key Result, KR Formula, KPI, KPI Formula
// RAG thresholds are UNIVERSAL: 1-50 Red, 51-75 Amber, 76-100 Green

interface IndicatorRow {
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

const sampleData: IndicatorRow[] = [
  // Security & Technology - Rishiraj Nigam
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Operational Excellence', 
    functionalObjective: 'Partner Enablement', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Partner Pre-Sales Readiness & Certifications', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Pre-Sales Readiness %', 
    kpiFormula: '(Ready/Total)×100'
  },
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Operational Excellence', 
    functionalObjective: 'Partner Enablement', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Partner Technical Enablement Programs', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Partner Enablement Score %', 
    kpiFormula: '(Enabled/Total)×100'
  },
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Operational Excellence', 
    functionalObjective: 'On-Time Delivery', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'On-Time Secure Delivery of Projects', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'On-Time Delivery Rate %', 
    kpiFormula: '(On-time/Total)×100'
  },
  { 
    department: 'Security & Technology', 
    owner: 'Rishiraj Nigam', 
    orgObjective: 'Operational Excellence', 
    functionalObjective: 'On-Time Delivery', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Zero Critical Security Incidents', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Security Incident Rate', 
    kpiFormula: '(1-(Incidents/Threshold))×100'
  },
  
  // Customer Success - Tanvi Puri
  { 
    department: 'Customer Success', 
    owner: 'Tanvi Puri', 
    orgObjective: 'Maximize Customer Success and Experience', 
    functionalObjective: 'Drive Product Adoption and Retention', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Increase product usage by 25%', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Adoption Rate', 
    kpiFormula: '(active_users/total_users)×100'
  },
  { 
    department: 'Customer Success', 
    owner: 'Tanvi Puri', 
    orgObjective: 'Maximize Customer Success and Experience', 
    functionalObjective: 'Drive Product Adoption and Retention', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Onboard 100% of customers within 30 days', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Onboarding SLA Compliance', 
    kpiFormula: '(onboarded_in_sla/total)×100'
  },
  { 
    department: 'Customer Success', 
    owner: 'Tanvi Puri', 
    orgObjective: 'Maximize Customer Success and Experience', 
    functionalObjective: 'Boost Customer Advocacy', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Conduct QBRs for 100% Key Accounts', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'QBR Coverage Rate', 
    kpiFormula: '(qbrs_conducted/key_accounts)×100'
  },
  { 
    department: 'Customer Success', 
    owner: 'Tanvi Puri', 
    orgObjective: 'Maximize Customer Success and Experience', 
    functionalObjective: 'Boost Customer Advocacy', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Achieve CSAT >= 90% for 100% Key Accounts', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'CSAT Score', 
    kpiFormula: '(satisfied/total_responses)×100'
  },
  
  // Sales - Sachin Jha
  { 
    department: 'Sales', 
    owner: 'Sachin Jha', 
    orgObjective: 'Expand Pipeline and Revenue Growth', 
    functionalObjective: 'Expand Pipeline', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Generate 200 qualified leads per quarter', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Lead Generation Rate', 
    kpiFormula: '(qualified_leads/target)×100'
  },
  { 
    department: 'Sales', 
    owner: 'Sachin Jha', 
    orgObjective: 'Expand Pipeline and Revenue Growth', 
    functionalObjective: 'Expand Pipeline', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Increase pipeline value by 30%', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Pipeline Growth Rate', 
    kpiFormula: '((current-previous)/previous)×100'
  },
  { 
    department: 'Sales', 
    owner: 'Sachin Jha', 
    orgObjective: 'Expand Pipeline and Revenue Growth', 
    functionalObjective: 'Accelerate Deal Closures', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Reduce sales cycle by 20%', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Sales Cycle Efficiency', 
    kpiFormula: '((baseline-current)/baseline)×100'
  },
  { 
    department: 'Sales', 
    owner: 'Sachin Jha', 
    orgObjective: 'Expand Pipeline and Revenue Growth', 
    functionalObjective: 'Accelerate Deal Closures', 
    foFormula: '(KR1 % + KR2 %) / 2',
    keyResult: 'Achieve 40% win rate', 
    krFormula: 'MIN((Actual/Target)×100,100)',
    kpi: 'Win Rate', 
    kpiFormula: '(deals_won/total_opps)×100'
  },
];

function createInstructionsSheet(): XLSX.WorkSheet {
  const data = [
    ['📋 OKR IMPORT TEMPLATE (V5.4)'],
    [''],
    ['=== OVERVIEW ==='],
    ['This template imports your complete OKR hierarchy with formulas at each level:'],
    ['Organization Objective → Functional Objective (+ Formula) → Key Result (+ Formula) → KPI (+ Formula)'],
    [''],
    ['=== HOW TO USE ==='],
    ['1. Go to the "OKR Data" sheet'],
    ['2. Delete the sample data rows (keep the header row!)'],
    ['3. Fill in your data - one row per KPI'],
    ['4. Save as .xlsx and upload'],
    [''],
    ['=== 9-COLUMN STRUCTURE ==='],
    [''],
    ['Column A: Department - Name of the department (e.g., "Security & Technology")'],
    ['Column B: Owner - Owner/Head of the department (e.g., "Rishiraj Nigam")'],
    ['Column C: Organizational Objective - Top-level business objective'],
    ['Column D: Functional Objective - Team-level objective within the department'],
    ['Column E: Formula - FO aggregation formula (e.g., "(KR1 % + KR2 %) / 2")'],
    ['Column F: Key Result - Measurable outcome under the functional objective'],
    ['Column G: Formula (BODMAS) - KR calculation (e.g., "MIN((Actual/Target)×100,100)")'],
    ['Column H: KPI - Specific metric being tracked'],
    ['Column I: Formula - KPI calculation (e.g., "(Ready/Total)×100")'],
    [''],
    ['=== FORMULA COLUMNS EXPLAINED ==='],
    [''],
    ['• Column E (FO Formula): How to aggregate Key Results into Functional Objective score'],
    ['  Example: "(KR1 % + KR2 %) / 2" averages two Key Results'],
    [''],
    ['• Column G (KR Formula): BODMAS expression for Key Result calculation'],
    ['  Example: "MIN((Actual/Target)×100,100)" caps at 100%'],
    [''],
    ['• Column I (KPI Formula): How to calculate the raw KPI metric'],
    ['  Example: "(Ready/Total)×100" calculates readiness percentage'],
    [''],
    ['=== UNIVERSAL RAG CALCULATION ==='],
    [''],
    ['RAG status is calculated automatically based on percentage of target achieved:'],
    [''],
    ['  📗 GREEN (On Track):  76% - 100% of target'],
    ['  📙 AMBER (At Risk):   51% - 75% of target'],
    ['  📕 RED (Critical):    1% - 50% of target'],
    [''],
    ['=== IMPORTANT NOTES ==='],
    ['• Same Org Objective + Department + FO + KR will be grouped automatically'],
    ['• Duplicate KPIs (same name under same KR) will be updated, not duplicated'],
    ['• Formulas are stored for reference and future calculations'],
    ['• All KPIs use % unit and Monthly frequency by default'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 85 }];
  return ws;
}

function createDataSheet(): XLSX.WorkSheet {
  const headers = [
    'Department',
    'Owner',
    'Organizational Objective',
    'Functional Objective',
    'Formula',
    'Key Result',
    'Formula (BODMAS)',
    'KPI',
    'Formula',
  ];

  const data = [
    headers,
    ...sampleData.map(row => [
      row.department,
      row.owner,
      row.orgObjective,
      row.functionalObjective,
      row.foFormula,
      row.keyResult,
      row.krFormula,
      row.kpi,
      row.kpiFormula,
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 22 },  // Department
    { wch: 18 },  // Owner
    { wch: 40 },  // Organizational Objective
    { wch: 30 },  // Functional Objective
    { wch: 22 },  // FO Formula
    { wch: 40 },  // Key Result
    { wch: 28 },  // KR Formula (BODMAS)
    { wch: 25 },  // KPI
    { wch: 25 },  // KPI Formula
  ];

  return ws;
}

export function generateComprehensiveTemplate(): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, createInstructionsSheet(), 'Instructions');
  XLSX.utils.book_append_sheet(wb, createDataSheet(), 'OKR Data');

  XLSX.writeFile(wb, 'OKR_Import_Template_V5.4.xlsx');
}

// ============= IMPORTER =============

export interface ParsedIndicatorData {
  department: string;
  owner: string;
  orgObjective: string;
  functionalObjective: string;
  foFormula: string | null;
  keyResult: string;
  krFormula: string | null;
  indicatorName: string;
  formula: string | null;
  targetValue: number | null;
}

export function parseComprehensiveExcel(file: File): Promise<ParsedIndicatorData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Look for OKR Data sheet
        const sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('okr') || name.toLowerCase().includes('data')
        ) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (rows.length < 2) {
          throw new Error('No data rows found in the file');
        }

        // Find header row - handle both old 8-column and new 9-column formats
        const headerRow = rows[0];
        const colIndex: Record<string, number> = {};
        
        let formulaColCount = 0;
        headerRow.forEach((cell: string, idx: number) => {
          const normalized = (cell || '').toString().toLowerCase().trim();
          if (normalized === 'department') colIndex.department = idx;
          if (normalized === 'owner') colIndex.owner = idx;
          if (normalized.includes('organizational') && normalized.includes('objective')) colIndex.orgObjective = idx;
          if ((normalized.includes('functional') && normalized.includes('objective')) || normalized === 'func. objective') colIndex.fo = idx;
          if (normalized.includes('key') && normalized.includes('result')) colIndex.kr = idx;
          if (normalized === 'kpi' || (normalized.includes('indicator') && normalized.includes('name'))) colIndex.kpi = idx;
          if (normalized.includes('target')) colIndex.target = idx;
          
          // Handle multiple formula columns positionally
          if (normalized.includes('formula')) {
            formulaColCount++;
            if (formulaColCount === 1) colIndex.foFormula = idx;
            else if (formulaColCount === 2) colIndex.krFormula = idx;
            else if (formulaColCount === 3) colIndex.kpiFormula = idx;
          }
        });

        const results: ParsedIndicatorData[] = [];
        
        // Carry-forward values for merged cells
        let lastDept = '', lastOwner = '', lastOrgObj = '', lastFO = '', lastFOFormula = '', lastKR = '', lastKRFormula = '';
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => !cell)) continue;

          const department = row[colIndex.department]?.toString().trim() || lastDept;
          const owner = row[colIndex.owner]?.toString().trim() || lastOwner;
          const orgObjective = row[colIndex.orgObjective]?.toString().trim() || lastOrgObj;
          const fo = row[colIndex.fo]?.toString().trim() || lastFO;
          const foFormula = row[colIndex.foFormula]?.toString().trim() || lastFOFormula;
          const kr = row[colIndex.kr]?.toString().trim() || lastKR;
          const krFormula = row[colIndex.krFormula]?.toString().trim() || lastKRFormula;
          const kpi = row[colIndex.kpi]?.toString().trim();

          // Update carry-forward
          if (row[colIndex.department]) lastDept = department;
          if (row[colIndex.owner]) lastOwner = owner;
          if (row[colIndex.orgObjective]) lastOrgObj = orgObjective;
          if (row[colIndex.fo]) lastFO = fo;
          if (row[colIndex.foFormula]) lastFOFormula = foFormula;
          if (row[colIndex.kr]) lastKR = kr;
          if (row[colIndex.krFormula]) lastKRFormula = krFormula;

          if (!kpi) continue;

          results.push({
            department,
            owner,
            orgObjective,
            functionalObjective: fo,
            foFormula: foFormula || null,
            keyResult: kr,
            krFormula: krFormula || null,
            indicatorName: kpi,
            formula: row[colIndex.kpiFormula]?.toString().trim() || null,
            targetValue: row[colIndex.target] ? parseFloat(row[colIndex.target]) : null,
          });
        }

        resolve(results);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
