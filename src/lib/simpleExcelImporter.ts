import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

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
}

interface FlatRow {
  color: string;
  classification: string;
  orgObjective: string;
  department: string;
  functionalObjective: string;
  foOwner: string;
  keyResult: string;
  krTarget: number;
  krCurrent: number;
  krUnit: string;
  krOwner: string;
  indicator: string;
  indTier: string;
  indTarget: number;
  indCurrent: number;
  indFrequency: string;
}

const VALID_COLORS = ['green', 'purple', 'blue', 'yellow', 'orange'] as const;

function getColumnValue(row: any, possibleNames: string[]): string {
  for (const name of possibleNames) {
    const keys = Object.keys(row);
    const matchingKey = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
    if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
      return String(row[matchingKey]).trim();
    }
  }
  return '';
}

function normalizeColor(color: string): string {
  const normalized = (color || '').toLowerCase().trim();
  return VALID_COLORS.includes(normalized as any) ? normalized : 'green';
}

function normalizeTier(tier: string): string {
  // All indicators are now just KPI - no tiers
  return 'kpi';
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatDatabaseError(message: string, entityType: string, entityName: string): string {
  if (message.includes('row-level security') || message.includes('RLS')) {
    return `Access denied for ${entityType} "${entityName}". Please ensure you are logged in.`;
  }
  if (message.includes('duplicate') || message.includes('unique')) {
    return `${entityType} "${entityName}" already exists. Skipping duplicate.`;
  }
  if (message.includes('foreign key') || message.includes('violates')) {
    return `${entityType} "${entityName}" has a missing parent reference. Check your data hierarchy.`;
  }
  return `${entityType} "${entityName}": ${message}`;
}

export function parseSimpleExcelFile(file: File): Promise<FlatRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find the OKR Data sheet
        const sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('okr') || name.toLowerCase().includes('data')
        ) || workbook.SheetNames[1] || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const mappedRows: FlatRow[] = jsonData.map((row: any) => ({
          color: getColumnValue(row, ['Color', 'color']),
          classification: getColumnValue(row, ['Classification', 'classification']),
          orgObjective: getColumnValue(row, ['Org Objective', 'OrgObjective', 'Organizational Objective', 'Business Outcome']),
          department: getColumnValue(row, ['Department', 'Dept', 'Team']),
          functionalObjective: getColumnValue(row, ['Functional Objective', 'FunctionalObjective', 'FO', 'Team Objective', 'FO Name']),
          foOwner: getColumnValue(row, ['FO Owner', 'FOOwner', 'Functional Objective Owner', 'Owner']),
          keyResult: getColumnValue(row, ['Key Result', 'KeyResult', 'KR', 'Key Results', 'KR Name']),
          krTarget: parseNumber(getColumnValue(row, ['KR Target', 'KRTarget', 'Key Result Target', 'Target'])),
          krCurrent: parseNumber(getColumnValue(row, ['KR Current', 'KRCurrent', 'Key Result Current', 'Current'])),
          krUnit: getColumnValue(row, ['KR Unit', 'KRUnit', 'Unit']),
          krOwner: getColumnValue(row, ['KR Owner', 'KROwner', 'Key Result Owner']),
          indicator: getColumnValue(row, ['Indicator', 'Ind', 'Metric', 'KPI', 'KPI Name', 'KPI/Metric', 'Metric Name', 'KPI/Metric Name']),
          indTier: getColumnValue(row, ['Ind Tier', 'IndTier', 'Tier', 'Indicator Tier', 'KPI Tier']),
          indTarget: parseNumber(getColumnValue(row, ['Ind Target', 'IndTarget', 'Indicator Target', 'KPI Target'])),
          indCurrent: parseNumber(getColumnValue(row, ['Ind Current', 'IndCurrent', 'Indicator Current', 'KPI Current'])),
          indFrequency: getColumnValue(row, ['Ind Frequency', 'IndFrequency', 'Frequency', 'Reporting Frequency']),
        }));

        // Log rows that will be skipped for debugging
        const skippedRows = mappedRows.filter(row => !row.orgObjective || !row.indicator);
        if (skippedRows.length > 0) {
          console.warn(`Import: Skipping ${skippedRows.length} rows with missing orgObjective or indicator:`, 
            skippedRows.map(r => ({ dept: r.department, kr: r.keyResult, indicator: r.indicator }))
          );
        }

        const rows: FlatRow[] = mappedRows.filter(row => row.orgObjective && row.indicator);
        
        resolve(rows);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function importSimpleExcelToDatabase(rows: FlatRow[]): Promise<ImportResult> {
  const errors: string[] = [];
  const counts = {
    orgObjectives: 0,
    departments: 0,
    functionalObjectives: 0,
    keyResults: 0,
    indicators: 0,
  };

  // Check if user is authenticated first
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      counts,
      errors: ['You must be logged in to import data. Please sign in and try again.'],
    };
  }

  // Maps to track created entities and their IDs
  const orgObjectiveMap = new Map<string, string>();
  const departmentMap = new Map<string, string>();
  const functionalObjectiveMap = new Map<string, string>();
  const keyResultMap = new Map<string, string>();

  try {
    // Group rows by hierarchy
    for (const row of rows) {
      // 1. Create/Get Org Objective
      const orgKey = row.orgObjective;
      if (!orgObjectiveMap.has(orgKey)) {
        // Check if org objective already exists
        const { data: existingOrg } = await supabase
          .from('org_objectives')
          .select('id')
          .eq('name', row.orgObjective)
          .maybeSingle();

        if (existingOrg) {
          orgObjectiveMap.set(orgKey, existingOrg.id);
        } else {
          const { data, error } = await supabase
            .from('org_objectives')
            .insert({
              name: row.orgObjective,
              color: normalizeColor(row.color),
              classification: row.classification || 'CORE',
              business_outcome: '3X Revenue',
            })
            .select('id')
            .single();

          if (error) {
            const friendlyError = formatDatabaseError(error.message, 'Org Objective', row.orgObjective);
            errors.push(friendlyError);
            continue;
          }
          orgObjectiveMap.set(orgKey, data.id);
          counts.orgObjectives++;
        }
      }

      // 2. Create/Get Department
      const deptKey = `${row.orgObjective}|${row.department}`;
      if (!departmentMap.has(deptKey) && row.department) {
        // Check if department already exists under this org objective
        const { data: existingDept } = await supabase
          .from('departments')
          .select('id')
          .eq('name', row.department)
          .eq('org_objective_id', orgObjectiveMap.get(orgKey))
          .maybeSingle();

        if (existingDept) {
          departmentMap.set(deptKey, existingDept.id);
        } else {
          const { data, error } = await supabase
            .from('departments')
            .insert({
              name: row.department,
              org_objective_id: orgObjectiveMap.get(orgKey),
            })
            .select('id')
            .single();

          if (error) {
            const friendlyError = formatDatabaseError(error.message, 'Department', row.department);
            errors.push(friendlyError);
            continue;
          }
          departmentMap.set(deptKey, data.id);
          counts.departments++;
        }
      }

      // 3. Create/Get Functional Objective
      const foKey = `${deptKey}|${row.functionalObjective}`;
      if (!functionalObjectiveMap.has(foKey) && row.functionalObjective) {
        // Check if functional objective already exists under this department
        const { data: existingFO } = await supabase
          .from('functional_objectives')
          .select('id')
          .eq('name', row.functionalObjective)
          .eq('department_id', departmentMap.get(deptKey))
          .maybeSingle();

        if (existingFO) {
          functionalObjectiveMap.set(foKey, existingFO.id);
        } else {
          const { data, error } = await supabase
            .from('functional_objectives')
            .insert({
              name: row.functionalObjective,
              department_id: departmentMap.get(deptKey),
              owner: row.foOwner || null,
            })
            .select('id')
            .single();

          if (error) {
            const friendlyError = formatDatabaseError(error.message, 'Functional Objective', row.functionalObjective);
            errors.push(friendlyError);
            continue;
          }
          functionalObjectiveMap.set(foKey, data.id);
          counts.functionalObjectives++;
        }
      }

      // 4. Create/Get Key Result
      const krKey = `${foKey}|${row.keyResult}`;
      if (!keyResultMap.has(krKey) && row.keyResult) {
        // Check if key result already exists under this functional objective
        const { data: existingKR } = await supabase
          .from('key_results')
          .select('id')
          .eq('name', row.keyResult)
          .eq('functional_objective_id', functionalObjectiveMap.get(foKey))
          .maybeSingle();

        if (existingKR) {
          keyResultMap.set(krKey, existingKR.id);
        } else {
          const { data, error } = await supabase
            .from('key_results')
            .insert({
              name: row.keyResult,
              functional_objective_id: functionalObjectiveMap.get(foKey),
              target_value: row.krTarget,
              current_value: row.krCurrent,
              unit: row.krUnit || '%',
              owner: row.krOwner || null,
            })
            .select('id')
            .single();

          if (error) {
            const friendlyError = formatDatabaseError(error.message, 'Key Result', row.keyResult);
            errors.push(friendlyError);
            continue;
          }
          keyResultMap.set(krKey, data.id);
          counts.keyResults++;
        }
      }

      // 5. Create/Get Indicator
      if (row.indicator) {
        // Check if indicator already exists under this key result
        const { data: existingInd } = await supabase
          .from('indicators')
          .select('id')
          .eq('name', row.indicator)
          .eq('key_result_id', keyResultMap.get(krKey))
          .maybeSingle();

        if (!existingInd) {
          const { error } = await supabase
            .from('indicators')
            .insert({
              name: row.indicator,
              key_result_id: keyResultMap.get(krKey),
              tier: normalizeTier(row.indTier),
              target_value: row.indTarget,
              current_value: row.indCurrent,
              frequency: row.indFrequency || 'Monthly',
            });

          if (error) {
            const friendlyError = formatDatabaseError(error.message, 'Indicator', row.indicator);
            errors.push(friendlyError);
            continue;
          }
          counts.indicators++;
        }
      }
    }

    return {
      success: errors.length === 0,
      counts,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      counts,
      errors: [...errors, `Import failed: ${error}`],
    };
  }
}

export function getImportPreview(rows: FlatRow[]) {
  const orgObjectives = new Set(rows.map(r => r.orgObjective).filter(Boolean));
  const departments = new Set(rows.map(r => `${r.orgObjective}|${r.department}`).filter(r => r.includes('|')));
  const functionalObjectives = new Set(rows.map(r => `${r.orgObjective}|${r.department}|${r.functionalObjective}`).filter(r => r.split('|').length === 3));
  const keyResults = new Set(rows.map(r => `${r.orgObjective}|${r.department}|${r.functionalObjective}|${r.keyResult}`).filter(r => r.split('|').length === 4));
  const indicators = rows.filter(r => r.indicator).length;

  return {
    orgObjectives: orgObjectives.size,
    departments: departments.size,
    functionalObjectives: functionalObjectives.size,
    keyResults: keyResults.size,
    indicators,
  };
}
