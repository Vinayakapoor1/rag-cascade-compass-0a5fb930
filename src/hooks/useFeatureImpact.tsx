import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RAGStatus } from '@/types/venture';
import { percentageToRAG } from '@/lib/formulaUtils';

export interface FeatureImpactIndicator {
  id: string;
  name: string;
  tier: string;
  currentValue: number | null;
  targetValue: number | null;
  status: RAGStatus;
  keyResultId: string;
  keyResultName: string;
  functionalObjectiveId: string;
  functionalObjectiveName: string;
  departmentId: string;
  departmentName: string;
  orgObjectiveId: string;
  orgObjectiveName: string;
  orgObjectiveColor: string;
}

export interface FeatureImpactSummary {
  featureId: string;
  featureName: string;
  featureCategory: string | null;
  featureStatus: string | null;
  featureDescription: string | null;
  totalIndicators: number;
  totalKeyResults: number;
  totalFunctionalObjectives: number;
  totalDepartments: number;
  totalOrgObjectives: number;
  statusBreakdown: {
    green: number;
    amber: number;
    red: number;
    notSet: number;
  };
  indicators: FeatureImpactIndicator[];
  // Grouped views
  byOrgObjective: Map<string, {
    id: string;
    name: string;
    color: string;
    departments: Map<string, {
      id: string;
      name: string;
      functionalObjectives: Map<string, {
        id: string;
        name: string;
        keyResults: Map<string, {
          id: string;
          name: string;
          status: RAGStatus;
          indicators: FeatureImpactIndicator[];
        }>;
      }>;
    }>;
  }>;
}

async function fetchFeatureImpact(featureId: string): Promise<FeatureImpactSummary | null> {
  // Fetch feature details
  const { data: feature, error: featureError } = await supabase
    .from('features')
    .select('*')
    .eq('id', featureId)
    .single();
  
  if (featureError || !feature) return null;

  // Fetch all indicator links for this feature
  const { data: links, error: linksError } = await supabase
    .from('indicator_feature_links')
    .select('indicator_id')
    .eq('feature_id', featureId);
  
  if (linksError) throw linksError;
  if (!links || links.length === 0) {
    return {
      featureId: feature.id,
      featureName: feature.name,
      featureCategory: feature.category,
      featureStatus: feature.status,
      featureDescription: feature.description,
      totalIndicators: 0,
      totalKeyResults: 0,
      totalFunctionalObjectives: 0,
      totalDepartments: 0,
      totalOrgObjectives: 0,
      statusBreakdown: { green: 0, amber: 0, red: 0, notSet: 0 },
      indicators: [],
      byOrgObjective: new Map(),
    };
  }

  const indicatorIds = links.map(l => l.indicator_id);

  // Fetch full hierarchy for these indicators
  const { data: indicators, error: indError } = await supabase
    .from('indicators')
    .select(`
      id,
      name,
      tier,
      current_value,
      target_value,
      key_result_id
    `)
    .in('id', indicatorIds);
  
  if (indError) throw indError;
  if (!indicators || indicators.length === 0) {
    return {
      featureId: feature.id,
      featureName: feature.name,
      featureCategory: feature.category,
      featureStatus: feature.status,
      featureDescription: feature.description,
      totalIndicators: 0,
      totalKeyResults: 0,
      totalFunctionalObjectives: 0,
      totalDepartments: 0,
      totalOrgObjectives: 0,
      statusBreakdown: { green: 0, amber: 0, red: 0, notSet: 0 },
      indicators: [],
      byOrgObjective: new Map(),
    };
  }

  // Get unique key result IDs
  const krIds = [...new Set(indicators.filter(i => i.key_result_id).map(i => i.key_result_id!))];
  
  // Fetch key results
  const { data: keyResults, error: krError } = await supabase
    .from('key_results')
    .select('id, name, functional_objective_id, current_value, target_value')
    .in('id', krIds);
  
  if (krError) throw krError;

  // Get unique FO IDs
  const foIds = [...new Set((keyResults || []).filter(kr => kr.functional_objective_id).map(kr => kr.functional_objective_id!))];
  
  // Fetch functional objectives
  const { data: functionalObjectives, error: foError } = await supabase
    .from('functional_objectives')
    .select('id, name, department_id')
    .in('id', foIds);
  
  if (foError) throw foError;

  // Get unique department IDs
  const deptIds = [...new Set((functionalObjectives || []).filter(fo => fo.department_id).map(fo => fo.department_id!))];
  
  // Fetch departments
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id, name, org_objective_id')
    .in('id', deptIds);
  
  if (deptError) throw deptError;

  // Get unique org objective IDs
  const orgIds = [...new Set((departments || []).filter(d => d.org_objective_id).map(d => d.org_objective_id!))];
  
  // Fetch org objectives
  const { data: orgObjectives, error: orgError } = await supabase
    .from('org_objectives')
    .select('id, name, color')
    .in('id', orgIds);
  
  if (orgError) throw orgError;

  // Create lookup maps
  const krMap = new Map((keyResults || []).map(kr => [kr.id, kr]));
  const foMap = new Map((functionalObjectives || []).map(fo => [fo.id, fo]));
  const deptMap = new Map((departments || []).map(d => [d.id, d]));
  const orgMap = new Map((orgObjectives || []).map(o => [o.id, o]));

  // Build impact indicators with full hierarchy
  const impactIndicators: FeatureImpactIndicator[] = [];
  const statusBreakdown = { green: 0, amber: 0, red: 0, notSet: 0 };
  const uniqueKRs = new Set<string>();
  const uniqueFOs = new Set<string>();
  const uniqueDepts = new Set<string>();
  const uniqueOrgs = new Set<string>();

  for (const ind of indicators) {
    if (!ind.key_result_id) continue;
    
    const kr = krMap.get(ind.key_result_id);
    if (!kr || !kr.functional_objective_id) continue;
    
    const fo = foMap.get(kr.functional_objective_id);
    if (!fo || !fo.department_id) continue;
    
    const dept = deptMap.get(fo.department_id);
    if (!dept || !dept.org_objective_id) continue;
    
    const org = orgMap.get(dept.org_objective_id);
    if (!org) continue;

    // Calculate status
    const current = ind.current_value ? Number(ind.current_value) : null;
    const target = ind.target_value ? Number(ind.target_value) : null;
    const hasData = current != null && target != null && target > 0;
    const progress = hasData ? (current! / target!) * 100 : 0;
    const status: RAGStatus = hasData ? percentageToRAG(progress) : 'not-set';

    // Update status breakdown
    if (status === 'green') statusBreakdown.green++;
    else if (status === 'amber') statusBreakdown.amber++;
    else if (status === 'red') statusBreakdown.red++;
    else statusBreakdown.notSet++;

    // Track unique entities
    uniqueKRs.add(kr.id);
    uniqueFOs.add(fo.id);
    uniqueDepts.add(dept.id);
    uniqueOrgs.add(org.id);

    impactIndicators.push({
      id: ind.id,
      name: ind.name,
      tier: ind.tier,
      currentValue: current,
      targetValue: target,
      status,
      keyResultId: kr.id,
      keyResultName: kr.name,
      functionalObjectiveId: fo.id,
      functionalObjectiveName: fo.name,
      departmentId: dept.id,
      departmentName: dept.name,
      orgObjectiveId: org.id,
      orgObjectiveName: org.name,
      orgObjectiveColor: org.color,
    });
  }

  // Group by org objective hierarchy
  const byOrgObjective = new Map<string, {
    id: string;
    name: string;
    color: string;
    departments: Map<string, {
      id: string;
      name: string;
      functionalObjectives: Map<string, {
        id: string;
        name: string;
        keyResults: Map<string, {
          id: string;
          name: string;
          status: RAGStatus;
          indicators: FeatureImpactIndicator[];
        }>;
      }>;
    }>;
  }>();

  for (const ind of impactIndicators) {
    // Org objective level
    if (!byOrgObjective.has(ind.orgObjectiveId)) {
      byOrgObjective.set(ind.orgObjectiveId, {
        id: ind.orgObjectiveId,
        name: ind.orgObjectiveName,
        color: ind.orgObjectiveColor,
        departments: new Map(),
      });
    }
    const orgEntry = byOrgObjective.get(ind.orgObjectiveId)!;

    // Department level
    if (!orgEntry.departments.has(ind.departmentId)) {
      orgEntry.departments.set(ind.departmentId, {
        id: ind.departmentId,
        name: ind.departmentName,
        functionalObjectives: new Map(),
      });
    }
    const deptEntry = orgEntry.departments.get(ind.departmentId)!;

    // Functional objective level
    if (!deptEntry.functionalObjectives.has(ind.functionalObjectiveId)) {
      deptEntry.functionalObjectives.set(ind.functionalObjectiveId, {
        id: ind.functionalObjectiveId,
        name: ind.functionalObjectiveName,
        keyResults: new Map(),
      });
    }
    const foEntry = deptEntry.functionalObjectives.get(ind.functionalObjectiveId)!;

    // Key result level
    if (!foEntry.keyResults.has(ind.keyResultId)) {
      // Calculate KR status from its indicators
      const krIndicators = impactIndicators.filter(i => i.keyResultId === ind.keyResultId);
      const krStatuses = krIndicators.map(i => i.status).filter(s => s !== 'not-set');
      let krStatus: RAGStatus = 'not-set';
      if (krStatuses.length > 0) {
        const avgScore = krStatuses.reduce((sum, s) => sum + (s === 'green' ? 100 : s === 'amber' ? 60 : 30), 0) / krStatuses.length;
        krStatus = percentageToRAG(avgScore);
      }

      foEntry.keyResults.set(ind.keyResultId, {
        id: ind.keyResultId,
        name: ind.keyResultName,
        status: krStatus,
        indicators: [],
      });
    }
    foEntry.keyResults.get(ind.keyResultId)!.indicators.push(ind);
  }

  return {
    featureId: feature.id,
    featureName: feature.name,
    featureCategory: feature.category,
    featureStatus: feature.status,
    featureDescription: feature.description,
    totalIndicators: impactIndicators.length,
    totalKeyResults: uniqueKRs.size,
    totalFunctionalObjectives: uniqueFOs.size,
    totalDepartments: uniqueDepts.size,
    totalOrgObjectives: uniqueOrgs.size,
    statusBreakdown,
    indicators: impactIndicators,
    byOrgObjective,
  };
}

export function useFeatureImpact(featureId: string) {
  return useQuery({
    queryKey: ['feature-impact', featureId],
    queryFn: () => fetchFeatureImpact(featureId),
    enabled: !!featureId,
  });
}

// Fetch all features with their impact counts
export interface FeatureWithImpact {
  id: string;
  name: string;
  category: string | null;
  status: string | null;
  description: string | null;
  linkedIndicatorCount: number;
}

async function fetchFeaturesWithImpact(): Promise<FeatureWithImpact[]> {
  // Fetch all features
  const { data: features, error: featError } = await supabase
    .from('features')
    .select('id, name, category, status, description')
    .order('name');
  
  if (featError) throw featError;
  if (!features) return [];

  // Fetch all indicator links
  const { data: links, error: linksError } = await supabase
    .from('indicator_feature_links')
    .select('feature_id');
  
  if (linksError) throw linksError;

  // Count links per feature
  const linkCounts = new Map<string, number>();
  (links || []).forEach(link => {
    linkCounts.set(link.feature_id, (linkCounts.get(link.feature_id) || 0) + 1);
  });

  return features.map(f => ({
    id: f.id,
    name: f.name,
    category: f.category,
    status: f.status,
    description: f.description,
    linkedIndicatorCount: linkCounts.get(f.id) || 0,
  }));
}

export function useFeaturesWithImpact() {
  return useQuery({
    queryKey: ['features-with-impact'],
    queryFn: fetchFeaturesWithImpact,
  });
}
