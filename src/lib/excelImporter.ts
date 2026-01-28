import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

export interface FailedIndicatorMatch {
  indicatorName: string;
  keyResultName: string;
  functionalObjective: string;
  tier: string;
}

export interface ImportResult {
  success: boolean;
  counts: {
    orgObjectives: number;
    departments: number;
    functionalObjectives: number;
    keyResults: number;
    indicators: number;
  };
  errors: string[];
  failedMatches?: FailedIndicatorMatch[];
  matchStats?: {
    exact: number;
    normalized: number;
    fuzzy: number;
    dbLookup: number;
    failed: number;
  };
}

export interface ParsedOrgObjective {
  name: string;
  description?: string;
  color: string;
  classification: string;
  businessOutcome?: string;
}

export interface ParsedDepartment {
  name: string;
  orgObjectiveName: string;
}

export interface ParsedFunctionalObjective {
  name: string;
  departmentName: string;
  owner?: string;
}

export interface ParsedKeyResult {
  name: string;
  functionalObjectiveName: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  owner?: string;
}

export interface ParsedIndicator {
  name: string;
  keyResultName: string;
  tier: string;
  formula?: string;
  frequency?: string;
  currentValue?: number;
  targetValue?: number;
}

export interface ParsedData {
  orgObjectives: ParsedOrgObjective[];
  departments: ParsedDepartment[];
  functionalObjectives: ParsedFunctionalObjective[];
  keyResults: ParsedKeyResult[];
  indicators: ParsedIndicator[];
}

// Helper to find column value case-insensitively
function getColumnValue(row: Record<string, any>, ...possibleNames: string[]): any {
  const rowKeys = Object.keys(row);
  for (const name of possibleNames) {
    const key = rowKeys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
    if (key !== undefined) {
      return row[key];
    }
  }
  return undefined;
}

// Helper to parse number safely
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = parseFloat(String(value));
  return isNaN(num) ? undefined : num;
}

export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const result: ParsedData = {
          orgObjectives: [],
          departments: [],
          functionalObjectives: [],
          keyResults: [],
          indicators: []
        };

        const sheetNames = workbook.SheetNames.map(s => s.toLowerCase().trim());

        // Parse Org Objectives sheet
        const orgSheet = workbook.SheetNames.find(s => s.toLowerCase().includes('org objective'));
        if (orgSheet) {
          const sheet = workbook.Sheets[orgSheet];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
          result.orgObjectives = rows.map(row => ({
            name: getColumnValue(row, 'name', 'objective', 'org objective') || '',
            description: getColumnValue(row, 'description', 'desc'),
            color: (getColumnValue(row, 'color', 'colour') || 'green').toString().toLowerCase().trim(),
            classification: getColumnValue(row, 'classification', 'type') || 'CORE',
            businessOutcome: getColumnValue(row, 'business outcome', 'business_outcome', 'outcome')
          })).filter(o => o.name);
        }

        // Parse Departments sheet
        const deptSheet = workbook.SheetNames.find(s => 
          s.toLowerCase() === 'departments' || s.toLowerCase().includes('department')
        );
        if (deptSheet) {
          const sheet = workbook.Sheets[deptSheet];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
          result.departments = rows.map(row => ({
            name: getColumnValue(row, 'name', 'department', 'dept') || '',
            orgObjectiveName: getColumnValue(row, 'org objective', 'org_objective', 'parent', 'objective') || ''
          })).filter(d => d.name);
        }

        // Parse Functional Objectives sheet
        const foSheet = workbook.SheetNames.find(s => 
          s.toLowerCase().includes('functional') || s.toLowerCase().includes('func')
        );
        if (foSheet) {
          const sheet = workbook.Sheets[foSheet];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
          result.functionalObjectives = rows.map(row => ({
            name: getColumnValue(row, 'name', 'functional objective', 'functional_objective', 'objective') || '',
            departmentName: getColumnValue(row, 'department', 'dept') || '',
            owner: getColumnValue(row, 'owner')
          })).filter(fo => fo.name);
        }

        // Parse Key Results sheet
        const krSheet = workbook.SheetNames.find(s => 
          s.toLowerCase().includes('key result') || s.toLowerCase().includes('key_result') || s.toLowerCase() === 'kr'
        );
        if (krSheet) {
          const sheet = workbook.Sheets[krSheet];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
          result.keyResults = rows.map(row => ({
            name: getColumnValue(row, 'name', 'key result', 'key_result', 'kr') || '',
            functionalObjectiveName: getColumnValue(row, 'functional objective', 'functional_objective', 'func objective', 'objective') || '',
            targetValue: parseNumber(getColumnValue(row, 'target', 'target_value', 'goal')),
            currentValue: parseNumber(getColumnValue(row, 'current', 'current_value', 'actual')),
            unit: getColumnValue(row, 'unit', 'units'),
            owner: getColumnValue(row, 'owner')
          })).filter(kr => kr.name);
        }

        // Parse Indicators sheet
        const indSheet = workbook.SheetNames.find(s => 
          s.toLowerCase().includes('indicator')
        );
        if (indSheet) {
          const sheet = workbook.Sheets[indSheet];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
          result.indicators = rows.map(row => ({
            name: getColumnValue(row, 'name', 'indicator', 'indicator name') || '',
            keyResultName: getColumnValue(row, 'key result', 'key_result', 'kr') || '',
            tier: 'kpi', // All indicators are now KPI
            formula: getColumnValue(row, 'formula', 'calculation'),
            frequency: getColumnValue(row, 'frequency', 'freq') || 'Monthly',
            currentValue: parseNumber(getColumnValue(row, 'current', 'current_value', 'actual')),
            targetValue: parseNumber(getColumnValue(row, 'target', 'target_value', 'goal'))
          })).filter(i => i.name);
        }

        // Validation warnings
        const warnings: string[] = [];
        if (result.orgObjectives.length === 0) warnings.push('No Org Objectives found - check sheet name matches "Org Objectives"');
        if (result.departments.length === 0) warnings.push('No Departments found - check sheet name matches "Departments"');
        if (result.functionalObjectives.length === 0) warnings.push('No Functional Objectives found');
        if (result.keyResults.length === 0) warnings.push('No Key Results found');
        if (result.indicators.length === 0) warnings.push('No Indicators found');

        if (warnings.length > 0) {
          console.warn('Parse warnings:', warnings);
        }

        resolve(result);
      } catch (error) {
        console.error('Excel parse error:', error);
        reject(new Error('Failed to parse Excel file. Please check the format matches the template.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function importToDatabase(parsedData: ParsedData): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    counts: {
      orgObjectives: 0,
      departments: 0,
      functionalObjectives: 0,
      keyResults: 0,
      indicators: 0
    },
    errors: []
  };

  try {
    // Maps for linking entities
    const orgObjectiveMap = new Map<string, string>();
    const departmentMap = new Map<string, string>();
    const functionalObjectiveMap = new Map<string, string>();
    const keyResultMap = new Map<string, string>();

    // 1. Insert Org Objectives
    for (const oo of parsedData.orgObjectives) {
      const { data, error } = await supabase
        .from('org_objectives')
        .insert({
          name: oo.name,
          description: oo.description,
          color: oo.color,
          classification: oo.classification,
          business_outcome: oo.businessOutcome
        })
        .select('id')
        .single();

      if (error) {
        result.errors.push(`Org Objective "${oo.name}": ${error.message}`);
      } else if (data) {
        orgObjectiveMap.set(oo.name.toLowerCase(), data.id);
        result.counts.orgObjectives++;
      }
    }

    // 2. Insert Departments
    for (const dept of parsedData.departments) {
      const orgObjectiveId = orgObjectiveMap.get(dept.orgObjectiveName.toLowerCase());
      if (!orgObjectiveId) {
        result.errors.push(`Department "${dept.name}": Parent org objective "${dept.orgObjectiveName}" not found`);
        continue;
      }

      const { data, error } = await supabase
        .from('departments')
        .insert({
          name: dept.name,
          org_objective_id: orgObjectiveId
        })
        .select('id')
        .single();

      if (error) {
        result.errors.push(`Department "${dept.name}": ${error.message}`);
      } else if (data) {
        departmentMap.set(dept.name.toLowerCase(), data.id);
        result.counts.departments++;
      }
    }

    // 3. Insert Functional Objectives
    for (const fo of parsedData.functionalObjectives) {
      const departmentId = departmentMap.get(fo.departmentName.toLowerCase());
      if (!departmentId) {
        result.errors.push(`Functional Objective "${fo.name}": Parent department "${fo.departmentName}" not found`);
        continue;
      }

      const { data, error } = await supabase
        .from('functional_objectives')
        .insert({
          name: fo.name,
          department_id: departmentId,
          owner: fo.owner
        })
        .select('id')
        .single();

      if (error) {
        result.errors.push(`Functional Objective "${fo.name}": ${error.message}`);
      } else if (data) {
        functionalObjectiveMap.set(fo.name.toLowerCase(), data.id);
        result.counts.functionalObjectives++;
      }
    }

    // 4. Insert Key Results
    for (const kr of parsedData.keyResults) {
      const functionalObjectiveId = functionalObjectiveMap.get(kr.functionalObjectiveName.toLowerCase());
      if (!functionalObjectiveId) {
        result.errors.push(`Key Result "${kr.name}": Parent functional objective "${kr.functionalObjectiveName}" not found`);
        continue;
      }

      const { data, error } = await supabase
        .from('key_results')
        .insert({
          name: kr.name,
          functional_objective_id: functionalObjectiveId,
          target_value: kr.targetValue,
          current_value: kr.currentValue,
          unit: kr.unit,
          owner: kr.owner
        })
        .select('id')
        .single();

      if (error) {
        result.errors.push(`Key Result "${kr.name}": ${error.message}`);
      } else if (data) {
        keyResultMap.set(kr.name.toLowerCase(), data.id);
        result.counts.keyResults++;
      }
    }

    // 5. Insert Indicators
    for (const ind of parsedData.indicators) {
      const keyResultId = keyResultMap.get(ind.keyResultName.toLowerCase());
      if (!keyResultId) {
        result.errors.push(`Indicator "${ind.name}": Parent key result "${ind.keyResultName}" not found`);
        continue;
      }

      const { error } = await supabase
        .from('indicators')
        .insert({
          name: ind.name,
          key_result_id: keyResultId,
          tier: ind.tier,
          formula: ind.formula,
          frequency: ind.frequency,
          current_value: ind.currentValue,
          target_value: ind.targetValue
        });

      if (error) {
        result.errors.push(`Indicator "${ind.name}": ${error.message}`);
      } else {
        result.counts.indicators++;
      }
    }

    result.success = result.errors.length === 0;
  } catch (error: any) {
    result.errors.push(`Import failed: ${error.message}`);
  }

  return result;
}
