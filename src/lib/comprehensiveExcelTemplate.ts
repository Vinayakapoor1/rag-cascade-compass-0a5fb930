import * as XLSX from 'xlsx-js-style';

// ============= COMPREHENSIVE OKR TEMPLATE =============
// 8-column template: Department, Owner, Organizational Objective, Functional Objective, Key Result, Indicator Name, Formula, Target Value
// RAG thresholds are UNIVERSAL: 1-50 Red, 51-75 Amber, 76-100 Green

interface IndicatorRow {
  department: string;
  owner: string;
  orgObjective: string;
  functionalObjective: string;
  keyResult: string;
  indicatorName: string;
  formula: string;
  targetValue: number | string;
}

const sampleData: IndicatorRow[] = [
  // Customer Success - Tanvi Puri
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Drive Product Adoption and Retention', keyResult: 'Increase product usage by 25%', indicatorName: 'Adoption Rate', formula: '(active_users / total_users) * 100', targetValue: 80 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Drive Product Adoption and Retention', keyResult: 'Onboard 100% of customers within 30 days', indicatorName: 'Onboarding SLA Compliance', formula: '(onboarded_within_sla / total_new_customers) * 100', targetValue: 100 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Proactively Reduce Churn Risk', keyResult: 'Check-in with all key accounts monthly', indicatorName: 'Renewal Commitment Signal', formula: '(accounts_with_renewal_signal / key_accounts) * 100', targetValue: 90 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Boost Customer Advocacy', keyResult: 'Conduct QBRs for 100% Key Accounts', indicatorName: 'QBR Coverage Rate', formula: '(qbrs_conducted / key_accounts) * 100', targetValue: 100 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Boost Customer Advocacy', keyResult: 'Achieve CSAT >= 90% for 100% Key Accounts', indicatorName: 'CSAT Score', formula: '(satisfied_responses / total_responses) * 100', targetValue: 90 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Boost Customer Advocacy', keyResult: 'Increase NPS by 15%', indicatorName: 'NPS Score', formula: '(promoters - detractors) / total_respondents * 100', targetValue: 50 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Expand Account Value', keyResult: 'Achieve 90% renewal rate', indicatorName: 'Logo Retention Rate', formula: '(renewed_logos / total_logos_for_renewal) * 100', targetValue: 90 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Minimize Operational Disruptions', keyResult: 'Improve service request closure SLA compliance to 90%', indicatorName: 'SLA Compliance Rate', formula: '(tickets_closed_in_sla / total_tickets) * 100', targetValue: 90 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Minimize Operational Disruptions', keyResult: 'Balance workload across team', indicatorName: 'Workload Balance Index', formula: '(1 - (max_load - min_load) / avg_load) * 100', targetValue: 80 },
  { department: 'Customer Success', owner: 'Tanvi Puri', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Minimize Operational Disruptions', keyResult: 'Maintain up-to-date SOPs and processes', indicatorName: 'SOP Compliance Rate', formula: '(compliant_processes / total_processes) * 100', targetValue: 95 },
  
  // Sales - Sachin Jha
  { department: 'Sales', owner: 'Sachin Jha', orgObjective: 'Expand Pipeline and Revenue Growth', functionalObjective: 'Expand Pipeline', keyResult: 'Generate 200 qualified leads per quarter', indicatorName: 'Lead Generation Rate', formula: '(qualified_leads / target_leads) * 100', targetValue: 100 },
  { department: 'Sales', owner: 'Sachin Jha', orgObjective: 'Expand Pipeline and Revenue Growth', functionalObjective: 'Expand Pipeline', keyResult: 'Increase pipeline value by 30%', indicatorName: 'Pipeline Growth Rate', formula: '((current_pipeline - previous_pipeline) / previous_pipeline) * 100', targetValue: 30 },
  { department: 'Sales', owner: 'Sachin Jha', orgObjective: 'Expand Pipeline and Revenue Growth', functionalObjective: 'Enhance Partner Ecosystem', keyResult: 'Onboard 10 new partners', indicatorName: 'Partner Onboarding Rate', formula: '(partners_onboarded / target_partners) * 100', targetValue: 100 },
  { department: 'Sales', owner: 'Sachin Jha', orgObjective: 'Expand Pipeline and Revenue Growth', functionalObjective: 'Enhance Partner Ecosystem', keyResult: 'Generate 25% revenue from partners', indicatorName: 'Partner Revenue Contribution', formula: '(partner_revenue / total_revenue) * 100', targetValue: 25 },
  { department: 'Sales', owner: 'Sachin Jha', orgObjective: 'Expand Pipeline and Revenue Growth', functionalObjective: 'Accelerate Deal Closures', keyResult: 'Reduce sales cycle by 20%', indicatorName: 'Sales Cycle Efficiency', formula: '((baseline_cycle - current_cycle) / baseline_cycle) * 100', targetValue: 20 },
  { department: 'Sales', owner: 'Sachin Jha', orgObjective: 'Expand Pipeline and Revenue Growth', functionalObjective: 'Accelerate Deal Closures', keyResult: 'Achieve 40% win rate', indicatorName: 'Win Rate', formula: '(deals_won / total_opportunities) * 100', targetValue: 40 },
  { department: 'Sales', owner: 'Sachin Jha', orgObjective: 'Expand Pipeline and Revenue Growth', functionalObjective: 'Improve Forecasting', keyResult: 'Achieve 90% forecast accuracy', indicatorName: 'Forecast Accuracy', formula: '(1 - abs(forecast - actual) / actual) * 100', targetValue: 90 },
  { department: 'Sales', owner: 'Sachin Jha', orgObjective: 'Expand Pipeline and Revenue Growth', functionalObjective: 'Improve Forecasting', keyResult: 'Update CRM weekly for all deals', indicatorName: 'CRM Hygiene Score', formula: '(updated_records / total_records) * 100', targetValue: 100 },
  
  // Content Management - Rasraj Das
  { department: 'Content Management', owner: 'Rasraj Das', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Deliver High-Quality Content', keyResult: 'Publish 50 pieces of content per quarter', indicatorName: 'Content Publishing Rate', formula: '(content_published / target_content) * 100', targetValue: 100 },
  { department: 'Content Management', owner: 'Rasraj Das', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Deliver High-Quality Content', keyResult: 'Achieve 95% content accuracy', indicatorName: 'Content Accuracy Score', formula: '(accurate_content / total_content) * 100', targetValue: 95 },
  { department: 'Content Management', owner: 'Rasraj Das', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Ensure Timely Delivery', keyResult: 'Meet 100% of content deadlines', indicatorName: 'Deadline Compliance Rate', formula: '(on_time_deliveries / total_deliveries) * 100', targetValue: 100 },
  { department: 'Content Management', owner: 'Rasraj Das', orgObjective: 'Maximize Customer Success and Experience', functionalObjective: 'Ensure Timely Delivery', keyResult: 'Reduce content turnaround time by 15%', indicatorName: 'Turnaround Efficiency', formula: '((baseline_time - current_time) / baseline_time) * 100', targetValue: 15 },
];

function createInstructionsSheet(): XLSX.WorkSheet {
  const data = [
    ['📋 OKR IMPORT TEMPLATE'],
    [''],
    ['=== OVERVIEW ==='],
    ['This template imports your complete OKR hierarchy:'],
    ['Organization Objective → Department → Functional Objective → Key Result → Indicator'],
    [''],
    ['=== HOW TO USE ==='],
    ['1. Go to the "OKR Data" sheet'],
    ['2. Delete the sample data rows (keep the header row!)'],
    ['3. Fill in your data - one row per INDICATOR'],
    ['4. Save as .xlsx and upload'],
    [''],
    ['=== COLUMN DEFINITIONS ==='],
    [''],
    ['HIERARCHY COLUMNS (Required):'],
    ['• Department - Name of the department (e.g., "Customer Success")'],
    ['• Owner - Owner/Head of the department'],
    ['• Organizational Objective - Top-level business objective'],
    ['• Functional Objective - Team-level objective within the department'],
    ['• Key Result - Measurable outcome under the functional objective'],
    ['• Indicator Name - Specific metric being tracked'],
    [''],
    ['MEASUREMENT COLUMNS:'],
    ['• Formula - Calculation expression (e.g., "(responses / sent) * 100")'],
    ['• Target Value - Target number for this indicator (default: 100)'],
    [''],
    ['=== UNIVERSAL RAG CALCULATION ==='],
    [''],
    ['RAG status is calculated automatically based on percentage of target achieved:'],
    [''],
    ['  📗 GREEN (On Track):  76% - 100% of target'],
    ['  📙 AMBER (At Risk):   51% - 75% of target'],
    ['  📕 RED (Critical):    1% - 50% of target'],
    [''],
    ['Formula: (Current Value / Target Value) × 100'],
    [''],
    ['Example:'],
    ['  Target = 80, Current = 64'],
    ['  Progress = (64 / 80) × 100 = 80%'],
    ['  Status = GREEN ✓'],
    [''],
    ['=== IMPORTANT NOTES ==='],
    ['• Same Org Objective + Department + FO + KR will be grouped automatically'],
    ['• Duplicate indicators (same name under same KR) will be updated, not duplicated'],
    ['• Formula is optional - used for reference/documentation'],
    ['• Target Value defaults to 100 if not specified'],
    ['• All indicators use % unit and Monthly frequency by default'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 80 }];
  return ws;
}

function createDataSheet(): XLSX.WorkSheet {
  const headers = [
    'Department',
    'Owner',
    'Organizational Objective',
    'Functional Objective',
    'Key Result',
    'Indicator Name',
    'Formula',
    'Target Value',
  ];

  const data = [
    headers,
    ...sampleData.map(row => [
      row.department,
      row.owner,
      row.orgObjective,
      row.functionalObjective,
      row.keyResult,
      row.indicatorName,
      row.formula,
      row.targetValue,
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 },  // Department
    { wch: 15 },  // Owner
    { wch: 40 },  // Organizational Objective
    { wch: 35 },  // Functional Objective
    { wch: 40 },  // Key Result
    { wch: 30 },  // Indicator Name
    { wch: 45 },  // Formula
    { wch: 12 },  // Target Value
  ];

  return ws;
}

export function generateComprehensiveTemplate(): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, createInstructionsSheet(), 'Instructions');
  XLSX.utils.book_append_sheet(wb, createDataSheet(), 'OKR Data');

  XLSX.writeFile(wb, 'OKR_Import_Template.xlsx');
}

// ============= IMPORTER =============

export interface ParsedIndicatorData {
  department: string;
  owner: string;
  orgObjective: string;
  functionalObjective: string;
  keyResult: string;
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

        // Find header row
        const headerRow = rows[0];
        const colIndex: Record<string, number> = {};
        
        headerRow.forEach((cell: string, idx: number) => {
          const normalized = (cell || '').toString().toLowerCase().trim();
          if (normalized === 'department') colIndex.department = idx;
          if (normalized === 'owner') colIndex.owner = idx;
          if (normalized.includes('organizational') && normalized.includes('objective')) colIndex.orgObjective = idx;
          if ((normalized.includes('functional') && normalized.includes('objective')) || normalized === 'func. objective') colIndex.fo = idx;
          if (normalized.includes('key') && normalized.includes('result')) colIndex.kr = idx;
          if (normalized.includes('indicator') && normalized.includes('name')) colIndex.indicator = idx;
          if (normalized === 'formula') colIndex.formula = idx;
          if (normalized.includes('target')) colIndex.target = idx;
        });

        const results: ParsedIndicatorData[] = [];
        
        // Carry-forward values for merged cells
        let lastDept = '', lastOwner = '', lastOrgObj = '', lastFO = '', lastKR = '';
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => !cell)) continue;

          const department = row[colIndex.department]?.toString().trim() || lastDept;
          const owner = row[colIndex.owner]?.toString().trim() || lastOwner;
          const orgObjective = row[colIndex.orgObjective]?.toString().trim() || lastOrgObj;
          const fo = row[colIndex.fo]?.toString().trim() || lastFO;
          const kr = row[colIndex.kr]?.toString().trim() || lastKR;
          const indicator = row[colIndex.indicator]?.toString().trim();

          // Update carry-forward
          if (row[colIndex.department]) lastDept = department;
          if (row[colIndex.owner]) lastOwner = owner;
          if (row[colIndex.orgObjective]) lastOrgObj = orgObjective;
          if (row[colIndex.fo]) lastFO = fo;
          if (row[colIndex.kr]) lastKR = kr;

          if (!indicator) continue;

          results.push({
            department,
            owner,
            orgObjective,
            functionalObjective: fo,
            keyResult: kr,
            indicatorName: indicator,
            formula: row[colIndex.formula]?.toString().trim() || null,
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
