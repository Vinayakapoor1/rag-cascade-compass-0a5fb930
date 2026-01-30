import * as XLSX from 'xlsx-js-style';
import type { OrgObjectiveColor } from '@/types/venture';

// ============= ENRICHED OKR TEMPLATE GENERATOR =============
// Creates a comprehensive, self-documenting Excel template

interface OrgObjectiveTemplate {
  name: string;
  description: string;
  color: OrgObjectiveColor;
  classification: 'CORE' | 'Enabler';
  businessOutcome: string;
}

interface DepartmentTemplate {
  name: string;
  orgObjective: string;
}

interface FunctionalObjectiveTemplate {
  name: string;
  department: string;
  owner: string;
}

interface KeyResultTemplate {
  name: string;
  functionalObjective: string;
  target: number;
  current: number;
  unit: string;
  owner: string;
}

interface IndicatorTemplate {
  name: string;
  keyResult: string;
  tier: 'Tier 1' | 'Tier 2';
  target: number;
  current: number;
  formula: string;
  frequency: string;
}

// Sample data
const sampleOrgObjectives: OrgObjectiveTemplate[] = [
  { name: 'Maximize Customer Success', description: 'Drive customer satisfaction and retention', color: 'green', classification: 'CORE', businessOutcome: '3X Revenue - 2025' },
  { name: 'Market-Leading Innovation', description: 'Deliver innovative security solutions', color: 'purple', classification: 'CORE', businessOutcome: '3X Revenue - 2025' },
  { name: 'Sustainable Revenue Growth', description: 'Achieve consistent revenue targets', color: 'blue', classification: 'CORE', businessOutcome: '3X Revenue - 2025' },
  { name: 'Operational Excellence', description: 'Optimize internal processes', color: 'yellow', classification: 'Enabler', businessOutcome: '3X Revenue - 2025' },
  { name: 'Talent & Culture', description: 'Build high-performing teams', color: 'orange', classification: 'Enabler', businessOutcome: '3X Revenue - 2025' },
];

const sampleDepartments: DepartmentTemplate[] = [
  { name: 'Customer Success', orgObjective: 'Maximize Customer Success' },
  { name: 'Product Development', orgObjective: 'Market-Leading Innovation' },
  { name: 'Sales', orgObjective: 'Sustainable Revenue Growth' },
  { name: 'Operations', orgObjective: 'Operational Excellence' },
  { name: 'HR', orgObjective: 'Talent & Culture' },
];

const sampleFunctionalObjectives: FunctionalObjectiveTemplate[] = [
  { name: 'Drive Product Adoption', department: 'Customer Success', owner: 'CS Lead' },
  { name: 'Reduce Customer Churn', department: 'Customer Success', owner: 'Retention Manager' },
  { name: 'Launch New Features', department: 'Product Development', owner: 'Product Manager' },
  { name: 'Increase Deal Size', department: 'Sales', owner: 'Sales Director' },
  { name: 'Streamline Processes', department: 'Operations', owner: 'Ops Manager' },
];

const sampleKeyResults: KeyResultTemplate[] = [
  { name: 'Achieve 95% CSAT score', functionalObjective: 'Drive Product Adoption', target: 95, current: 87, unit: '%', owner: 'CS Lead' },
  { name: 'Onboard 50 new customers', functionalObjective: 'Drive Product Adoption', target: 50, current: 32, unit: 'customers', owner: 'Onboarding Lead' },
  { name: 'Reduce churn to <5%', functionalObjective: 'Reduce Customer Churn', target: 5, current: 7, unit: '%', owner: 'Retention Manager' },
  { name: 'Launch 3 major features', functionalObjective: 'Launch New Features', target: 3, current: 1, unit: 'features', owner: 'Product Manager' },
  { name: 'Increase ACV by 20%', functionalObjective: 'Increase Deal Size', target: 20, current: 12, unit: '%', owner: 'Sales Director' },
];

const sampleIndicators: IndicatorTemplate[] = [
  // For "Achieve 95% CSAT score"
  { name: 'Weekly survey response rate', keyResult: 'Achieve 95% CSAT score', tier: 'Tier 1', target: 80, current: 65, formula: '(Responses/Sent)*100', frequency: 'Weekly' },
  { name: 'Support ticket resolution time', keyResult: 'Achieve 95% CSAT score', tier: 'Tier 1', target: 4, current: 6, formula: 'Avg hours to resolve', frequency: 'Daily' },
  { name: 'Monthly CSAT score', keyResult: 'Achieve 95% CSAT score', tier: 'Tier 2', target: 95, current: 87, formula: '(Satisfied/Total)*100', frequency: 'Monthly' },
  // For "Reduce churn to <5%"
  { name: 'At-risk customer alerts', keyResult: 'Reduce churn to <5%', tier: 'Tier 1', target: 10, current: 15, formula: 'Count health<50', frequency: 'Weekly' },
  { name: 'Renewal conversations held', keyResult: 'Reduce churn to <5%', tier: 'Tier 1', target: 100, current: 78, formula: 'Renewals discussed', frequency: 'Monthly' },
  { name: 'Monthly churn rate', keyResult: 'Reduce churn to <5%', tier: 'Tier 2', target: 5, current: 7, formula: '(Churned/Total)*100', frequency: 'Monthly' },
];

function getColorLabel(color: OrgObjectiveColor): string {
  const colorLabels: Record<OrgObjectiveColor, string> = {
    green: 'green',
    purple: 'purple',
    blue: 'blue',
    yellow: 'yellow',
    orange: 'orange',
    teal: 'teal',
  };
  return colorLabels[color];
}

function createInstructionsSheet(): XLSX.WorkSheet {
  const data = [
    ['📋 OKR IMPORT TEMPLATE - INSTRUCTIONS'],
    [''],
    ['=== HOW TO USE THIS TEMPLATE ==='],
    ['1. Fill out each sheet in order: Org Objectives → Departments → Functional Objectives → Key Results → Indicators'],
    ['2. Names must match exactly between sheets (e.g., Department name in "Functional Objectives" must match "Departments" sheet)'],
    ['3. Delete sample data and replace with your own data'],
    ['4. Save as .xlsx format before uploading'],
    [''],
    ['=== COLOR CODES (Identity Colors) ==='],
    ['These colors group related entities under each Org Objective:'],
    ['• green - Primary strategic objective'],
    ['• purple - Innovation/product focused'],
    ['• blue - Revenue/growth focused'],
    ['• yellow - Operational/enabler'],
    ['• orange - People/culture focused'],
    [''],
    ['=== CLASSIFICATION ==='],
    ['• CORE - Strategic priority objectives'],
    ['• Enabler - Supporting objectives that enable CORE objectives'],
    [''],
    ['=== RAG STATUS CALCULATION ==='],
    ['RAG (Red/Amber/Green) is calculated automatically from Current vs Target:'],
    ['• Green: Progress ≥ 70%'],
    ['• Amber: Progress 40-69%'],
    ['• Red: Progress < 40%'],
    ['Formula: (Current / Target) × 100'],
    [''],
    ['=== INDICATOR TIERS ==='],
    ['• Tier 1: Primary metrics - Look at these first for early signals'],
    ['• Tier 2: Secondary metrics - Outcome and supporting metrics'],
    [''],
    ['=== INDICATOR FREQUENCY ==='],
    ['• Daily - Most weight in calculations (2.0x)'],
    ['• Weekly - High weight (1.5x)'],
    ['• Monthly - Standard weight (1.0x)'],
    ['• Quarterly - Lower weight (0.75x)'],
    [''],
    ['=== HIERARCHY ==='],
    ['Business Outcome'],
    ['  └── Org Objective (with color & classification)'],
    ['        └── Department'],
    ['              └── Functional Objective'],
    ['                    └── Key Result (with target/current)'],
    ['                          └── Indicators (Tier 1, Tier 2)'],
    [''],
    ['=== REQUIRED COLUMNS PER SHEET ==='],
    ['Org Objectives: Name, Color, Classification'],
    ['Departments: Name, Org Objective'],
    ['Functional Objectives: Name, Department'],
    ['Key Results: Name, Functional Objective, Target, Current'],
    ['Indicators: Name, Key Result, Tier, Target, Current'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 100 }];
  return ws;
}

function createOrgObjectivesSheet(): XLSX.WorkSheet {
  const headers = ['Name', 'Description', 'Color', 'Classification', 'Business Outcome'];
  const data = [
    headers,
    ...sampleOrgObjectives.map(obj => [
      obj.name,
      obj.description,
      getColorLabel(obj.color),
      obj.classification,
      obj.businessOutcome
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 35 }, // Name
    { wch: 45 }, // Description
    { wch: 12 }, // Color
    { wch: 15 }, // Classification
    { wch: 25 }, // Business Outcome
  ];
  return ws;
}

function createDepartmentsSheet(): XLSX.WorkSheet {
  const headers = ['Name', 'Org Objective'];
  const data = [
    headers,
    ...sampleDepartments.map(dept => [
      dept.name,
      dept.orgObjective
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 30 }, // Name
    { wch: 35 }, // Org Objective
  ];
  return ws;
}

function createFunctionalObjectivesSheet(): XLSX.WorkSheet {
  const headers = ['Name', 'Department', 'Owner'];
  const data = [
    headers,
    ...sampleFunctionalObjectives.map(fo => [
      fo.name,
      fo.department,
      fo.owner
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 35 }, // Name
    { wch: 25 }, // Department
    { wch: 20 }, // Owner
  ];
  return ws;
}

function createKeyResultsSheet(): XLSX.WorkSheet {
  const headers = ['Name', 'Functional Objective', 'Target', 'Current', 'Unit', 'Owner'];
  const data = [
    headers,
    ...sampleKeyResults.map(kr => [
      kr.name,
      kr.functionalObjective,
      kr.target,
      kr.current,
      kr.unit,
      kr.owner
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 35 }, // Name
    { wch: 30 }, // Functional Objective
    { wch: 10 }, // Target
    { wch: 10 }, // Current
    { wch: 15 }, // Unit
    { wch: 20 }, // Owner
  ];
  return ws;
}

function createIndicatorsSheet(): XLSX.WorkSheet {
  const headers = ['Name', 'Key Result', 'Tier', 'Target', 'Current', 'Formula', 'Frequency'];
  const data = [
    headers,
    ...sampleIndicators.map(ind => [
      ind.name,
      ind.keyResult,
      ind.tier,
      ind.target,
      ind.current,
      ind.formula,
      ind.frequency
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 35 }, // Name
    { wch: 30 }, // Key Result
    { wch: 12 }, // Tier
    { wch: 10 }, // Target
    { wch: 10 }, // Current
    { wch: 25 }, // Formula
    { wch: 12 }, // Frequency
  ];
  return ws;
}

export function generateOKRTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Add all sheets in order
  XLSX.utils.book_append_sheet(wb, createInstructionsSheet(), 'Instructions');
  XLSX.utils.book_append_sheet(wb, createOrgObjectivesSheet(), 'Org Objectives');
  XLSX.utils.book_append_sheet(wb, createDepartmentsSheet(), 'Departments');
  XLSX.utils.book_append_sheet(wb, createFunctionalObjectivesSheet(), 'Functional Objectives');
  XLSX.utils.book_append_sheet(wb, createKeyResultsSheet(), 'Key Results');
  XLSX.utils.book_append_sheet(wb, createIndicatorsSheet(), 'Indicators');

  // Generate and download file
  XLSX.writeFile(wb, 'OKR_Import_Template.xlsx');
}
