import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

export interface V5ImportResult {
  success: boolean;
  counts: {
    departments: number;
    functionalObjectives: number;
    keyResults: number;
    indicators: number;
  };
  errors: string[];
  warnings: string[];
}

interface V5FlatRow {
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

export interface V5ImportPreview {
  departments: number;
  functionalObjectives: number;
  keyResults: number;
  indicators: number;
  formulas: {
    foFormulas: string[];
    krFormulas: string[];
    kpiFormulas: string[];
  };
  rows: V5FlatRow[];
}

function getColumnValue(row: any, possibleNames: string[]): string {
  for (const name of possibleNames) {
    const keys = Object.keys(row);
    const matchingKey = keys.find(k => 
      k.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === name.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    );
    if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
      return String(row[matchingKey]).trim();
    }
  }
  return '';
}

function formatDatabaseError(message: string, entityType: string, entityName: string): string {
  if (message.includes('row-level security') || message.includes('RLS')) {
    return `Access denied for ${entityType} "${entityName}". Please ensure you are logged in.`;
  }
  if (message.includes('duplicate') || message.includes('unique')) {
    return `${entityType} "${entityName}" already exists. Updating existing record.`;
  }
  if (message.includes('foreign key') || message.includes('violates')) {
    return `${entityType} "${entityName}" has a missing parent reference. Check your data hierarchy.`;
  }
  return `${entityType} "${entityName}": ${message}`;
}

/**
 * Parse V5 format Excel file with 9 columns:
 * Department | Owner | Organizational Objective | Functional Objective | FO Formula | Key Result | KR Formula | KPI | KPI Formula
 */
export function parseV5ExcelFile(file: File): Promise<V5FlatRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find the data sheet (skip instructions if present)
        const sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('data') || 
          name.toLowerCase().includes('okr') ||
          name.toLowerCase().includes('sheet1')
        ) || workbook.SheetNames[0];
        
        console.log('[V5 Parser] Using sheet:', sheetName);
        console.log('[V5 Parser] Available sheets:', workbook.SheetNames);
        
        const worksheet = workbook.Sheets[sheetName];
        
        // First, try to detect if there's a title row before headers
        // Parse as array first to check structure
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        console.log('[V5 Parser] Raw rows:', rawData.length);
        console.log('[V5 Parser] First few rows:', rawData.slice(0, 3));
        
        // Find the header row - look for a row containing "Department" and "KPI"
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
          const rowValues = (rawData[i] || []).map(v => String(v || '').toLowerCase());
          if (rowValues.includes('department') && (rowValues.includes('kpi') || rowValues.includes('key result'))) {
            headerRowIndex = i;
            console.log('[V5 Parser] Found header row at index:', i);
            break;
          }
        }
        
        // Parse with correct header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
        
        console.log('[V5 Parser] Total data rows parsed:', jsonData.length);
        if (jsonData.length > 0) {
          console.log('[V5 Parser] Column headers found:', Object.keys(jsonData[0] as any));
          console.log('[V5 Parser] First data row:', jsonData[0]);
        }
        
        // Map each row
        const mappedRows: V5FlatRow[] = [];
        
        for (const row of jsonData as any[]) {
          const keys = Object.keys(row);
          
          // Find columns by position and content
          const department = getColumnValue(row, ['Department', 'Dept']);
          const owner = getColumnValue(row, ['Owner']);
          const orgObjective = getColumnValue(row, ['Organizational Objective', 'Org Objective', 'OrgObjective', 'Org_Objective']);
          const functionalObjective = getColumnValue(row, ['Functional Objective', 'FO', 'FunctionalObjective', 'Functional_Objective']);
          const keyResult = getColumnValue(row, ['Key Result', 'KR', 'KeyResult', 'Key_Result']);
          const kpi = getColumnValue(row, ['KPI', 'Indicator', 'Metric']);
          
          // Get formulas - check for specific named columns first
          let foFormula = getColumnValue(row, ['FO Formula', 'FOFormula', 'Functional Objective Formula', 'FO_Formula']);
          let krFormula = getColumnValue(row, ['KR Formula', 'KRFormula', 'Key Result Formula', 'KR_Formula', 'Formula (Apply BODMAS rule)', 'Formula Apply BODMAS rule']);
          let kpiFormula = getColumnValue(row, ['KPI Formula', 'KPIFormula', 'Indicator Formula', 'KPI_Formula']);
          
          // Fallback: Handle generic "Formula" columns by position
          // Excel auto-renames duplicate headers: "Formula", "Formula_1", "Formula_2"
          if (!foFormula || !krFormula || !kpiFormula) {
            const formulaKeys = keys.filter(k => k.toLowerCase().includes('formula'));
            // Sort to ensure correct order (Formula, Formula_1, Formula_2 OR by position)
            formulaKeys.sort((a, b) => {
              // Get column index from the original keys array for proper ordering
              return keys.indexOf(a) - keys.indexOf(b);
            });
            
            console.log('[V5 Parser] Formula columns found:', formulaKeys);
            
            if (formulaKeys.length >= 3) {
              if (!foFormula) foFormula = row[formulaKeys[0]] ? String(row[formulaKeys[0]]).trim() : '';
              if (!krFormula) krFormula = row[formulaKeys[1]] ? String(row[formulaKeys[1]]).trim() : '';
              if (!kpiFormula) kpiFormula = row[formulaKeys[2]] ? String(row[formulaKeys[2]]).trim() : '';
            } else if (formulaKeys.length === 2) {
              // Assume first is FO, second is KR (KPI formula might be empty)
              if (!foFormula) foFormula = row[formulaKeys[0]] ? String(row[formulaKeys[0]]).trim() : '';
              if (!krFormula) krFormula = row[formulaKeys[1]] ? String(row[formulaKeys[1]]).trim() : '';
            } else if (formulaKeys.length === 1) {
              if (!kpiFormula) kpiFormula = row[formulaKeys[0]] ? String(row[formulaKeys[0]]).trim() : '';
            }
          }
          
          console.log('[V5 Parser] Mapped row:', { department, owner, orgObjective, functionalObjective, foFormula, keyResult, krFormula, kpi, kpiFormula });
          
          mappedRows.push({
            department,
            owner,
            orgObjective,
            functionalObjective,
            foFormula,
            keyResult,
            krFormula,
            kpi,
            kpiFormula,
          });
        }
        
        console.log('[V5 Parser] Total mapped rows before filter:', mappedRows.length);
        
        // Filter out empty rows - must have at least one meaningful field
        const validRows = mappedRows.filter(row => 
          row.department || row.kpi || row.keyResult || row.functionalObjective
        );
        
        console.log('[V5 Parser] Valid rows after filter:', validRows.length);
        
        // Inherit values from previous rows for empty cells
        let lastDept = '';
        let lastOwner = '';
        let lastOrgObjective = '';
        let lastFO = '';
        let lastFOFormula = '';
        let lastKR = '';
        let lastKRFormula = '';
        
        for (const row of validRows) {
          if (!row.department && lastDept) row.department = lastDept;
          if (!row.owner && lastOwner) row.owner = lastOwner;
          if (!row.orgObjective && lastOrgObjective) row.orgObjective = lastOrgObjective;
          if (!row.functionalObjective && lastFO) row.functionalObjective = lastFO;
          if (!row.foFormula && lastFOFormula) row.foFormula = lastFOFormula;
          if (!row.keyResult && lastKR) row.keyResult = lastKR;
          if (!row.krFormula && lastKRFormula) row.krFormula = lastKRFormula;
          
          lastDept = row.department;
          lastOwner = row.owner;
          lastOrgObjective = row.orgObjective;
          lastFO = row.functionalObjective;
          lastFOFormula = row.foFormula;
          lastKR = row.keyResult;
          lastKRFormula = row.krFormula;
        }
        
        resolve(validRows);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Get import preview showing counts and unique formulas
 */
export function getV5ImportPreview(rows: V5FlatRow[]): V5ImportPreview {
  const departments = new Set(rows.map(r => r.department).filter(Boolean));
  const functionalObjectives = new Set(rows.map(r => `${r.department}|${r.functionalObjective}`).filter(r => r.includes('|') && r.split('|')[1]));
  const keyResults = new Set(rows.map(r => `${r.department}|${r.functionalObjective}|${r.keyResult}`).filter(r => r.split('|').length === 3 && r.split('|')[2]));
  const indicators = rows.filter(r => r.kpi).length;
  
  // Collect unique formulas for display
  const foFormulas = [...new Set(rows.map(r => r.foFormula).filter(Boolean))];
  const krFormulas = [...new Set(rows.map(r => r.krFormula).filter(Boolean))];
  const kpiFormulas = [...new Set(rows.map(r => r.kpiFormula).filter(Boolean))];
  
  return {
    departments: departments.size,
    functionalObjectives: functionalObjectives.size,
    keyResults: keyResults.size,
    indicators,
    formulas: { foFormulas, krFormulas, kpiFormulas },
    rows,
  };
}

/**
 * Import V5 format data to database
 */
export async function importV5ExcelToDatabase(rows: V5FlatRow[]): Promise<V5ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts = {
    departments: 0,
    functionalObjectives: 0,
    keyResults: 0,
    indicators: 0,
  };

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      counts,
      errors: ['You must be logged in to import data. Please sign in and try again.'],
      warnings: [],
    };
  }

  // Maps to track created entities
  const departmentMap = new Map<string, string>();
  const foMap = new Map<string, string>();
  const krMap = new Map<string, string>();

  try {
    // First, get or create a default Org Objective for departments without one
    let defaultOrgId: string | null = null;
    
    const uniqueOrgObjectives = [...new Set(rows.map(r => r.orgObjective).filter(Boolean))];
    const orgObjectiveMap = new Map<string, string>();
    
    for (const orgName of uniqueOrgObjectives) {
      const { data: existingOrg } = await supabase
        .from('org_objectives')
        .select('id')
        .eq('name', orgName)
        .maybeSingle();
        
      if (existingOrg) {
        orgObjectiveMap.set(orgName, existingOrg.id);
      } else {
        const { data: newOrg, error } = await supabase
          .from('org_objectives')
          .insert({
            name: orgName,
            color: 'blue',
            classification: 'CORE',
          })
          .select('id')
          .single();
          
        if (!error && newOrg) {
          orgObjectiveMap.set(orgName, newOrg.id);
        }
      }
    }
    
    // If no org objectives found, use first existing or create default
    if (uniqueOrgObjectives.length === 0) {
      const { data: firstOrg } = await supabase
        .from('org_objectives')
        .select('id')
        .limit(1)
        .maybeSingle();
        
      if (firstOrg) {
        defaultOrgId = firstOrg.id;
      } else {
        const { data: newOrg } = await supabase
          .from('org_objectives')
          .insert({
            name: 'Default Objective',
            color: 'blue',
            classification: 'CORE',
          })
          .select('id')
          .single();
        defaultOrgId = newOrg?.id || null;
      }
    }

    // Process each row
    for (const row of rows) {
      if (!row.department) continue;
      
      // Get org objective ID for this row
      const orgId = row.orgObjective ? orgObjectiveMap.get(row.orgObjective) : defaultOrgId;
      
      // 1. Create/Get Department
      const deptKey = `${orgId}|${row.department}`;
      if (!departmentMap.has(deptKey)) {
        const { data: existingDept } = await supabase
          .from('departments')
          .select('id')
          .eq('name', row.department)
          .eq('org_objective_id', orgId)
          .maybeSingle();
          
        if (existingDept) {
          departmentMap.set(deptKey, existingDept.id);
        } else {
          const { data, error } = await supabase
            .from('departments')
            .insert({
              name: row.department,
              org_objective_id: orgId,
              owner: row.owner || null,
            })
            .select('id')
            .single();
            
          if (error) {
            errors.push(formatDatabaseError(error.message, 'Department', row.department));
            continue;
          }
          departmentMap.set(deptKey, data.id);
          counts.departments++;
        }
      }
      
      // 2. Create/Get Functional Objective
      if (!row.functionalObjective) continue;
      const foKey = `${deptKey}|${row.functionalObjective}`;
      if (!foMap.has(foKey)) {
        const { data: existingFO } = await supabase
          .from('functional_objectives')
          .select('id')
          .eq('name', row.functionalObjective)
          .eq('department_id', departmentMap.get(deptKey))
          .maybeSingle();
          
        if (existingFO) {
          // Update formula if provided
          if (row.foFormula) {
            await supabase
              .from('functional_objectives')
              .update({ formula: row.foFormula })
              .eq('id', existingFO.id);
          }
          foMap.set(foKey, existingFO.id);
        } else {
          const { data, error } = await supabase
            .from('functional_objectives')
            .insert({
              name: row.functionalObjective,
              department_id: departmentMap.get(deptKey),
              owner: row.owner || null,
              formula: row.foFormula || null,
            })
            .select('id')
            .single();
            
          if (error) {
            errors.push(formatDatabaseError(error.message, 'Functional Objective', row.functionalObjective));
            continue;
          }
          foMap.set(foKey, data.id);
          counts.functionalObjectives++;
        }
      }
      
      // 3. Create/Get Key Result
      if (!row.keyResult) continue;
      const krKey = `${foKey}|${row.keyResult}`;
      if (!krMap.has(krKey)) {
        const { data: existingKR } = await supabase
          .from('key_results')
          .select('id')
          .eq('name', row.keyResult)
          .eq('functional_objective_id', foMap.get(foKey))
          .maybeSingle();
          
        if (existingKR) {
          // Update formula if provided
          if (row.krFormula) {
            await supabase
              .from('key_results')
              .update({ formula: row.krFormula })
              .eq('id', existingKR.id);
          }
          krMap.set(krKey, existingKR.id);
        } else {
          const { data, error } = await supabase
            .from('key_results')
            .insert({
              name: row.keyResult,
              functional_objective_id: foMap.get(foKey),
              formula: row.krFormula || null,
            })
            .select('id')
            .single();
            
          if (error) {
            errors.push(formatDatabaseError(error.message, 'Key Result', row.keyResult));
            continue;
          }
          krMap.set(krKey, data.id);
          counts.keyResults++;
        }
      }
      
      // 4. Create/Get Indicator (KPI)
      if (!row.kpi) continue;
      const { data: existingInd } = await supabase
        .from('indicators')
        .select('id')
        .eq('name', row.kpi)
        .eq('key_result_id', krMap.get(krKey))
        .maybeSingle();
        
      if (!existingInd) {
        const { error } = await supabase
          .from('indicators')
          .insert({
            name: row.kpi,
            key_result_id: krMap.get(krKey),
            tier: 'kpi',
            formula: row.kpiFormula || null,
            frequency: 'Monthly',
          });
          
        if (error) {
          errors.push(formatDatabaseError(error.message, 'KPI', row.kpi));
          continue;
        }
        counts.indicators++;
      } else if (row.kpiFormula) {
        // Update formula if provided
        await supabase
          .from('indicators')
          .update({ formula: row.kpiFormula })
          .eq('id', existingInd.id);
      }
    }

    return {
      success: errors.length === 0,
      counts,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      counts,
      errors: [...errors, `Import failed: ${error}`],
      warnings,
    };
  }
}

/**
 * Generate V5 format Excel template
 */
export function generateV5Template(): void {
  const wb = XLSX.utils.book_new();
  
  // Create OKR Data sheet with UNIQUE headers (no duplicates)
  const headers = [
    'Department',
    'Owner', 
    'Organizational Objective',
    'Functional Objective',
    'FO Formula',
    'Key Result',
    'KR Formula',
    'KPI',
    'KPI Formula',
  ];
  
  // Sample data
  const sampleData = [
    ['Customer Success', 'John Smith', 'Customer Retention', 'Reduce Churn', 'AVG', 'Decrease monthly churn rate', 'AVG', 'Monthly Churn Rate', 'current/target * 100'],
    ['', '', '', '', '', '', '', 'Customer Health Score', 'current/target * 100'],
    ['', '', '', '', '', 'Increase NPS', 'AVG', 'NPS Score', 'current/target * 100'],
    ['', '', '', '', '', '', '', 'Survey Response Rate', 'current/target * 100'],
    ['Product', 'Jane Doe', 'Product Excellence', 'Improve Feature Adoption', 'WEIGHTED_AVG', 'Increase DAU/MAU ratio', 'AVG', 'DAU/MAU Ratio', 'current/target * 100'],
    ['', '', '', '', '', '', '', 'Feature Activation Rate', 'current/target * 100'],
  ];
  
  const wsData = [headers, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Style headers
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4F46E5' } },
    alignment: { horizontal: 'center' },
  };
  
  for (let i = 0; i < headers.length; i++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
    if (cell) cell.s = headerStyle;
  }
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Department
    { wch: 15 }, // Owner
    { wch: 25 }, // Org Objective
    { wch: 25 }, // FO
    { wch: 20 }, // FO Formula
    { wch: 30 }, // KR
    { wch: 20 }, // KR Formula
    { wch: 25 }, // KPI
    { wch: 25 }, // KPI Formula
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'OKR Data');
  
  // Create Instructions sheet
  const instructionsData = [
    ['V5 OKR Import Template - Instructions'],
    [''],
    ['This template supports formulas at 3 levels: FO, KR, and KPI'],
    [''],
    ['Column Descriptions:'],
    ['Department - The team or department name'],
    ['Owner - Person responsible for the department/FO'],
    ['Organizational Objective - Top-level strategic objective'],
    ['Functional Objective - Team-level objective'],
    ['Formula (FO) - How to calculate FO progress from KRs (AVG, SUM, WEIGHTED_AVG, MIN)'],
    ['Key Result - Measurable outcome'],
    ['Formula (KR) - How to calculate KR progress from KPIs (AVG, SUM, WEIGHTED_AVG, MIN)'],
    ['KPI - Individual metric/indicator'],
    ['Formula (KPI) - How to calculate KPI progress (current/target * 100)'],
    [''],
    ['Supported Formulas:'],
    ['AVG - Simple average of child values'],
    ['SUM - Sum of child values'],
    ['WEIGHTED_AVG - Weighted average (weights from child targets)'],
    ['MIN - Takes the minimum (worst-case scenario)'],
    [''],
    ['Notes:'],
    ['- Leave cells blank to inherit from the row above'],
    ['- Each row must have at least a KPI name'],
    ['- Values can be entered later via the Data Entry UI'],
  ];
  
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
  
  // Download
  XLSX.writeFile(wb, 'OKR_V5_Template.xlsx');
}
