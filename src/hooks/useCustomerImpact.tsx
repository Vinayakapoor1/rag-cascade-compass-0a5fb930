import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RAGStatus } from '@/types/venture';
import { percentageToRAG } from '@/lib/formulaUtils';

export interface CustomerImpactIndicator {
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

export interface CustomerImpactSummary {
  customerId: string;
  customerName: string;
  customerTier: string;
  customerRegion: string | null;
  customerIndustry: string | null;
  customerStatus: string;
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
  indicators: CustomerImpactIndicator[];
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
          indicators: CustomerImpactIndicator[];
        }>;
      }>;
    }>;
  }>;
}

async function fetchCustomerImpact(customerId: string): Promise<CustomerImpactSummary | null> {
  // Fetch customer details
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();
  
  if (customerError || !customer) return null;

  // Fetch all indicator links for this customer
  const { data: links, error: linksError } = await supabase
    .from('indicator_customer_links')
    .select('indicator_id')
    .eq('customer_id', customerId);
  
  if (linksError) throw linksError;
  if (!links || links.length === 0) {
    return {
      customerId: customer.id,
      customerName: customer.name,
      customerTier: customer.tier,
      customerRegion: customer.region,
      customerIndustry: customer.industry,
      customerStatus: customer.status,
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
      customerId: customer.id,
      customerName: customer.name,
      customerTier: customer.tier,
      customerRegion: customer.region,
      customerIndustry: customer.industry,
      customerStatus: customer.status,
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
  const impactIndicators: CustomerImpactIndicator[] = [];
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
          indicators: CustomerImpactIndicator[];
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
    customerId: customer.id,
    customerName: customer.name,
    customerTier: customer.tier,
    customerRegion: customer.region,
    customerIndustry: customer.industry,
    customerStatus: customer.status,
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

export function useCustomerImpact(customerId: string) {
  return useQuery({
    queryKey: ['customer-impact', customerId],
    queryFn: () => fetchCustomerImpact(customerId),
    enabled: !!customerId,
  });
}

// Fetch all customers with their impact counts
export interface TrendDataPoint {
  period: string;
  score: number;
}

export interface CustomerWithImpact {
  id: string;
  name: string;
  tier: string;
  region: string | null;
  industry: string | null;
  status: string;
  linkedIndicatorCount: number;
  linkedIndicatorIds: string[];
  ragStatus: RAGStatus;
  logoUrl: string | null;
  deploymentType: string | null;
  trendData: TrendDataPoint[];
  csmName: string | null;
}

async function fetchCustomersWithImpact(): Promise<CustomerWithImpact[]> {
  // Fetch all customers, CSMs, customer_features, and indicator_feature_links in parallel
  const [customersResult, csmsResult, cfResult, iflResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, tier, region, industry, status, logo_url, deployment_type, csm_id')
      .order('name'),
    supabase
      .from('csms')
      .select('id, name'),
    supabase
      .from('customer_features')
      .select('customer_id, feature_id'),
    supabase
      .from('indicator_feature_links')
      .select('feature_id, indicator_id'),
  ]);
  
  if (customersResult.error) throw customersResult.error;
  if (!customersResult.data) return [];
  
  const customers = customersResult.data;
  const csmMap = new Map((csmsResult.data || []).map(c => [c.id, c.name]));

  // Build feature -> indicator mapping
  const featureToIndicators = new Map<string, Set<string>>();
  (iflResult.data || []).forEach(link => {
    if (!featureToIndicators.has(link.feature_id)) {
      featureToIndicators.set(link.feature_id, new Set());
    }
    featureToIndicators.get(link.feature_id)!.add(link.indicator_id);
  });

  // Build customer -> indicator set (derived through features)
  const customerIndicatorMap = new Map<string, Set<string>>();
  (cfResult.data || []).forEach(cf => {
    const indicators = featureToIndicators.get(cf.feature_id);
    if (indicators) {
      if (!customerIndicatorMap.has(cf.customer_id)) {
        customerIndicatorMap.set(cf.customer_id, new Set());
      }
      const custSet = customerIndicatorMap.get(cf.customer_id)!;
      indicators.forEach(indId => custSet.add(indId));
    }
  });

  // Collect all unique indicator IDs across all customers
  const allIndicatorIds = new Set<string>();
  customerIndicatorMap.forEach(indSet => indSet.forEach(id => allIndicatorIds.add(id)));

  // Fetch indicator data for RAG calculation
  let indicatorDataMap = new Map<string, { current_value: number | null; target_value: number | null }>();
  if (allIndicatorIds.size > 0) {
    const idArray = [...allIndicatorIds];
    // Fetch in batches of 500 to avoid query limits
    for (let i = 0; i < idArray.length; i += 500) {
      const batch = idArray.slice(i, i + 500);
      const { data: indData } = await supabase
        .from('indicators')
        .select('id, current_value, target_value')
        .in('id', batch);
      (indData || []).forEach(ind => {
        indicatorDataMap.set(ind.id, { current_value: ind.current_value, target_value: ind.target_value });
      });
    }
  }

  // Calculate RAG status per customer from derived indicators
  const customerData = new Map<string, { count: number; statuses: RAGStatus[] }>();
  customerIndicatorMap.forEach((indSet, custId) => {
    const statuses: RAGStatus[] = [];
    indSet.forEach(indId => {
      const ind = indicatorDataMap.get(indId);
      if (ind && ind.current_value != null && ind.target_value != null && ind.target_value > 0) {
        const progress = (ind.current_value / ind.target_value) * 100;
        statuses.push(percentageToRAG(progress));
      }
    });
    customerData.set(custId, { count: indSet.size, statuses });
  });

  // Fetch trend data from indicator_history for linked indicators
  const customerTrendData = new Map<string, TrendDataPoint[]>();
  
  if (allIndicatorIds.size > 0) {
    const allLinkedIndicatorIds = [...allIndicatorIds];
    const { data: historyData } = await supabase
      .from('indicator_history')
      .select('indicator_id, period, value')
      .in('indicator_id', allLinkedIndicatorIds.slice(0, 1000))
      .order('period', { ascending: true });

    if (historyData && historyData.length > 0) {
      // Build indicator -> customer mapping
      const indicatorToCustomers = new Map<string, string[]>();
      customerIndicatorMap.forEach((indSet, custId) => {
        indSet.forEach(indId => {
          if (!indicatorToCustomers.has(indId)) {
            indicatorToCustomers.set(indId, []);
          }
          indicatorToCustomers.get(indId)!.push(custId);
        });
      });

      const customerPeriodScores = new Map<string, Map<string, number[]>>();
      
      for (const entry of historyData) {
        if (!entry.indicator_id) continue;
        const custIds = indicatorToCustomers.get(entry.indicator_id) || [];
        for (const custId of custIds) {
          if (!customerPeriodScores.has(custId)) {
            customerPeriodScores.set(custId, new Map());
          }
          const periods = customerPeriodScores.get(custId)!;
          if (!periods.has(entry.period)) {
            periods.set(entry.period, []);
          }
          periods.get(entry.period)!.push(entry.value);
        }
      }

      for (const [custId, periods] of customerPeriodScores) {
        const sortedPeriods = [...periods.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6);
        
        customerTrendData.set(custId, sortedPeriods.map(([period, values]) => ({
          period,
          score: values.reduce((a, b) => a + b, 0) / values.length,
        })));
      }
    }
  }

  return customers.map(c => {
    const data = customerData.get(c.id);
    const linkedCount = data?.count || 0;
    
    let ragStatus: RAGStatus = 'not-set';
    if (data && data.statuses.length > 0) {
      const avgScore = data.statuses.reduce((sum, s) => {
        return sum + (s === 'green' ? 100 : s === 'amber' ? 60 : s === 'red' ? 30 : 0);
      }, 0) / data.statuses.length;
      ragStatus = percentageToRAG(avgScore);
    }

    return {
      id: c.id,
      name: c.name,
      tier: c.tier,
      region: c.region,
      industry: c.industry,
      status: c.status,
      linkedIndicatorCount: linkedCount,
      linkedIndicatorIds: data ? [...customerIndicatorMap.get(c.id) || []] : [],
      ragStatus,
      logoUrl: c.logo_url,
      deploymentType: c.deployment_type,
      trendData: customerTrendData.get(c.id) || [],
      csmName: c.csm_id ? (csmMap.get(c.csm_id) || null) : null,
    };
  });
}

export function useCustomersWithImpact() {
  return useQuery({
    queryKey: ['customers-with-impact'],
    queryFn: fetchCustomersWithImpact,
  });
}
