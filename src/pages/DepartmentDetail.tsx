import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { RAGBadge } from '@/components/RAGBadge';
import { CalculationBreakdownDialog } from '@/components/CalculationBreakdownDialog';


import { OKRHierarchyLegend } from '@/components/OKRHierarchyLegend';
import { RAGLegend } from '@/components/RAGLegend';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2, BarChart3, Settings, Activity, Filter, X, Loader2, Target, Info, Clock } from 'lucide-react';
import { RAGStatus, OrgObjectiveColor } from '@/types/venture';
import { getOrgObjectiveColorClasses, scoreToRAG } from '@/lib/ragUtils';
import { parseFormulaType, aggregateProgress, progressToRAG } from '@/lib/formulaCalculations';
import { cn } from '@/lib/utils';

interface DBIndicator {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  tier: string;
  unit: string | null;
  last_updated_at?: string | null;
  last_updated_by?: string | null;
}

interface DBKeyResult {
  id: string;
  name: string;
  owner: string | null;
  formula: string | null;
  indicators: DBIndicator[];
}

interface DBFunctionalObjective {
  id: string;
  name: string;
  owner: string | null;
  formula: string | null;
  key_results: DBKeyResult[];
}

interface DBDepartment {
  id: string;
  name: string;
  owner: string | null;
  color: string | null;
  org_objective_id: string | null;
  org_objectives: {
    id: string;
    name: string;
    color: string;
    classification: string;
  } | null;
  functional_objectives: DBFunctionalObjective[];
}

// Extended types with parent info
interface ExtendedKR extends DBKeyResult {
  parentFOName: string;
}

interface ExtendedIndicator extends DBIndicator {
  parentKRName: string;
}

// Fetch department with all nested data including formulas
function useDepartmentById(departmentId: string) {
  return useQuery({
    queryKey: ['department', departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          owner,
          color,
          org_objective_id,
          org_objectives (
            id,
            name,
            color,
            classification
          ),
          functional_objectives (
            id,
            name,
            owner,
            formula,
            key_results (
              id,
              name,
              owner,
              formula,
              indicators (
                id,
                name,
                current_value,
                target_value,
                tier,
                unit
              )
            )
          )
        `)
        .eq('id', departmentId)
        .single();

      if (error) throw error;
      return data as DBDepartment;
    },
    enabled: !!departmentId,
  });
}

// Fetch customers for filter
function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch features for filter
function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch indicator-customer links
function useIndicatorCustomerLinks() {
  return useQuery({
    queryKey: ['indicator-customer-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicator_customer_links')
        .select('indicator_id, customer_id');
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch indicator-feature links
function useIndicatorFeatureLinks() {
  return useQuery({
    queryKey: ['indicator-feature-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicator_feature_links')
        .select('indicator_id, feature_id');
      if (error) throw error;
      return data || [];
    },
  });
}

// Calculate indicator status
function calculateIndicatorStatus(ind: DBIndicator): RAGStatus {
  if (ind.current_value === null || ind.target_value === null || ind.target_value <= 0) {
    return 'not-set';
  }
  if (ind.current_value === 0) {
    return 'not-set';
  }
  const progress = (ind.current_value / ind.target_value) * 100;
  return progressToRAG(progress);
}

// Calculate KR status from indicators using stored formula
function calculateKRStatus(kr: DBKeyResult): RAGStatus {
  const indicators = kr.indicators || [];
  if (indicators.length === 0) return 'not-set';

  const progressValues: number[] = [];
  let hasData = false;

  indicators.forEach(ind => {
    if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
      if (ind.current_value > 0) hasData = true;
      const progress = (ind.current_value / ind.target_value) * 100;
      progressValues.push(progress);
    }
  });

  if (!hasData || progressValues.length === 0) return 'not-set';

  // Use stored formula for aggregation
  const formulaType = parseFormulaType(kr.formula);
  const aggregatedProgress = aggregateProgress(progressValues, formulaType);

  return progressToRAG(aggregatedProgress);
}

// Calculate FO status from KRs using stored formula
function calculateFOStatus(fo: DBFunctionalObjective): RAGStatus {
  const krs = fo.key_results || [];
  if (krs.length === 0) return 'not-set';

  const krProgresses: number[] = [];
  let hasData = false;

  krs.forEach(kr => {
    const indProgresses: number[] = [];
    kr.indicators?.forEach(ind => {
      if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
        if (ind.current_value > 0) hasData = true;
        const progress = (ind.current_value / ind.target_value) * 100;
        indProgresses.push(progress);
      }
    });

    if (indProgresses.length > 0) {
      // Aggregate indicators using KR's formula
      const krFormulaType = parseFormulaType(kr.formula);
      const krProgress = aggregateProgress(indProgresses, krFormulaType);
      krProgresses.push(krProgress);
    }
  });

  if (!hasData || krProgresses.length === 0) return 'not-set';

  // Aggregate KRs using FO's formula
  const foFormulaType = parseFormulaType(fo.formula);
  const aggregatedProgress = aggregateProgress(krProgresses, foFormulaType);

  return progressToRAG(aggregatedProgress);
}

// Calculate FO percentage using stored formula
function calculateFOPercentage(fo: DBFunctionalObjective): number {
  const krs = fo.key_results || [];
  if (krs.length === 0) return 0;

  const krProgresses: number[] = [];

  krs.forEach(kr => {
    const indProgresses: number[] = [];
    kr.indicators?.forEach(ind => {
      if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
        const progress = (ind.current_value / ind.target_value) * 100;
        indProgresses.push(progress);
      }
    });

    if (indProgresses.length > 0) {
      // Aggregate indicators using KR's formula
      const krFormulaType = parseFormulaType(kr.formula);
      const krProgress = aggregateProgress(indProgresses, krFormulaType);
      krProgresses.push(krProgress);
    }
  });

  if (krProgresses.length === 0) return 0;

  // Aggregate KRs using FO's formula
  const foFormulaType = parseFormulaType(fo.formula);
  return aggregateProgress(krProgresses, foFormulaType);
}

// Calculate department overall status using stored formulas
function calculateDepartmentStatus(dept: DBDepartment): RAGStatus {
  const fos = dept.functional_objectives || [];
  if (fos.length === 0) return 'not-set';

  const foProgresses: number[] = [];
  let hasData = false;

  fos.forEach(fo => {
    const foProgress = calculateFOPercentage(fo);
    if (foProgress > 0) {
      hasData = true;
      foProgresses.push(foProgress);
    }
  });

  if (!hasData || foProgresses.length === 0) return 'not-set';

  // Departments use simple average of FO progress
  const avgProgress = aggregateProgress(foProgresses, 'AVG');
  return progressToRAG(avgProgress);
}

// Shared utility functions for stat blocks
const getProgressColorClass = (s: RAGStatus) => {
  switch (s) {
    case 'green': return '[&>div]:bg-rag-green';
    case 'amber': return '[&>div]:bg-rag-amber';
    case 'red': return '[&>div]:bg-rag-red';
    default: return '[&>div]:bg-muted';
  }
};

const getBorderColorClass = (s: RAGStatus) => {
  switch (s) {
    case 'green': return 'border-l-rag-green';
    case 'amber': return 'border-l-rag-amber';
    case 'red': return 'border-l-rag-red';
    default: return 'border-l-muted-foreground/30';
  }
};

// FO Stat Block Component
function FOStatBlock({
  fo,
  filterStatus
}: {
  fo: DBFunctionalObjective;
  filterStatus: RAGStatus | null;
}) {
  const status = calculateFOStatus(fo);
  const percentage = calculateFOPercentage(fo);
  const displayStatus = filterStatus || status;
  const krCount = fo.key_results?.length || 0;
  const kpiCount = fo.key_results?.reduce((sum, kr) => sum + (kr.indicators?.length || 0), 0) || 0;

  return (
    <Card className={`border-l-4 h-full ${getBorderColorClass(displayStatus)}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-muted flex-shrink-0">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-sm leading-snug">{fo.name}</h3>
              <CalculationBreakdownDialog
                entityType="FO"
                entityId={fo.id}
                entityName={fo.name}
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{krCount} KRs</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{kpiCount} KPIs</span>
            </div>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <RAGBadge status={displayStatus} size="sm" />
            <span className="text-lg font-bold">{Math.round(percentage)}%</span>
          </div>
        </div>

        <Progress
          value={Math.min(percentage, 100)}
          className={`h-2 ${getProgressColorClass(displayStatus)}`}
        />
      </CardContent>
    </Card>
  );
}

// KR Stat Block Component (flat view - no parent label)
function KRStatBlock({
  kr,
  filterStatus
}: {
  kr: DBKeyResult;
  filterStatus: RAGStatus | null;
}) {
  const status = calculateKRStatus(kr);
  const displayStatus = filterStatus || status;
  const kpiCount = kr.indicators?.length || 0;

  // Calculate percentage
  let totalProgress = 0;
  let count = 0;
  kr.indicators?.forEach(ind => {
    if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
      const progress = (ind.current_value / ind.target_value) * 100;
      totalProgress += progress;
      count++;
    }
  });
  const percentage = count > 0 ? totalProgress / count : 0;

  return (
    <Card className={`border-l-4 h-full ${getBorderColorClass(displayStatus)}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-muted flex-shrink-0">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-sm leading-snug">{kr.name}</h3>
              <CalculationBreakdownDialog
                entityType="KR"
                entityId={kr.id}
                entityName={kr.name}
              />
            </div>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <RAGBadge status={displayStatus} size="sm" />
            <span className="text-lg font-bold">{Math.round(percentage)}%</span>
          </div>
        </div>

        <Progress
          value={Math.min(percentage, 100)}
          className={`h-2 ${getProgressColorClass(displayStatus)}`}
        />
      </CardContent>
    </Card>
  );
}

// Indicator Stat Block Component (flat view - no parent label)
function IndicatorStatBlock({
  ind,
  filterStatus
}: {
  ind: DBIndicator;
  filterStatus: RAGStatus | null;
}) {
  const status = calculateIndicatorStatus(ind);
  const displayStatus = filterStatus || status;

  const percentage = ind.current_value !== null && ind.target_value !== null && ind.target_value > 0
    ? (ind.current_value / ind.target_value) * 100
    : 0;

  return (
    <Card className={`border-l-4 h-full ${getBorderColorClass(displayStatus)}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-muted flex-shrink-0">
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-sm leading-snug">{ind.name}</h3>
              <CalculationBreakdownDialog
                entityType="KPI"
                entityId={ind.id}
                entityName={ind.name}
                kpiData={{
                  currentValue: ind.current_value,
                  targetValue: ind.target_value,
                  unit: ind.unit
                }}
              />
            </div>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <RAGBadge status={displayStatus} size="sm" />
            <span className="text-lg font-bold">{Math.round(percentage)}%</span>
          </div>
        </div>

        <Progress
          value={Math.min(percentage, 100)}
          className={`h-2 ${getProgressColorClass(displayStatus)}`}
        />
      </CardContent>
    </Card>
  );
}

export default function DepartmentDetail() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') as RAGStatus | null;

  const { data: department, isLoading } = useDepartmentById(departmentId || '');
  const { data: customers = [] } = useCustomers();
  const { data: features = [] } = useFeatures();
  const { data: customerLinks = [] } = useIndicatorCustomerLinks();
  const { data: featureLinks = [] } = useIndicatorFeatureLinks();

  const [statusFilter, setStatusFilter] = useState<RAGStatus | 'all'>(initialFilter || 'all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');


  // Sync filter state if URL param changes
  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  const clearFilter = () => {
    setSearchParams({});
    setStatusFilter('all');
    setCustomerFilter('all');
    setFeatureFilter('all');
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!department) return { foCount: 0, krCount: 0, kpiCount: 0, statusCounts: { green: 0, amber: 0, red: 0 } };

    const foCount = department.functional_objectives?.length || 0;
    const krCount = department.functional_objectives?.reduce((sum, fo) => sum + (fo.key_results?.length || 0), 0) || 0;
    const kpiCount = department.functional_objectives?.reduce((sum, fo) =>
      sum + fo.key_results?.reduce((s, kr) => s + (kr.indicators?.length || 0), 0) || 0, 0) || 0;

    const statusCounts = { green: 0, amber: 0, red: 0 };
    department.functional_objectives?.forEach(fo => {
      fo.key_results?.forEach(kr => {
        const status = calculateKRStatus(kr);
        if (status === 'green' || status === 'amber' || status === 'red') {
          statusCounts[status]++;
        }
      });
    });

    return { foCount, krCount, kpiCount, statusCounts };
  }, [department]);

  // Get indicator IDs linked to selected customer
  const indicatorIdsForCustomer = useMemo(() => {
    if (customerFilter === 'all') return null;
    return new Set(
      customerLinks
        .filter(link => link.customer_id === customerFilter)
        .map(link => link.indicator_id)
    );
  }, [customerLinks, customerFilter]);

  // Get indicator IDs linked to selected feature
  const indicatorIdsForFeature = useMemo(() => {
    if (featureFilter === 'all') return null;
    return new Set(
      featureLinks
        .filter(link => link.feature_id === featureFilter)
        .map(link => link.indicator_id)
    );
  }, [featureLinks, featureFilter]);

  // Get all KRs with parent FO name
  const allKRs = useMemo((): ExtendedKR[] => {
    if (!department?.functional_objectives) return [];
    return department.functional_objectives.flatMap(fo =>
      (fo.key_results || []).map(kr => ({ ...kr, parentFOName: fo.name }))
    );
  }, [department]);

  // Get all indicators with parent KR name
  const allIndicators = useMemo((): ExtendedIndicator[] => {
    return allKRs.flatMap(kr =>
      (kr.indicators || []).map(ind => ({ ...ind, parentKRName: kr.name }))
    );
  }, [allKRs]);

  // Filter indicators based on all filters
  const filteredIndicators = useMemo(() => {
    let result = allIndicators;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(ind => calculateIndicatorStatus(ind) === statusFilter);
    }

    // Customer filter
    if (indicatorIdsForCustomer) {
      result = result.filter(ind => indicatorIdsForCustomer.has(ind.id));
    }

    // Feature filter
    if (indicatorIdsForFeature) {
      result = result.filter(ind => indicatorIdsForFeature.has(ind.id));
    }

    return result;
  }, [allIndicators, statusFilter, indicatorIdsForCustomer, indicatorIdsForFeature]);

  // Filter KRs - cascade from indicators when customer/feature filter is active
  const filteredKRs = useMemo(() => {
    const hasCustomerOrFeatureFilter = customerFilter !== 'all' || featureFilter !== 'all';

    if (hasCustomerOrFeatureFilter) {
      // Get KR names that have matching indicators
      const validKRNames = new Set(filteredIndicators.map(ind => ind.parentKRName));
      let result = allKRs.filter(kr => validKRNames.has(kr.name));

      // Also apply status filter at KR level
      if (statusFilter !== 'all') {
        result = result.filter(kr => calculateKRStatus(kr) === statusFilter);
      }
      return result;
    }

    // Just status filter
    if (statusFilter !== 'all') {
      return allKRs.filter(kr => calculateKRStatus(kr) === statusFilter);
    }

    return allKRs;
  }, [allKRs, statusFilter, customerFilter, featureFilter, filteredIndicators]);

  // Filter FOs - cascade from KRs
  const filteredFOs = useMemo(() => {
    if (!department?.functional_objectives) return [];

    const hasCustomerOrFeatureFilter = customerFilter !== 'all' || featureFilter !== 'all';

    if (hasCustomerOrFeatureFilter) {
      // Get FO names that have matching KRs
      const validFONames = new Set(filteredKRs.map(kr => kr.parentFOName));
      let result = department.functional_objectives.filter(fo => validFONames.has(fo.name));

      // Also apply status filter at FO level
      if (statusFilter !== 'all') {
        result = result.filter(fo => calculateFOStatus(fo) === statusFilter);
      }
      return result;
    }

    // Just status filter
    if (statusFilter !== 'all') {
      return department.functional_objectives.filter(fo => calculateFOStatus(fo) === statusFilter);
    }

    return department.functional_objectives;
  }, [department, statusFilter, customerFilter, featureFilter, filteredKRs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!department) {
    return <Navigate to="/" replace />;
  }

  const departmentStatus = calculateDepartmentStatus(department);
  const displayHealth = initialFilter || departmentStatus;
  const colorClasses = getOrgObjectiveColorClasses((department.color || department.org_objectives?.color || 'green') as OrgObjectiveColor);
  const hasActiveFilter = statusFilter !== 'all' || customerFilter !== 'all' || featureFilter !== 'all';

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <DrilldownBreadcrumb
        items={[
          { label: 'Portfolio', href: '/' },
          { label: department.name }
        ]}
      />

      {/* Legends */}
      <div className="flex items-end justify-end gap-3 flex-wrap">
        <OKRHierarchyLegend />
        <RAGLegend />
      </div>

      {/* Filter Banner */}
      {initialFilter && (
        <div className={cn(
          'flex items-center justify-between p-3 rounded-lg border',
          initialFilter === 'green' && 'bg-rag-green-muted/30 border-rag-green',
          initialFilter === 'amber' && 'bg-rag-amber-muted/30 border-rag-amber',
          initialFilter === 'red' && 'bg-rag-red-muted/30 border-rag-red'
        )}>
          <div className="flex items-center gap-2">
            <RAGBadge status={initialFilter} size="sm" showLabel />
            <span className="text-sm">Showing only {initialFilter === 'green' ? 'On Track' : initialFilter === 'amber' ? 'At Risk' : 'Critical'} items</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilter} className="gap-1">
            <X className="h-4 w-4" />
            Clear Filter
          </Button>
        </div>
      )}

      {/* Department Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('p-2 rounded-lg', colorClasses.bg)}>
              <Building2 className={cn('h-5 w-5', colorClasses.text)} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{department.name}</h1>
            <RAGBadge status={displayHealth} size="lg" showLabel pulse />
          </div>
          {department.owner && (
            <p className="text-sm text-muted-foreground mt-1">Owner: {department.owner}</p>
          )}
          {department.org_objectives && (
            <div className="flex items-center gap-2 mt-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Part of: <span className="font-medium text-foreground">{department.org_objectives.name}</span>
              </span>
              <span className="text-xs px-2 py-0.5 bg-muted rounded">
                {department.org_objectives.classification}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.foCount}</p>
                <p className="text-xs text-muted-foreground">Functional Objectives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.krCount}</p>
                <p className="text-xs text-muted-foreground">Key Results</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.kpiCount}</p>
                <p className="text-xs text-muted-foreground">KPIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground mb-1">KR Status Breakdown</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rag-green" />
                  {stats.statusCounts.green}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rag-amber" />
                  {stats.statusCounts.amber}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rag-red" />
                  {stats.statusCounts.red}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Status Filter */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as RAGStatus | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger
              value="green"
              className="gap-1.5 data-[state=active]:bg-rag-green-muted data-[state=active]:text-rag-green"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rag-green" />
              On Track
            </TabsTrigger>
            <TabsTrigger
              value="amber"
              className="gap-1.5 data-[state=active]:bg-rag-amber-muted data-[state=active]:text-rag-amber"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rag-amber" />
              At Risk
            </TabsTrigger>
            <TabsTrigger
              value="red"
              className="gap-1.5 data-[state=active]:bg-rag-red-muted data-[state=active]:text-rag-red"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rag-red" />
              Critical
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Customer Filter */}
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Feature Filter */}
        <Select value={featureFilter} onValueChange={setFeatureFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Features" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Features</SelectItem>
            {features.map(feature => (
              <SelectItem key={feature.id} value={feature.id}>
                {feature.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>


        {/* Clear Filters */}
        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilter} className="gap-1">
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Objective Hierarchy - Horizontal Tree Layout */}
      <div className="overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Objective Hierarchy</h2>
        {filteredFOs.length > 0 ? (
          <div className="space-y-4 min-w-max pb-4">
            {filteredFOs.map(fo => {
              const foKRs = filteredKRs.filter(kr => kr.parentFOName === fo.name);

              return (
                <div key={fo.id} className="flex items-stretch">
                  {/* Column 1: FO Card - stretches to match children */}
                  <div className="w-80 flex-shrink-0 flex">
                    <div className="flex-1">
                      <FOStatBlock fo={fo} filterStatus={statusFilter === 'all' ? null : statusFilter} />
                    </div>
                  </div>

                  {/* Horizontal connector from FO to KRs */}
                  {foKRs.length > 0 && (
                    <>
                      <div className="flex items-center">
                        <div className="w-4 h-px bg-border" />
                      </div>

                      {/* Column 2: KRs stacked vertically */}
                      <div className="flex flex-col gap-2">
                        {foKRs.map((kr, krIdx) => {
                          const krIndicators = filteredIndicators.filter(ind => ind.parentKRName === kr.name);

                          return (
                            <div key={kr.id} className="flex items-stretch">
                              {/* Vertical line connecting KRs + node */}
                              <div className="relative flex items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary/50 border-2 border-background z-10" />
                                {krIdx > 0 && (
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-1/2 w-px h-full bg-border" />
                                )}
                                {krIdx < foKRs.length - 1 && (
                                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-px h-full bg-border" />
                                )}
                              </div>

                              {/* Short horizontal connector to KR card */}
                              <div className="flex items-center">
                                <div className="w-3 h-px bg-border" />
                              </div>

                              {/* KR Card */}
                              <div className="w-80 flex-shrink-0">
                                <KRStatBlock kr={kr} filterStatus={statusFilter === 'all' ? null : statusFilter} />
                              </div>

                              {/* Horizontal connector from KR to KPIs */}
                              {krIndicators.length > 0 && (
                                <>
                                  <div className="flex items-center">
                                    <div className="w-4 h-px bg-border" />
                                  </div>

                                  {/* Column 3: KPIs stacked vertically */}
                                  <div className="flex flex-col gap-1.5">
                                    {krIndicators.map((ind, indIdx) => (
                                      <div key={ind.id} className="flex items-stretch">
                                        {/* Vertical line connecting KPIs + node */}
                                        <div className="relative flex items-center">
                                          <div className="w-2 h-2 rounded-full bg-muted-foreground/50 z-10" />
                                          {indIdx > 0 && (
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-1/2 w-px h-full bg-border" />
                                          )}
                                          {indIdx < krIndicators.length - 1 && (
                                            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-px h-full bg-border" />
                                          )}
                                        </div>

                                        {/* Short horizontal connector to KPI card */}
                                        <div className="flex items-center">
                                          <div className="w-2 h-px bg-border" />
                                        </div>

                                        {/* KPI Card */}
                                        <div className="w-80 flex-shrink-0">
                                          <IndicatorStatBlock ind={ind} filterStatus={statusFilter === 'all' ? null : statusFilter} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No functional objectives match the current filter</p>
          </Card>
        )}
      </div>
    </div>
  );
}
