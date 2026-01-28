import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

// ============= UNIFIED EXCEL IMPORTER V5.4 =============
// Supports 10-column format with positional formula detection
// RAG thresholds are UNIVERSAL: 1-50 Red, 51-75 Amber, 76-100 Green

export interface ParsedIndicator {
  department: string;
  owner: string;
  orgObjective: string;
  functionalObjective: string;
  foFormula: string | null;  // FO-level formula
  keyResult: string;
  krFormula: string | null;  // KR-level formula
  indicatorName: string;
  formula: string | null;    // KPI-level formula
  targetValue: number | null;
}

export interface UnifiedImportPreview {
  // OKR Hierarchy
  orgObjectives: string[];
  departments: string[];
  functionalObjectives: string[];
  keyResults: string[];
  indicatorCount: number;
  indicators: ParsedIndicator[];
  
  // Formulas
  formulasConfigured: number;
  formulaDetails: Array<{
    indicatorName: string;
    formula: string;
  }>;
  
  // Warnings
  warnings: string[];
}

export interface UnifiedImportResult {
  success: boolean;
  counts: {
    orgObjectives: number;
    departments: number;
    functionalObjectives: number;
    keyResults: number;
    indicators: number;
    ragVersions: number;
    formulaVersions: number;
  };
  errors: string[];
}

// Universal RAG thresholds
const UNIVERSAL_RAG = {
  red: 50,
  amber: 75,
  green: 76,
};

function parseExcelRows(buffer: ArrayBuffer): ParsedIndicator[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  // Find data sheet - prioritize sheets with OKR/data in name
  const sheetName = workbook.SheetNames.find(name => 
    name.toLowerCase().includes('okr') || name.toLowerCase().includes('data')
  ) || workbook.SheetNames[0];
  
  console.log('[V5.4 Parser] Using sheet:', sheetName);
  
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  console.log('[V5.4 Parser] Total raw rows:', rawRows.length);
  if (rawRows.length > 0) {
    console.log('[V5.4 Parser] First rows:', rawRows.slice(0, 3));
  }
  
  // Find the header row - look for a row containing key headers
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    const rowValues = (rawRows[i] || []).map(v => String(v || '').toLowerCase());
    const hasKeyHeaders = rowValues.some(v => v.includes('department')) && 
      (rowValues.some(v => v.includes('kpi') || v.includes('indicator') || v.includes('key result')));
    if (hasKeyHeaders) {
      headerRowIndex = i;
      console.log('[V5.4 Parser] Found header row at index:', i);
      break;
    }
  }
  
  if (rawRows.length < headerRowIndex + 2) return [];

  // Map headers with flexible matching
  const headerRow = rawRows[headerRowIndex];
  console.log('[V5.4 Parser] Header row:', headerRow);
  
  const colIndex: Record<string, number> = {};
  
  // Track all columns and their types for positional formula detection
  const columnTypes: { idx: number; type: string; originalHeader: string }[] = [];
  
  headerRow.forEach((cell: any, idx: number) => {
    const normalized = (cell || '').toString().toLowerCase().trim();
    const original = (cell || '').toString().trim();
    
    // Track column type
    let colType = 'unknown';
    
    // Department
    if (normalized === 'department') {
      colIndex.department = idx;
      colType = 'department';
    }
    
    // Owner
    if (normalized === 'owner') {
      colIndex.owner = idx;
      colType = 'owner';
    }
    
    // Organizational Objective
    if (normalized.includes('organizational') && normalized.includes('objective')) {
      colIndex.orgObjective = idx;
      colType = 'orgObjective';
    }
    if (normalized === 'org objective' || normalized === 'org. objective') {
      colIndex.orgObjective = idx;
      colType = 'orgObjective';
    }
    
    // Functional Objective
    if ((normalized.includes('functional') && normalized.includes('objective')) || 
        normalized === 'func. objective' || 
        normalized === 'fo') {
      colIndex.fo = idx;
      colType = 'fo';
    }
    
    // Key Result
    if (normalized.includes('key') && normalized.includes('result')) {
      colIndex.kr = idx;
      colType = 'kr';
    }
    if (normalized === 'kr') {
      colIndex.kr = idx;
      colType = 'kr';
    }
    
    // Indicator/KPI
    if (normalized === 'kpi' || 
        normalized.includes('indicator') || 
        (normalized.includes('kpi') && normalized.includes('name'))) {
      colIndex.indicator = idx;
      colType = 'indicator';
    }
    
    // Target
    if (normalized.includes('target')) {
      colIndex.target = idx;
      colType = 'target';
    }
    
    // Formula columns - mark for positional assignment later
    if (normalized.includes('formula') || normalized.includes('bodmas')) {
      colType = 'formula';
    }
    
    columnTypes.push({ idx, type: colType, originalHeader: original });
  });
  
  console.log('[V5.4 Parser] Column types:', columnTypes);
  
  // Assign formula columns based on what precedes them
  // V5.4 format: FO Formula follows FO, KR Formula follows KR, KPI Formula follows KPI
  for (let i = 0; i < columnTypes.length; i++) {
    if (columnTypes[i].type === 'formula') {
      // Look at the column immediately before this formula
      if (i > 0) {
        const prevType = columnTypes[i - 1].type;
        if (prevType === 'fo') {
          colIndex.foFormula = columnTypes[i].idx;
          console.log('[V5.4 Parser] FO Formula at column', columnTypes[i].idx);
        } else if (prevType === 'kr') {
          colIndex.krFormula = columnTypes[i].idx;
          console.log('[V5.4 Parser] KR Formula at column', columnTypes[i].idx);
        } else if (prevType === 'indicator') {
          colIndex.kpiFormula = columnTypes[i].idx;
          console.log('[V5.4 Parser] KPI Formula at column', columnTypes[i].idx);
        }
      }
    }
  }
  
  console.log('[V5.4 Parser] Final column mapping:', colIndex);

  const results: ParsedIndicator[] = [];
  
  // Carry-forward values for merged cells
  let lastDept = '', lastOwner = '', lastOrgObj = '', lastFO = '', lastKR = '';
  let lastFoFormula = '', lastKrFormula = '';
  
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every(cell => !cell)) continue;

    const department = row[colIndex.department]?.toString().trim() || lastDept;
    const owner = row[colIndex.owner]?.toString().trim() || lastOwner;
    const orgObjective = row[colIndex.orgObjective]?.toString().trim() || lastOrgObj;
    const fo = row[colIndex.fo]?.toString().trim() || lastFO;
    const kr = row[colIndex.kr]?.toString().trim() || lastKR;
    
    // Get indicator name
    const indicator = row[colIndex.indicator]?.toString().trim();
    
    // Get formulas with carry-forward for FO and KR
    const foFormula = colIndex.foFormula !== undefined 
      ? (row[colIndex.foFormula]?.toString().trim() || lastFoFormula)
      : null;
    const krFormula = colIndex.krFormula !== undefined 
      ? (row[colIndex.krFormula]?.toString().trim() || lastKrFormula)
      : null;
    const kpiFormula = colIndex.kpiFormula !== undefined 
      ? row[colIndex.kpiFormula]?.toString().trim() || null
      : null;

    // Update carry-forward
    if (row[colIndex.department]) lastDept = department;
    if (row[colIndex.owner]) lastOwner = owner;
    if (row[colIndex.orgObjective]) lastOrgObj = orgObjective;
    if (row[colIndex.fo]) lastFO = fo;
    if (row[colIndex.kr]) lastKR = kr;
    if (colIndex.foFormula !== undefined && row[colIndex.foFormula]) lastFoFormula = foFormula || '';
    if (colIndex.krFormula !== undefined && row[colIndex.krFormula]) lastKrFormula = krFormula || '';

    // Skip rows without an indicator/KPI name
    if (!indicator) continue;

    results.push({
      department,
      owner,
      orgObjective,
      functionalObjective: fo,
      foFormula,
      keyResult: kr,
      krFormula,
      indicatorName: indicator,
      formula: kpiFormula,
      targetValue: colIndex.target !== undefined && row[colIndex.target] !== undefined 
        ? parseFloat(row[colIndex.target]) 
        : null,
    });
  }

  console.log('[V5.4 Parser] Parsed indicators:', results.length);
  if (results.length > 0) {
    console.log('[V5.4 Parser] First indicator:', results[0]);
  }

  return results;
}

export async function getUnifiedPreview(file: File): Promise<UnifiedImportPreview> {
  const buffer = await file.arrayBuffer();
  const indicators = parseExcelRows(buffer);
  
  const orgObjectives = [...new Set(indicators.map(i => i.orgObjective).filter(Boolean))];
  const departments = [...new Set(indicators.map(i => i.department).filter(Boolean))];
  const fos = [...new Set(indicators.map(i => i.functionalObjective).filter(Boolean))];
  const krs = [...new Set(indicators.map(i => i.keyResult).filter(Boolean))];
  
  const formulaDetails: UnifiedImportPreview['formulaDetails'] = [];
  const warnings: string[] = [];
  
  for (const ind of indicators) {
    // Check formula
    if (ind.formula) {
      formulaDetails.push({
        indicatorName: ind.indicatorName,
        formula: ind.formula,
      });
    }
    
    // Validation warnings
    if (!ind.orgObjective) warnings.push(`Indicator "${ind.indicatorName}" is missing organizational objective`);
    if (!ind.department) warnings.push(`Indicator "${ind.indicatorName}" is missing department`);
    if (!ind.functionalObjective) warnings.push(`Indicator "${ind.indicatorName}" is missing functional objective`);
    if (!ind.keyResult) warnings.push(`Indicator "${ind.indicatorName}" is missing key result`);
  }

  return {
    orgObjectives,
    departments,
    functionalObjectives: fos,
    keyResults: krs,
    indicatorCount: indicators.length,
    indicators,
    formulasConfigured: formulaDetails.length,
    formulaDetails,
    warnings,
  };
}

export async function importUnifiedExcel(
  file: File,
  config: {
    departmentColor?: string;
  }
): Promise<UnifiedImportResult> {
  const result: UnifiedImportResult = {
    success: false,
    counts: {
      orgObjectives: 0,
      departments: 0,
      functionalObjectives: 0,
      keyResults: 0,
      indicators: 0,
      ragVersions: 0,
      formulaVersions: 0,
    },
    errors: [],
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      result.errors.push('You must be logged in to import data');
      return result;
    }

    const buffer = await file.arrayBuffer();
    const indicators = parseExcelRows(buffer);

    if (indicators.length === 0) {
      result.errors.push('No valid data rows found in the Excel file');
      return result;
    }

    // Group by Org Objective → Department → FO → KR
    const orgObjMap = new Map<string, Map<string, Map<string, Map<string, ParsedIndicator[]>>>>();
    
    for (const ind of indicators) {
      const orgObj = ind.orgObjective || 'General';
      const dept = ind.department || 'General';
      const fo = ind.functionalObjective || 'General Objective';
      const kr = ind.keyResult || 'General Key Result';

      if (!orgObjMap.has(orgObj)) orgObjMap.set(orgObj, new Map());
      const deptMap = orgObjMap.get(orgObj)!;
      
      if (!deptMap.has(dept)) deptMap.set(dept, new Map());
      const foMap = deptMap.get(dept)!;
      
      if (!foMap.has(fo)) foMap.set(fo, new Map());
      const krMap = foMap.get(fo)!;
      
      if (!krMap.has(kr)) krMap.set(kr, []);
      krMap.get(kr)!.push(ind);
    }

    // Create hierarchy
    for (const [orgObjName, deptMap] of orgObjMap) {
      // Get or create org objective
      let orgObjectiveId: string;
      const { data: existingOrgObj } = await supabase
        .from('org_objectives')
        .select('id')
        .eq('name', orgObjName)
        .maybeSingle();

      if (existingOrgObj) {
        orgObjectiveId = existingOrgObj.id;
      } else {
        const { data: newOrgObj, error } = await supabase
          .from('org_objectives')
          .insert({
            name: orgObjName,
            color: config.departmentColor || 'green',
            classification: 'CORE',
          })
          .select('id')
          .single();

        if (error || !newOrgObj) {
          result.errors.push(`Failed to create org objective "${orgObjName}": ${error?.message}`);
          continue;
        }
        orgObjectiveId = newOrgObj.id;
        result.counts.orgObjectives++;
      }

      for (const [deptName, foMap] of deptMap) {
        // Get first indicator to get owner
        const firstInd = [...[...foMap.values()][0]?.values()][0]?.[0];
        
        // Get or create department
        let deptId: string;
        const { data: existingDept } = await supabase
          .from('departments')
          .select('id')
          .eq('name', deptName)
          .maybeSingle();

        if (existingDept) {
          deptId = existingDept.id;
          // Update department to link to org objective if not already linked
          await supabase
            .from('departments')
            .update({ 
              org_objective_id: orgObjectiveId,
              owner: firstInd?.owner || null,
              color: config.departmentColor || 'green',
            })
            .eq('id', deptId);
        } else {
          const { data: newDept, error } = await supabase
            .from('departments')
            .insert({ 
              name: deptName, 
              org_objective_id: orgObjectiveId,
              owner: firstInd?.owner || null,
              color: config.departmentColor || 'green',
            })
            .select('id')
            .single();

          if (error || !newDept) {
            result.errors.push(`Failed to create department "${deptName}": ${error?.message}`);
            continue;
          }
          deptId = newDept.id;
          result.counts.departments++;
        }

        for (const [foName, krMap] of foMap) {
          // Get first indicator of this FO to get owner
          const foFirstInd = [...krMap.values()][0]?.[0];
          
          // Get or create FO
          let foId: string;
          const { data: existingFO } = await supabase
            .from('functional_objectives')
            .select('id')
            .eq('name', foName)
            .eq('department_id', deptId)
            .maybeSingle();

          if (existingFO) {
            foId = existingFO.id;
            // Update owner and formula if provided
            const foUpdateData: Record<string, any> = {};
            if (foFirstInd?.owner) foUpdateData.owner = foFirstInd.owner;
            if (foFirstInd?.foFormula) foUpdateData.formula = foFirstInd.foFormula;
            
            if (Object.keys(foUpdateData).length > 0) {
              await supabase
                .from('functional_objectives')
                .update(foUpdateData)
                .eq('id', foId);
            }
          } else {
            const { data: newFO, error } = await supabase
              .from('functional_objectives')
              .insert({ 
                name: foName, 
                department_id: deptId,
                owner: foFirstInd?.owner || null,
                formula: foFirstInd?.foFormula || null,
              })
              .select('id')
              .single();

            if (error || !newFO) {
              result.errors.push(`Failed to create FO "${foName}": ${error?.message}`);
              continue;
            }
            foId = newFO.id;
            result.counts.functionalObjectives++;
          }

          for (const [krName, inds] of krMap) {
            // Get first indicator to get owner for this KR
            const krFirstInd = inds[0];
            
            // Get or create KR
            let krId: string;
            const { data: existingKR } = await supabase
              .from('key_results')
              .select('id')
              .eq('name', krName)
              .eq('functional_objective_id', foId)
              .maybeSingle();

            if (existingKR) {
              krId = existingKR.id;
              // Update owner and formula if provided
              const krUpdateData: Record<string, any> = {};
              if (krFirstInd?.owner) krUpdateData.owner = krFirstInd.owner;
              if (krFirstInd?.krFormula) krUpdateData.formula = krFirstInd.krFormula;
              
              if (Object.keys(krUpdateData).length > 0) {
                await supabase
                  .from('key_results')
                  .update(krUpdateData)
                  .eq('id', krId);
              }
            } else {
              const { data: newKR, error } = await supabase
                .from('key_results')
                .insert({
                  name: krName,
                  functional_objective_id: foId,
                  target_value: 100,
                  current_value: 0,
                  unit: '%',
                  owner: krFirstInd?.owner || null,
                  formula: krFirstInd?.krFormula || null,
                })
                .select('id')
                .single();

              if (error || !newKR) {
                result.errors.push(`Failed to create KR "${krName}": ${error?.message}`);
                continue;
              }
              krId = newKR.id;
              result.counts.keyResults++;
            }

            // Create indicators with universal RAG
            for (const ind of inds) {
              let indicatorId: string;
              
              const { data: existingInd } = await supabase
                .from('indicators')
                .select('id')
                .eq('name', ind.indicatorName)
                .eq('key_result_id', krId)
                .maybeSingle();

              if (existingInd) {
                indicatorId = existingInd.id;
                // Update existing
                await supabase
                  .from('indicators')
                  .update({
                    formula: ind.formula,
                    tier: 'kpi',
                    frequency: 'Monthly',
                    unit: '%',
                    target_value: ind.targetValue ?? 100,
                  })
                  .eq('id', indicatorId);
              } else {
                const { data: newInd, error } = await supabase
                  .from('indicators')
                  .insert({
                    name: ind.indicatorName,
                    key_result_id: krId,
                    formula: ind.formula,
                    tier: 'kpi',
                    frequency: 'Monthly',
                    unit: '%',
                    target_value: ind.targetValue ?? 100,
                    current_value: 0,
                    is_active: true,
                  })
                  .select('id')
                  .single();

                if (error || !newInd) {
                  result.errors.push(`Failed to create indicator "${ind.indicatorName}": ${error?.message}`);
                  continue;
                }
                indicatorId = newInd.id;
                result.counts.indicators++;
              }

              // Create universal RAG version
              await supabase
                .from('rag_versions')
                .update({ is_active: false })
                .eq('indicator_id', indicatorId);

              const { data: versions } = await supabase
                .from('rag_versions')
                .select('version_number')
                .eq('indicator_id', indicatorId)
                .order('version_number', { ascending: false })
                .limit(1);

              const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

              const { error: ragError } = await supabase
                .from('rag_versions')
                .insert({
                  indicator_id: indicatorId,
                  version_number: nextVersion,
                  red_threshold: UNIVERSAL_RAG.red,
                  amber_threshold: UNIVERSAL_RAG.amber,
                  green_threshold: UNIVERSAL_RAG.green,
                  rag_logic: 'higher_is_better',
                  is_active: true,
                  description: 'Universal RAG: 1-50 Red, 51-75 Amber, 76-100 Green',
                });

              if (!ragError) {
                result.counts.ragVersions++;
              }

              // Create formula version if formula provided
              if (ind.formula) {
                await supabase
                  .from('formula_versions')
                  .update({ is_active: false })
                  .eq('indicator_id', indicatorId);

                const { data: fVersions } = await supabase
                  .from('formula_versions')
                  .select('version_number')
                  .eq('indicator_id', indicatorId)
                  .order('version_number', { ascending: false })
                  .limit(1);

                const nextFVersion = fVersions && fVersions.length > 0 ? fVersions[0].version_number + 1 : 1;

                const { error: formulaError } = await supabase
                  .from('formula_versions')
                  .insert({
                    indicator_id: indicatorId,
                    version_number: nextFVersion,
                    formula_expression: ind.formula,
                    formula_type: 'Percentage',
                    is_active: true,
                    description: 'Imported from Excel',
                  });

                if (!formulaError) {
                  result.counts.formulaVersions++;
                }
              }
            }
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
