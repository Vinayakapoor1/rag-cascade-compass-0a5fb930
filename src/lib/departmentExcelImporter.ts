import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

export interface DepartmentImportConfig {
  departmentName: string;
  departmentColor: string;
  orgObjectiveId?: string;
  orgObjectiveName?: string;
  businessOutcome?: string;
}

export interface ImportResult {
  success: boolean;
  counts: {
    functionalObjectives: number;
    keyResults: number;
    indicators: number;
  };
  errors: string[];
}

interface ParsedRow {
  businessOutcome: string;
  orgObjective: string;
  department: string;
  functionalObjective: string;
  keyResult: string;
  indicatorName: string;
  indicatorTier: string;
  formula: string;
  frequency: string;
  unit: string;
}

// Column name variations to support different Excel formats
// Column name variations - based on actual Excel headers
const COLUMN_MAPPINGS = {
  businessOutcome: ['business outcome', 'business_outcome', 'business outcomes'],
  orgObjective: ['organizational objective', 'org objective', 'org_objective', 'organization objective'],
  department: ['department', 'dept', 'departments'],
  // Support both full name and abbreviation "Func. Objective"
  functionalObjective: ['functional objective', 'functional_objective', 'functional objectives', 'func. objective', 'func objective'],
  keyResult: ['key result', 'kr', 'key_result', 'keyresult', 'key results'],
  // Support single "Indicator" column as well as Tier-specific columns
  indicatorName: ['indicator', 'leading indicator', 'lagging indicator', 'tier 1', 'tier 2', 'tier1', 'tier2', 'leading indicators', 'lagging indicators'],
  indicatorTier: ['tier', 'indicator tier', 'type', 'indicator type'],
  formula: ['formula', 'calculation', 'metric formula'],
  frequency: ['frequency', 'freq', 'cadence'],
  unit: ['unit', 'units', 'measure'],
};

// Fallback: Parse by column position if headers don't match
// Based on user's Excel structure: B=Business Outcome, C=Org Objective, D=Department, E=Functional Objective, F=Key Result, G/H=Indicators
const COLUMN_INDICES = {
  businessOutcome: 1,     // Column B
  orgObjective: 2,        // Column C  
  department: 3,          // Column D
  functionalObjective: 4, // Column E
  keyResult: 5,           // Column F
  tier1Indicator: 6,      // Column G (Tier 1 / Leading)
  tier2Indicator: 7,      // Column H (Tier 2 / Lagging)
  formula: 8,             // Column I
  frequency: 9,           // Column J
};

// Find column value - EXACT match first, then partial match
function findColumnValue(row: Record<string, any>, variations: string[], fieldName?: string): string {
  const keys = Object.keys(row);
  
  // First pass: exact matches only
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().trim();
    for (const variation of variations) {
      if (normalizedKey === variation) {
        return String(row[key] || '').trim();
      }
    }
  }
  
  // Second pass: partial matches (starts with)
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().trim();
    for (const variation of variations) {
      if (normalizedKey.startsWith(variation)) {
        return String(row[key] || '').trim();
      }
    }
  }
  return '';
}

function parseExcelFile(file: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(file, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  
  // Get data as array of arrays first to support position-based parsing
  const rawArrayData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
  
  const rows: ParsedRow[] = [];
  
  // Track previous values for merged cells / carry-forward
  let lastBusinessOutcome = '';
  let lastOrgObjective = '';
  let lastDepartment = '';
  let lastFunctionalObjective = '';
  let lastKeyResult = '';
  
  // Detect if we should use position-based parsing
  // Check if first row (header) has expected column names
  const headerRow = rawArrayData[0] || [];
  const hasHeaderMatch = headerRow.some((h: any) => {
    const lower = String(h || '').toLowerCase();
    return lower.includes('functional objective') || lower.includes('key result') || lower.includes('department');
  });
  
  // If no header match, try position-based parsing
  const usePositionParsing = !hasHeaderMatch && rawArrayData.length > 1;
  
  if (usePositionParsing) {
    console.log('Using position-based parsing for Excel file');
    // Skip header row, parse by column position
    for (let i = 1; i < rawArrayData.length; i++) {
      const row = rawArrayData[i] as any[];
      if (!row || row.length === 0) continue;
      
      // Get values by position (0-indexed)
      const businessOutcome = String(row[COLUMN_INDICES.businessOutcome] || '').trim() || lastBusinessOutcome;
      const orgObjective = String(row[COLUMN_INDICES.orgObjective] || '').trim() || lastOrgObjective;
      const department = String(row[COLUMN_INDICES.department] || '').trim() || lastDepartment;
      const functionalObjective = String(row[COLUMN_INDICES.functionalObjective] || '').trim() || lastFunctionalObjective;
      const keyResult = String(row[COLUMN_INDICES.keyResult] || '').trim() || lastKeyResult;
      
      // Update carry-forward values
      if (row[COLUMN_INDICES.businessOutcome]) lastBusinessOutcome = businessOutcome;
      if (row[COLUMN_INDICES.orgObjective]) lastOrgObjective = orgObjective;
      if (row[COLUMN_INDICES.department]) lastDepartment = department;
      if (row[COLUMN_INDICES.functionalObjective]) lastFunctionalObjective = functionalObjective;
      if (row[COLUMN_INDICES.keyResult]) lastKeyResult = keyResult;
      
      // Check both Tier 1 and Tier 2 columns
      const tier1Value = String(row[COLUMN_INDICES.tier1Indicator] || '').trim();
      const tier2Value = String(row[COLUMN_INDICES.tier2Indicator] || '').trim();
      const formula = String(row[COLUMN_INDICES.formula] || '').trim();
      const frequency = String(row[COLUMN_INDICES.frequency] || '').trim() || 'Monthly';
      
      // Create row for Tier 1 indicator if present
      if (tier1Value) {
        rows.push({
          businessOutcome,
          orgObjective,
          department,
          functionalObjective,
          keyResult,
          indicatorName: tier1Value,
          indicatorTier: 'Tier 1',
          formula,
          frequency,
          unit: '%',
        });
      }
      
      // Create row for Tier 2 indicator if present
      if (tier2Value) {
        rows.push({
          businessOutcome,
          orgObjective,
          department,
          functionalObjective,
          keyResult,
          indicatorName: tier2Value,
          indicatorTier: 'Tier 2',
          formula,
          frequency,
          unit: '%',
        });
      }
    }
  } else {
    // Use header-based parsing
    console.log('Using header-based parsing for Excel file');
    console.log('Headers found:', Object.keys(rawData[0] || {}));
    
    for (const row of rawData) {
      // Check for indicators - support both single "Indicator" column and Tier-specific columns
      const singleIndicator = findColumnValue(row, ['indicator']);
      const tier1Value = findColumnValueExact(row, ['tier 1', 'tier1', 'leading indicator', 'leading indicators']);
      const tier2Value = findColumnValueExact(row, ['tier 2', 'tier2', 'lagging indicator', 'lagging indicators']);
      
      // Get indicator name from whichever column exists
      const indicatorName = singleIndicator || tier1Value || tier2Value;
      
      // Skip rows without any indicator
      if (!indicatorName) continue;
      
      // Determine tier - default to Tier 1 for single indicator column
      let indicatorTier = 'Tier 1';
      if (tier2Value && !tier1Value && !singleIndicator) {
        indicatorTier = 'Tier 2';
      }
      // Check if there's a separate tier column
      const tierColumnValue = findColumnValue(row, COLUMN_MAPPINGS.indicatorTier);
      if (tierColumnValue) {
        indicatorTier = normalizeTier(tierColumnValue);
      }
      
      // Extract hierarchy values with carry-forward for merged cells
      const businessOutcome = findColumnValue(row, COLUMN_MAPPINGS.businessOutcome) || lastBusinessOutcome;
      const orgObjective = findColumnValue(row, COLUMN_MAPPINGS.orgObjective) || lastOrgObjective;
      const department = findColumnValue(row, COLUMN_MAPPINGS.department) || lastDepartment;
      const functionalObjective = findColumnValue(row, COLUMN_MAPPINGS.functionalObjective) || lastFunctionalObjective;
      const keyResult = findColumnValue(row, COLUMN_MAPPINGS.keyResult) || lastKeyResult;
      
      // Debug: Log first row
      if (rows.length === 0) {
        console.log('First row parsed:', { businessOutcome, orgObjective, department, functionalObjective, keyResult, indicatorName });
      }
      
      // Update carry-forward values only if current row has the value
      if (findColumnValue(row, COLUMN_MAPPINGS.businessOutcome)) lastBusinessOutcome = businessOutcome;
      if (findColumnValue(row, COLUMN_MAPPINGS.orgObjective)) lastOrgObjective = orgObjective;
      if (findColumnValue(row, COLUMN_MAPPINGS.department)) lastDepartment = department;
      if (findColumnValue(row, COLUMN_MAPPINGS.functionalObjective)) lastFunctionalObjective = functionalObjective;
      if (findColumnValue(row, COLUMN_MAPPINGS.keyResult)) lastKeyResult = keyResult;
      
      const formula = findColumnValue(row, COLUMN_MAPPINGS.formula);
      const frequency = findColumnValue(row, COLUMN_MAPPINGS.frequency) || 'Monthly';
      const unit = findColumnValue(row, COLUMN_MAPPINGS.unit) || '%';
      
      rows.push({
        businessOutcome,
        orgObjective,
        department,
        functionalObjective,
        keyResult,
        indicatorName,
        indicatorTier,
        formula,
        frequency,
        unit,
      });
    }
  }
  
  console.log('Total rows parsed:', rows.length);
  console.log('Unique FOs:', [...new Set(rows.map(r => r.functionalObjective))]);
  
  return rows;
}

function findColumnValueExact(row: Record<string, any>, variations: string[]): string {
  for (const key of Object.keys(row)) {
    const normalizedKey = key.toLowerCase().trim();
    for (const variation of variations) {
      if (normalizedKey === variation) {
        return String(row[key] || '').trim();
      }
    }
  }
  return '';
}

function normalizeTier(tier: string): string {
  const lower = tier.toLowerCase();
  if (lower.includes('1') || lower.includes('lead') || lower.includes('tier1')) {
    return 'Tier 1';
  }
  if (lower.includes('2') || lower.includes('lag') || lower.includes('tier2')) {
    return 'Tier 2';
  }
  return 'Tier 1';
}

function normalizeFrequency(freq: string): string {
  const lower = freq.toLowerCase();
  if (lower.includes('quarter')) return 'Quarterly';
  if (lower.includes('week')) return 'Weekly';
  if (lower.includes('daily') || lower.includes('day')) return 'Daily';
  return 'Monthly';
}

export async function importDepartmentFromExcel(
  file: File,
  config: DepartmentImportConfig
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    counts: { functionalObjectives: 0, keyResults: 0, indicators: 0 },
    errors: [],
  };
  
  try {
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      result.errors.push('You must be logged in to import data');
      return result;
    }
    
    // Parse Excel
    const buffer = await file.arrayBuffer();
    const rows = parseExcelFile(buffer);
    
    if (rows.length === 0) {
      result.errors.push('No valid data rows found in the Excel file');
      return result;
    }
    
    // Auto-detect org objective and department from Excel if not provided in config
    const firstRowWithData = rows.find(r => r.orgObjective || r.department);
    const excelOrgObjective = firstRowWithData?.orgObjective;
    const excelBusinessOutcome = firstRowWithData?.businessOutcome;
    const excelDepartment = firstRowWithData?.department;
    
    // 1. Get or create org_objective
    let orgObjectiveId: string | null = config.orgObjectiveId || null;
    
    // Use org objective from Excel if not provided in config
    const orgObjectiveName = config.orgObjectiveName || excelOrgObjective;
    const businessOutcome = config.businessOutcome || excelBusinessOutcome;
    
    if (!orgObjectiveId && orgObjectiveName) {
      // Check if org_objective with this name already exists
      const { data: existingOrgObj } = await supabase
        .from('org_objectives')
        .select('id')
        .eq('name', orgObjectiveName)
        .maybeSingle();
      
      if (existingOrgObj) {
        orgObjectiveId = existingOrgObj.id;
        // Update business outcome if provided
        if (businessOutcome) {
          await supabase
            .from('org_objectives')
            .update({ 
              business_outcome: businessOutcome,
              color: config.departmentColor 
            })
            .eq('id', existingOrgObj.id);
        }
      } else {
        // Create new org_objective
        const { data: newOrgObj, error: orgObjError } = await supabase
          .from('org_objectives')
          .insert({
            name: orgObjectiveName,
            color: config.departmentColor,
            classification: 'CORE',
            business_outcome: businessOutcome || null,
          })
          .select('id')
          .single();
        
        if (orgObjError || !newOrgObj) {
          result.errors.push(`Failed to create org objective: ${orgObjError?.message}`);
          return result;
        }
        orgObjectiveId = newOrgObj.id;
      }
    }
    
    // 2. Create or get department
    // Use department from Excel if not provided in config
    const departmentName = config.departmentName || excelDepartment || 'General';
    let departmentId: string;
    
    const { data: existingDept } = await supabase
      .from('departments')
      .select('id, org_objective_id')
      .eq('name', departmentName)
      .maybeSingle();
    
    if (existingDept) {
      departmentId = existingDept.id;
      // Update org_objective_id and color if changed
      await supabase
        .from('departments')
        .update({ 
          org_objective_id: orgObjectiveId,
          color: config.departmentColor 
        })
        .eq('id', departmentId);
    } else {
      const { data: newDept, error: deptError } = await supabase
        .from('departments')
        .insert({
          name: departmentName,
          org_objective_id: orgObjectiveId,
          color: config.departmentColor,
        })
        .select('id')
        .single();
      
      if (deptError || !newDept) {
        result.errors.push(`Failed to create department: ${deptError?.message}`);
        return result;
      }
      departmentId = newDept.id;
    }
    
    // 2. Group rows by FO -> KR -> Indicators
    const foMap = new Map<string, Map<string, ParsedRow[]>>();
    
    for (const row of rows) {
      const foName = row.functionalObjective || 'General Objective';
      const krName = row.keyResult || 'General Key Result';
      
      if (!foMap.has(foName)) {
        foMap.set(foName, new Map());
      }
      const krMap = foMap.get(foName)!;
      
      if (!krMap.has(krName)) {
        krMap.set(krName, []);
      }
      krMap.get(krName)!.push(row);
    }
    
    // 3. Create hierarchy
    for (const [foName, krMap] of foMap) {
      // Create or get FO
      let foId: string;
      
      const { data: existingFO } = await supabase
        .from('functional_objectives')
        .select('id')
        .eq('name', foName)
        .eq('department_id', departmentId)
        .maybeSingle();
      
      if (existingFO) {
        foId = existingFO.id;
      } else {
        const { data: newFO, error: foError } = await supabase
          .from('functional_objectives')
          .insert({
            name: foName,
            department_id: departmentId,
          })
          .select('id')
          .single();
        
        if (foError || !newFO) {
          result.errors.push(`Failed to create FO "${foName}": ${foError?.message}`);
          continue;
        }
        foId = newFO.id;
        result.counts.functionalObjectives++;
      }
      
      // Create KRs and Indicators
      for (const [krName, indicators] of krMap) {
        let krId: string;
        
        const { data: existingKR } = await supabase
          .from('key_results')
          .select('id')
          .eq('name', krName)
          .eq('functional_objective_id', foId)
          .maybeSingle();
        
        if (existingKR) {
          krId = existingKR.id;
        } else {
          const { data: newKR, error: krError } = await supabase
            .from('key_results')
            .insert({
              name: krName,
              functional_objective_id: foId,
              target_value: 100,
              current_value: 0,
              unit: '%',
            })
            .select('id')
            .single();
          
          if (krError || !newKR) {
            result.errors.push(`Failed to create KR "${krName}": ${krError?.message}`);
            continue;
          }
          krId = newKR.id;
          result.counts.keyResults++;
        }
        
        // Create Indicators
        for (const ind of indicators) {
          const { data: existingInd } = await supabase
            .from('indicators')
            .select('id')
            .eq('name', ind.indicatorName)
            .eq('key_result_id', krId)
            .maybeSingle();
          
          if (existingInd) {
            // Update existing indicator with formula
            await supabase
              .from('indicators')
              .update({
                formula: ind.formula || null,
                frequency: normalizeFrequency(ind.frequency),
                tier: normalizeTier(ind.indicatorTier),
                unit: ind.unit || '%',
              })
              .eq('id', existingInd.id);
          } else {
            const { error: indError } = await supabase
              .from('indicators')
              .insert({
                name: ind.indicatorName,
                key_result_id: krId,
                formula: ind.formula || null,
                frequency: normalizeFrequency(ind.frequency),
                tier: normalizeTier(ind.indicatorTier),
                unit: ind.unit || '%',
                target_value: 0,
                current_value: 0,
                is_active: true,
              });
            
            if (indError) {
              result.errors.push(`Failed to create indicator "${ind.indicatorName}": ${indError.message}`);
              continue;
            }
            result.counts.indicators++;
          }
        }
      }
    }
    
    result.success = true;
    return result;
    
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

export interface DetectedHierarchy {
  orgObjective: { id: string; name: string; businessOutcome: string | null } | null;
  department: { id: string; name: string } | null;
  existingFOs: string[];
  existingKRs: string[];
  existingIndicators: string[];
}

export interface ExcelDetectedValues {
  orgObjective: string | null;
  businessOutcome: string | null;
  department: string | null;
}

export interface EnhancedImportPreview {
  totalRows: number;
  functionalObjectives: string[];
  keyResults: string[];
  indicators: number;
  detected: DetectedHierarchy | null;
  excelValues: ExcelDetectedValues;
  newFOs: string[];
  existingFOs: string[];
  newKRs: string[];
  existingKRs: string[];
  newIndicators: number;
  existingIndicators: number;
}

async function detectExistingHierarchy(foNames: string[]): Promise<DetectedHierarchy | null> {
  if (foNames.length === 0) return null;

  // Search for matching FOs in database
  const { data: matchingFOs } = await supabase
    .from('functional_objectives')
    .select(`
      id, name,
      departments!inner (
        id, name,
        org_objectives (id, name, business_outcome)
      )
    `)
    .in('name', foNames);

  if (!matchingFOs || matchingFOs.length === 0) return null;

  const firstMatch = matchingFOs[0] as any;
  const dept = firstMatch.departments;
  const orgObj = dept?.org_objectives;

  // Get all existing KRs and indicators for matched FOs
  const foIds = matchingFOs.map((fo: any) => fo.id);
  
  const { data: existingKRs } = await supabase
    .from('key_results')
    .select('id, name, functional_objective_id')
    .in('functional_objective_id', foIds);

  const krIds = existingKRs?.map(kr => kr.id) || [];
  
  const { data: existingIndicators } = await supabase
    .from('indicators')
    .select('id, name, key_result_id')
    .in('key_result_id', krIds);

  return {
    orgObjective: orgObj ? { id: orgObj.id, name: orgObj.name, businessOutcome: orgObj.business_outcome } : null,
    department: dept ? { id: dept.id, name: dept.name } : null,
    existingFOs: matchingFOs.map((fo: any) => fo.name),
    existingKRs: existingKRs?.map(kr => kr.name) || [],
    existingIndicators: existingIndicators?.map(ind => ind.name) || [],
  };
}

export function getImportPreview(file: File): Promise<EnhancedImportPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const rows = parseExcelFile(buffer);
        
        const fos = new Set<string>();
        const krs = new Set<string>();
        const indicatorNames = new Set<string>();
        
        // Extract values from first row with data
        const firstRowWithData = rows.find(r => r.orgObjective || r.department);
        const excelValues: ExcelDetectedValues = {
          orgObjective: firstRowWithData?.orgObjective || null,
          businessOutcome: firstRowWithData?.businessOutcome || null,
          department: firstRowWithData?.department || null,
        };
        
        for (const row of rows) {
          if (row.functionalObjective) fos.add(row.functionalObjective);
          if (row.keyResult) krs.add(row.keyResult);
          if (row.indicatorName) indicatorNames.add(row.indicatorName);
        }

        const foArray = Array.from(fos);
        const krArray = Array.from(krs);
        const indicatorArray = Array.from(indicatorNames);

        // Detect existing hierarchy
        const detected = await detectExistingHierarchy(foArray);

        // Calculate new vs existing
        const existingFOs = detected?.existingFOs || [];
        const existingKRs = detected?.existingKRs || [];
        const existingIndicatorNames = detected?.existingIndicators || [];

        const newFOs = foArray.filter(fo => !existingFOs.includes(fo));
        const newKRs = krArray.filter(kr => !existingKRs.includes(kr));
        const newIndicatorCount = indicatorArray.filter(ind => !existingIndicatorNames.includes(ind)).length;
        const existingIndicatorCount = indicatorArray.filter(ind => existingIndicatorNames.includes(ind)).length;
        
        resolve({
          totalRows: rows.length,
          functionalObjectives: foArray,
          keyResults: krArray,
          indicators: rows.length,
          detected,
          excelValues,
          newFOs,
          existingFOs: foArray.filter(fo => existingFOs.includes(fo)),
          newKRs,
          existingKRs: krArray.filter(kr => existingKRs.includes(kr)),
          newIndicators: newIndicatorCount,
          existingIndicators: existingIndicatorCount,
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
