import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RAGStatus, OrgObjective, Department, FunctionalObjective, KeyResult, Indicator, OrgObjectiveColor, IndicatorTier, IndicatorFrequency } from '@/types/venture';
import { percentageToRAG } from '@/lib/formulaUtils';
import { parseFormulaType, aggregateProgress, progressToRAG } from '@/lib/formulaCalculations';

export interface DBIndicator {
  id: string;
  name: string;
  tier: string;
  current_value: number | null;
  target_value: number | null;
  frequency: string | null;
  formula: string | null;
  unit: string | null;
  linkedCustomerIds: string[];
  linkedFeatureIds: string[];
}

export interface DBKeyResult {
  id: string;
  name: string;
  owner: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  formula: string | null; // KR aggregation formula
  indicators: DBIndicator[];
}

export interface DBFunctionalObjective {
  id: string;
  name: string;
  owner: string | null;
  formula: string | null; // FO aggregation formula
  key_results: DBKeyResult[];
}

export interface DBDepartment {
  id: string;
  name: string;
  color: string | null;
  owner: string | null;
  functional_objectives: DBFunctionalObjective[];
}

export interface DBOrgObjective {
  id: string;
  name: string;
  description: string | null;
  color: string;
  classification: string;
  business_outcome: string | null;
  departments: DBDepartment[];
  // Calculated fields
  okrHealth: RAGStatus;
  okrProgress: number;
  customerHealth: RAGStatus;
  featureHealth: RAGStatus;
  overallHealth: RAGStatus;
}

function calculateIndicatorProgress(indicator: DBIndicator): number | null {
  if (indicator.current_value != null && indicator.target_value != null && indicator.target_value > 0) {
    return (indicator.current_value / indicator.target_value) * 100;
  }
  return null; // No data
}

/**
 * Calculate KR health using the stored formula for aggregation
 */
function calculateKRHealth(keyResult: DBKeyResult): RAGStatus {
  if (keyResult.indicators.length === 0) {
    // Fall back to KR's own values if no indicators
    if (keyResult.current_value != null && keyResult.target_value != null && keyResult.target_value > 0) {
      const progress = (keyResult.current_value / keyResult.target_value) * 100;
      return progressToRAG(progress);
    }
    return 'not-set';
  }
  
  const progressValues = keyResult.indicators
    .map(ind => calculateIndicatorProgress(ind))
    .filter((p): p is number => p !== null);
  
  if (progressValues.length === 0) return 'not-set';
  
  // Use the stored formula for aggregation (defaults to AVG if not set)
  const formulaType = parseFormulaType(keyResult.formula);
  const aggregatedProgress = aggregateProgress(progressValues, formulaType);
  
  return progressToRAG(aggregatedProgress);
}

/**
 * Calculate FO progress using the stored formula for aggregation
 */
function calculateFOProgress(fo: DBFunctionalObjective): { progress: number; status: RAGStatus } {
  if (fo.key_results.length === 0) return { progress: 0, status: 'not-set' };
  
  const krProgresses = fo.key_results
    .map(kr => {
      // Calculate KR progress from its indicators using KR's formula
      const indicatorsWithData = kr.indicators.filter(
        ind => ind.current_value != null && ind.target_value != null && ind.target_value > 0
      );
      
      if (indicatorsWithData.length > 0) {
        const indProgresses = indicatorsWithData.map(ind => 
          (ind.current_value! / ind.target_value!) * 100
        );
        const krFormulaType = parseFormulaType(kr.formula);
        return aggregateProgress(indProgresses, krFormulaType);
      }
      
      // Fall back to KR's own values
      if (kr.current_value != null && kr.target_value != null && kr.target_value > 0) {
        return (kr.current_value / kr.target_value) * 100;
      }
      return 0;
    })
    .filter(p => p > 0);
  
  if (krProgresses.length === 0) return { progress: 0, status: 'not-set' };
  
  // Use the stored formula for FO aggregation (defaults to AVG if not set)
  const foFormulaType = parseFormulaType(fo.formula);
  const aggregatedProgress = aggregateProgress(krProgresses, foFormulaType);
  
  return { progress: aggregatedProgress, status: progressToRAG(aggregatedProgress) };
}

function calculateFOHealth(fo: DBFunctionalObjective): RAGStatus {
  return calculateFOProgress(fo).status;
}

function calculateDepartmentProgress(dept: DBDepartment): { progress: number; status: RAGStatus } {
  if (dept.functional_objectives.length === 0) return { progress: 0, status: 'not-set' };
  
  const foProgresses = dept.functional_objectives
    .map(fo => calculateFOProgress(fo).progress)
    .filter(p => p > 0);
  
  if (foProgresses.length === 0) return { progress: 0, status: 'not-set' };
  
  const avgProgress = foProgresses.reduce((sum, p) => sum + p, 0) / foProgresses.length;
  return { progress: avgProgress, status: percentageToRAG(avgProgress) };
}

function calculateDepartmentHealth(dept: DBDepartment): RAGStatus {
  return calculateDepartmentProgress(dept).status;
}

function calculateOrgObjectiveProgress(obj: DBOrgObjective): { progress: number; status: RAGStatus } {
  if (obj.departments.length === 0) return { progress: 0, status: 'not-set' };
  
  const deptProgresses = obj.departments
    .map(dept => calculateDepartmentProgress(dept).progress)
    .filter(p => p > 0);
  
  if (deptProgresses.length === 0) return { progress: 0, status: 'not-set' };
  
  const avgProgress = deptProgresses.reduce((sum, p) => sum + p, 0) / deptProgresses.length;
  return { progress: avgProgress, status: percentageToRAG(avgProgress) };
}

function calculateOrgObjectiveHealth(obj: DBOrgObjective): RAGStatus {
  return calculateOrgObjectiveProgress(obj).status;
}

// Transform DB indicator to UI Indicator type
function transformIndicator(dbInd: DBIndicator): Indicator {
  const current = dbInd.current_value;
  const target = dbInd.target_value;
  const hasData = current != null && target != null && target > 0;
  const progress = hasData ? (current! / target!) * 100 : 0;
  
  return {
    id: dbInd.id,
    name: dbInd.name,
    tier: (dbInd.tier || 'leading') as IndicatorTier,
    formula: dbInd.formula || '',
    frequency: (dbInd.frequency || 'Monthly') as IndicatorFrequency,
    status: hasData ? percentageToRAG(progress) : 'not-set',
    currentValue: current ?? undefined,
    targetValue: target ?? undefined,
    linkedCustomerIds: dbInd.linkedCustomerIds,
    linkedFeatureIds: dbInd.linkedFeatureIds,
  };
}

// Transform DB key result to UI KeyResult type
function transformKeyResult(dbKR: DBKeyResult): KeyResult {
  // Calculate current and target from indicators if they exist
  let current = dbKR.current_value ?? 0;
  let target = dbKR.target_value ?? 100;
  
  // If we have indicators with data, calculate the percentage from indicators
  const indicatorsWithData = dbKR.indicators.filter(
    ind => ind.current_value != null && ind.target_value != null && ind.target_value > 0
  );
  
  if (indicatorsWithData.length > 0) {
    // Calculate average progress from indicators
    const avgProgress = indicatorsWithData.reduce((sum, ind) => 
      sum + ((ind.current_value! / ind.target_value!) * 100), 0
    ) / indicatorsWithData.length;
    
    // Display as percentage out of 100
    current = Math.round(avgProgress);
    target = 100;
  }
  
  return {
    id: dbKR.id,
    name: dbKR.name,
    target: target,
    current: current,
    unit: indicatorsWithData.length > 0 ? '%' : (dbKR.unit || ''),
    owner: dbKR.owner || 'Unassigned',
    status: calculateKRHealth(dbKR),
    indicators: dbKR.indicators.map(transformIndicator),
  };
}

// Transform DB functional objective to UI FunctionalObjective type
function transformFunctionalObjective(dbFO: DBFunctionalObjective): FunctionalObjective {
  return {
    id: dbFO.id,
    name: dbFO.name,
    team: dbFO.owner || 'Unassigned',
    status: calculateFOHealth(dbFO),
    keyResults: dbFO.key_results.map(transformKeyResult),
  };
}

// Transform DB department to UI Department type
function transformDepartment(dbDept: DBDepartment, fallbackColor?: OrgObjectiveColor): Department {
  // Use department's own color if set, otherwise fall back to org objective color
  const deptColor = dbDept.color ? dbDept.color.toLowerCase() as OrgObjectiveColor : fallbackColor;
  return {
    id: dbDept.id,
    name: dbDept.name,
    color: deptColor,
    owner: dbDept.owner || undefined,
    status: calculateDepartmentHealth(dbDept),
    functionalObjectives: dbDept.functional_objectives.map(transformFunctionalObjective),
  };
}

// Transform DB org objective to UI OrgObjective type (for drilldown pages)
export function transformToUIObjective(dbObj: DBOrgObjective): OrgObjective & { 
  okrHealth: RAGStatus;
  okrProgress: number;
  customerHealth: RAGStatus;
  featureHealth: RAGStatus;
  departments: Department[];
  functionalObjectives: FunctionalObjective[];
} {
  const color = (dbObj.color?.toLowerCase() || 'green') as OrgObjectiveColor;
  const departments = dbObj.departments.map(d => transformDepartment(d, color));
  
  // Flatten functional objectives for backwards compatibility
  const functionalObjectives = departments.flatMap(d => d.functionalObjectives);
  
  return {
    id: dbObj.id,
    name: dbObj.name,
    color: color,
    classification: dbObj.classification as 'CORE' | 'Enabler',
    status: dbObj.okrHealth,
    okrHealth: dbObj.okrHealth,
    okrProgress: dbObj.okrProgress,
    customerHealth: dbObj.customerHealth,
    featureHealth: dbObj.featureHealth,
    departments: departments,
    functionalObjectives: functionalObjectives,
  };
}

async function fetchOrgObjectives(ventureId?: string): Promise<DBOrgObjective[]> {
  // Fetch org objectives, optionally filtered by venture
  let query = supabase
    .from('org_objectives')
    .select('*')
    .order('name');
  
  if (ventureId) {
    query = query.eq('venture_id', ventureId);
  }
  
  const { data: orgObjectives, error: orgError } = await query;
  
  if (orgError) throw orgError;
  if (!orgObjectives || orgObjectives.length === 0) return [];

  // Fetch departments with their org_objective_id
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*');
  
  if (deptError) throw deptError;

  // Fetch functional objectives
  const { data: functionalObjectives, error: foError } = await supabase
    .from('functional_objectives')
    .select('*');
  
  if (foError) throw foError;

  // Fetch key results
  const { data: keyResults, error: krError } = await supabase
    .from('key_results')
    .select('*');
  
  if (krError) throw krError;

  // Fetch indicators
  const { data: indicators, error: indError } = await supabase
    .from('indicators')
    .select('*');
  
  if (indError) throw indError;

  // Fetch indicator-customer links
  const { data: customerLinks, error: custLinkError } = await supabase
    .from('indicator_customer_links')
    .select('indicator_id, customer_id');
  
  if (custLinkError) throw custLinkError;

  // Fetch indicator-feature links
  const { data: featureLinks, error: featLinkError } = await supabase
    .from('indicator_feature_links')
    .select('indicator_id, feature_id');
  
  if (featLinkError) throw featLinkError;

  // Build maps for indicator links
  const customerLinksByIndicator = new Map<string, string[]>();
  (customerLinks || []).forEach(link => {
    const existing = customerLinksByIndicator.get(link.indicator_id) || [];
    existing.push(link.customer_id);
    customerLinksByIndicator.set(link.indicator_id, existing);
  });

  const featureLinksByIndicator = new Map<string, string[]>();
  (featureLinks || []).forEach(link => {
    const existing = featureLinksByIndicator.get(link.indicator_id) || [];
    existing.push(link.feature_id);
    featureLinksByIndicator.set(link.indicator_id, existing);
  });

  // Build the hierarchy
  const indicatorsByKR = new Map<string, DBIndicator[]>();
  (indicators || []).forEach(ind => {
    if (ind.key_result_id) {
      const existing = indicatorsByKR.get(ind.key_result_id) || [];
      existing.push({
        id: ind.id,
        name: ind.name,
        tier: ind.tier,
        current_value: ind.current_value ? Number(ind.current_value) : null,
        target_value: ind.target_value ? Number(ind.target_value) : null,
        frequency: ind.frequency,
        formula: ind.formula,
        unit: ind.unit,
        linkedCustomerIds: customerLinksByIndicator.get(ind.id) || [],
        linkedFeatureIds: featureLinksByIndicator.get(ind.id) || [],
      });
      indicatorsByKR.set(ind.key_result_id, existing);
    }
  });

  const krsByFO = new Map<string, DBKeyResult[]>();
  (keyResults || []).forEach(kr => {
    if (kr.functional_objective_id) {
      const existing = krsByFO.get(kr.functional_objective_id) || [];
      existing.push({
        id: kr.id,
        name: kr.name,
        owner: kr.owner,
        current_value: kr.current_value ? Number(kr.current_value) : null,
        target_value: kr.target_value ? Number(kr.target_value) : null,
        unit: kr.unit,
        formula: kr.formula, // Include KR formula
        indicators: indicatorsByKR.get(kr.id) || [],
      });
      krsByFO.set(kr.functional_objective_id, existing);
    }
  });

  const fosByDept = new Map<string, DBFunctionalObjective[]>();
  (functionalObjectives || []).forEach(fo => {
    if (fo.department_id) {
      const existing = fosByDept.get(fo.department_id) || [];
      existing.push({
        id: fo.id,
        name: fo.name,
        owner: fo.owner,
        formula: fo.formula, // Include FO formula
        key_results: krsByFO.get(fo.id) || [],
      });
      fosByDept.set(fo.department_id, existing);
    }
  });

  const deptsByOrg = new Map<string, DBDepartment[]>();
  (departments || []).forEach(dept => {
    if (dept.org_objective_id) {
      const existing = deptsByOrg.get(dept.org_objective_id) || [];
      existing.push({
        id: dept.id,
        name: dept.name,
        color: dept.color || null,
        owner: dept.owner || null,
        functional_objectives: fosByDept.get(dept.id) || [],
      });
      deptsByOrg.set(dept.org_objective_id, existing);
    }
  });

  // Build final objects with calculated health
  return orgObjectives.map(org => {
    const departments = deptsByOrg.get(org.id) || [];
    const tempObj = {
      id: org.id,
      name: org.name,
      description: org.description,
      color: org.color,
      classification: org.classification,
      business_outcome: org.business_outcome,
      departments,
      okrHealth: 'not-set' as RAGStatus,
      okrProgress: 0,
      customerHealth: 'not-set' as RAGStatus,
      featureHealth: 'not-set' as RAGStatus,
      overallHealth: 'not-set' as RAGStatus,
    };
    
    // Calculate progress and health
    const { progress, status } = calculateOrgObjectiveProgress(tempObj as DBOrgObjective);
    
    const orgObj: DBOrgObjective = {
      ...tempObj,
      okrHealth: status,
      okrProgress: progress,
      overallHealth: status, // For now, just use OKR health
    };
    
    return orgObj;
  });
}

export function useOrgObjectives(ventureId?: string) {
  return useQuery({
    queryKey: ['org-objectives', ventureId],
    queryFn: () => fetchOrgObjectives(ventureId),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useVentures() {
  return useQuery({
    queryKey: ['ventures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventures')
        .select('id, name, display_name, is_active')
        .order('is_active', { ascending: false })
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });
}

export function useOrgObjectiveById(id: string) {
  const { data: orgObjectives, isLoading, error } = useOrgObjectives();
  
  const objective = orgObjectives?.find(o => o.id === id);
  const transformed = objective ? transformToUIObjective(objective) : undefined;
  
  return {
    data: transformed,
    isLoading,
    error,
  };
}

// Export helper functions for use in components
export { calculateIndicatorProgress, calculateKRHealth, calculateFOHealth, calculateDepartmentHealth };
