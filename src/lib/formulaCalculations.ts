import { supabase } from '@/integrations/supabase/client';
import { RAGStatus } from '@/types/venture';

/**
 * Supported aggregation formula types
 */
export type FormulaType = 'AVG' | 'SUM' | 'WEIGHTED_AVG' | 'MIN' | 'MAX';

/**
 * Parse a formula string to determine the aggregation type
 */
export function parseFormulaType(formula: string | null): FormulaType {
  if (!formula) return 'AVG'; // Default to average
  
  const normalized = formula.toUpperCase().trim();
  
  if (normalized.includes('WEIGHTED_AVG') || normalized.includes('WEIGHTED AVG')) {
    return 'WEIGHTED_AVG';
  }
  if (normalized.includes('SUM')) {
    return 'SUM';
  }
  if (normalized.includes('MIN')) {
    return 'MIN';
  }
  if (normalized.includes('MAX')) {
    return 'MAX';
  }
  // Default to AVG
  return 'AVG';
}

/**
 * Calculate progress for a single indicator (KPI)
 * Uses the indicator's formula if available, otherwise defaults to current/target * 100
 */
export function calculateKPIProgress(currentValue: number | null, targetValue: number | null): number {
  if (currentValue === null || targetValue === null || targetValue === 0) {
    return 0;
  }
  return (currentValue / targetValue) * 100;
}

/**
 * Aggregate child progress values using the specified formula
 */
export function aggregateProgress(values: number[], formula: FormulaType, weights?: number[]): number {
  if (values.length === 0) return 0;
  
  switch (formula) {
    case 'AVG':
      return values.reduce((sum, v) => sum + v, 0) / values.length;
      
    case 'SUM':
      // For SUM, we sum the progress percentages (useful for counting completed items)
      return values.reduce((sum, v) => sum + v, 0);
      
    case 'WEIGHTED_AVG':
      if (!weights || weights.length !== values.length) {
        // Fall back to simple average if no weights
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      }
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      if (totalWeight === 0) return 0;
      return values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight;
      
    case 'MIN':
      return Math.min(...values);
      
    case 'MAX':
      return Math.max(...values);
      
    default:
      return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}

/**
 * Convert progress percentage to RAG status
 * Uses standard thresholds: ≥76% Green, ≥51% Amber, <51% Red
 */
export function progressToRAG(progress: number): RAGStatus {
  if (progress >= 76) return 'green';
  if (progress >= 51) return 'amber';
  if (progress > 0) return 'red';
  return 'not-set';
}

/**
 * Calculate Key Result progress from its KPIs using the KR's formula
 */
export async function calculateKRProgress(krId: string): Promise<{ progress: number; status: RAGStatus }> {
  // Get KR with its formula
  const { data: kr } = await supabase
    .from('key_results')
    .select('formula')
    .eq('id', krId)
    .single();
    
  // Get all indicators for this KR
  const { data: indicators } = await supabase
    .from('indicators')
    .select('current_value, target_value')
    .eq('key_result_id', krId);
    
  if (!indicators || indicators.length === 0) {
    return { progress: 0, status: 'not-set' };
  }
  
  // Calculate progress for each indicator
  const progresses = indicators.map(ind => 
    calculateKPIProgress(ind.current_value, ind.target_value)
  );
  
  // Get weights for weighted average (using target values as weights)
  const weights = indicators.map(ind => ind.target_value || 1);
  
  // Aggregate using the KR's formula
  const formulaType = parseFormulaType(kr?.formula || null);
  const progress = aggregateProgress(progresses, formulaType, weights);
  
  return {
    progress,
    status: progressToRAG(progress),
  };
}

/**
 * Calculate Functional Objective progress from its Key Results using the FO's formula
 */
export async function calculateFOProgress(foId: string): Promise<{ progress: number; status: RAGStatus }> {
  // Get FO with its formula
  const { data: fo } = await supabase
    .from('functional_objectives')
    .select('formula')
    .eq('id', foId)
    .single();
    
  // Get all KRs for this FO
  const { data: keyResults } = await supabase
    .from('key_results')
    .select('id, target_value')
    .eq('functional_objective_id', foId);
    
  if (!keyResults || keyResults.length === 0) {
    return { progress: 0, status: 'not-set' };
  }
  
  // Calculate progress for each KR
  const krProgresses = await Promise.all(
    keyResults.map(kr => calculateKRProgress(kr.id))
  );
  
  const progresses = krProgresses.map(p => p.progress);
  const weights = keyResults.map(kr => kr.target_value || 1);
  
  // Aggregate using the FO's formula
  const formulaType = parseFormulaType(fo?.formula || null);
  const progress = aggregateProgress(progresses, formulaType, weights);
  
  return {
    progress,
    status: progressToRAG(progress),
  };
}

/**
 * Calculate Department progress from its Functional Objectives
 */
export async function calculateDepartmentProgress(deptId: string): Promise<{ progress: number; status: RAGStatus }> {
  // Get all FOs for this department
  const { data: fos } = await supabase
    .from('functional_objectives')
    .select('id')
    .eq('department_id', deptId);
    
  if (!fos || fos.length === 0) {
    return { progress: 0, status: 'not-set' };
  }
  
  // Calculate progress for each FO
  const foProgresses = await Promise.all(
    fos.map(fo => calculateFOProgress(fo.id))
  );
  
  const progresses = foProgresses.map(p => p.progress);
  
  // Departments always use simple average
  const progress = aggregateProgress(progresses, 'AVG');
  
  return {
    progress,
    status: progressToRAG(progress),
  };
}

/**
 * Calculate Org Objective progress from its Departments using simple average
 */
export async function calculateOrgObjectiveProgress(orgId: string): Promise<{ progress: number; status: RAGStatus }> {
  // Get all departments for this org objective
  const { data: depts } = await supabase
    .from('departments')
    .select('id')
    .eq('org_objective_id', orgId);
    
  if (!depts || depts.length === 0) {
    return { progress: 0, status: 'not-set' };
  }
  
  // Calculate progress for each department
  const deptProgresses = await Promise.all(
    depts.map(dept => calculateDepartmentProgress(dept.id))
  );
  
  const progresses = deptProgresses.map(p => p.progress);
  
  // Org Objectives always use simple average
  const progress = aggregateProgress(progresses, 'AVG');
  
  return {
    progress,
    status: progressToRAG(progress),
  };
}

/**
 * Calculate Business Outcome progress from all Org Objectives that share the same business_outcome value
 */
export async function calculateBusinessOutcomeProgress(businessOutcome: string): Promise<{ progress: number; status: RAGStatus }> {
  if (!businessOutcome) {
    return { progress: 0, status: 'not-set' };
  }
  
  // Get all org objectives with this business outcome
  const { data: orgObjectives } = await supabase
    .from('org_objectives')
    .select('id')
    .eq('business_outcome', businessOutcome);
    
  if (!orgObjectives || orgObjectives.length === 0) {
    return { progress: 0, status: 'not-set' };
  }
  
  // Calculate progress for each org objective
  const orgProgresses = await Promise.all(
    orgObjectives.map(org => calculateOrgObjectiveProgress(org.id))
  );
  
  const progresses = orgProgresses.map(p => p.progress);
  
  // Business Outcome always uses simple average
  const progress = aggregateProgress(progresses, 'AVG');
  
  return {
    progress,
    status: progressToRAG(progress),
  };
}

/**
 * Get calculation breakdown for transparency
 */
export interface CalculationBreakdown {
  entityName: string;
  entityType: 'KPI' | 'KR' | 'FO' | 'Department' | 'OrgObjective' | 'BusinessOutcome';
  formula: string;
  formulaType: FormulaType;
  childValues: Array<{
    name: string;
    progress: number;
    weight?: number;
  }>;
  calculatedProgress: number;
  status: RAGStatus;
}

/**
 * Get detailed calculation breakdown for a Key Result
 */
export async function getKRCalculationBreakdown(krId: string): Promise<CalculationBreakdown | null> {
  const { data: kr } = await supabase
    .from('key_results')
    .select('name, formula')
    .eq('id', krId)
    .single();
    
  if (!kr) return null;
  
  const { data: indicators } = await supabase
    .from('indicators')
    .select('name, current_value, target_value')
    .eq('key_result_id', krId);
    
  if (!indicators || indicators.length === 0) return null;
  
  const formulaType = parseFormulaType(kr.formula);
  
  const childValues = indicators.map(ind => ({
    name: ind.name,
    progress: calculateKPIProgress(ind.current_value, ind.target_value),
    weight: ind.target_value || 1,
  }));
  
  const progresses = childValues.map(c => c.progress);
  const weights = childValues.map(c => c.weight);
  const calculatedProgress = aggregateProgress(progresses, formulaType, weights);
  
  return {
    entityName: kr.name,
    entityType: 'KR',
    formula: kr.formula || 'AVG (default)',
    formulaType,
    childValues,
    calculatedProgress,
    status: progressToRAG(calculatedProgress),
  };
}

/**
 * Get detailed calculation breakdown for a Functional Objective
 */
export async function getFOCalculationBreakdown(foId: string): Promise<CalculationBreakdown | null> {
  const { data: fo } = await supabase
    .from('functional_objectives')
    .select('name, formula')
    .eq('id', foId)
    .single();
    
  if (!fo) return null;
  
  const { data: keyResults } = await supabase
    .from('key_results')
    .select('id, name, target_value')
    .eq('functional_objective_id', foId);
    
  if (!keyResults || keyResults.length === 0) return null;
  
  const formulaType = parseFormulaType(fo.formula);
  
  const childValues = await Promise.all(
    keyResults.map(async kr => {
      const { progress } = await calculateKRProgress(kr.id);
      return {
        name: kr.name,
        progress,
        weight: kr.target_value || 1,
      };
    })
  );
  
  const progresses = childValues.map(c => c.progress);
  const weights = childValues.map(c => c.weight);
  const calculatedProgress = aggregateProgress(progresses, formulaType, weights);
  
  return {
    entityName: fo.name,
    entityType: 'FO',
    formula: fo.formula || 'AVG (default)',
    formulaType,
    childValues,
    calculatedProgress,
    status: progressToRAG(calculatedProgress),
  };
}

/**
 * Get detailed calculation breakdown for a Department
 */
export async function getDepartmentCalculationBreakdown(deptId: string): Promise<CalculationBreakdown | null> {
  const { data: dept } = await supabase
    .from('departments')
    .select('name')
    .eq('id', deptId)
    .single();
    
  if (!dept) return null;
  
  const { data: fos } = await supabase
    .from('functional_objectives')
    .select('id, name')
    .eq('department_id', deptId);
    
  if (!fos || fos.length === 0) return null;
  
  const childValues = await Promise.all(
    fos.map(async fo => {
      const { progress } = await calculateFOProgress(fo.id);
      return {
        name: fo.name,
        progress,
      };
    })
  );
  
  const progresses = childValues.map(c => c.progress);
  const calculatedProgress = aggregateProgress(progresses, 'AVG');
  
  return {
    entityName: dept.name,
    entityType: 'Department',
    formula: 'AVG (default)',
    formulaType: 'AVG',
    childValues,
    calculatedProgress,
    status: progressToRAG(calculatedProgress),
  };
}

/**
 * Get detailed calculation breakdown for an Org Objective
 */
export async function getOrgObjectiveCalculationBreakdown(orgId: string): Promise<CalculationBreakdown | null> {
  const { data: org } = await supabase
    .from('org_objectives')
    .select('name')
    .eq('id', orgId)
    .single();
    
  if (!org) return null;
  
  const { data: depts } = await supabase
    .from('departments')
    .select('id, name')
    .eq('org_objective_id', orgId);
    
  if (!depts || depts.length === 0) return null;
  
  const childValues = await Promise.all(
    depts.map(async dept => {
      const { progress } = await calculateDepartmentProgress(dept.id);
      return {
        name: dept.name,
        progress,
      };
    })
  );
  
  const progresses = childValues.map(c => c.progress);
  const calculatedProgress = aggregateProgress(progresses, 'AVG');
  
  return {
    entityName: org.name,
    entityType: 'OrgObjective',
    formula: 'AVG (simple average of departments)',
    formulaType: 'AVG',
    childValues,
    calculatedProgress,
    status: progressToRAG(calculatedProgress),
  };
}

/**
 * Get detailed calculation breakdown for a Business Outcome
 */
export async function getBusinessOutcomeCalculationBreakdown(businessOutcome: string): Promise<CalculationBreakdown | null> {
  if (!businessOutcome) return null;
  
  const { data: orgObjectives } = await supabase
    .from('org_objectives')
    .select('id, name')
    .eq('business_outcome', businessOutcome);
    
  if (!orgObjectives || orgObjectives.length === 0) return null;
  
  const childValues = await Promise.all(
    orgObjectives.map(async org => {
      const { progress } = await calculateOrgObjectiveProgress(org.id);
      return {
        name: org.name,
        progress,
      };
    })
  );
  
  const progresses = childValues.map(c => c.progress);
  const calculatedProgress = aggregateProgress(progresses, 'AVG');
  
  return {
    entityName: businessOutcome,
    entityType: 'BusinessOutcome',
    formula: 'AVG (simple average of org objectives)',
    formulaType: 'AVG',
    childValues,
    calculatedProgress,
    status: progressToRAG(calculatedProgress),
  };
}
