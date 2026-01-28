import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgObjectiveById } from '@/hooks/useOrgObjectives';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { RAGBadge } from '@/components/RAGBadge';
import { CascadeFlowDiagram } from '@/components/CascadeFlowDiagram';
import { FunctionalObjectiveAccordion } from '@/components/FunctionalObjectiveAccordion';
import { DepartmentCard } from '@/components/DepartmentCard';
import { ImpactSummaryPanel } from '@/components/ImpactSummaryPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, X, BarChart3, Settings, Activity, Filter, Loader2 } from 'lucide-react';
import { RAGStatus, Department, FunctionalObjective } from '@/types/venture';
import { getOrgObjectiveColorClasses } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';

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

export default function OrgObjectiveDetail() {
  const { orgObjectiveId } = useParams<{ orgObjectiveId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') as RAGStatus | null;
  
  const { data: objective, isLoading } = useOrgObjectiveById(orgObjectiveId || '');
  const { data: customers = [] } = useCustomers();
  const { data: features = [] } = useFeatures();
  
  const [statusFilter, setStatusFilter] = useState<RAGStatus | 'all'>(initialFilter || 'all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
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
    setDepartmentFilter('all');
    setCustomerFilter('all');
    setFeatureFilter('all');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!objective) {
    return <Navigate to="/" replace />;
  }

  const displayHealth = initialFilter || objective.okrHealth;
  const colorClasses = getOrgObjectiveColorClasses(objective.color);
  const hasDepartments = objective.departments && objective.departments.length > 0;

  // Get stats from transformed UI structure
  const foCount = objective.departments.reduce((sum, d) => sum + d.functionalObjectives.length, 0);
  const krCount = objective.departments.reduce((sum, d) => 
    sum + d.functionalObjectives.reduce((s, fo) => s + fo.keyResults.length, 0), 0);
  const indicatorCount = objective.departments.reduce((sum, d) => 
    sum + d.functionalObjectives.reduce((s, fo) => 
      s + fo.keyResults.reduce((ks, kr) => ks + (kr.indicators?.length || 0), 0), 0), 0);

  // Check if any filter is active
  const hasActiveFilter = statusFilter !== 'all' || departmentFilter !== 'all' || customerFilter !== 'all' || featureFilter !== 'all';

  // Helper function to check if an indicator matches customer/feature filters
  const indicatorMatchesFilters = (ind: { linkedCustomerIds?: string[]; linkedFeatureIds?: string[] }) => {
    if (customerFilter !== 'all' && (!ind.linkedCustomerIds || !ind.linkedCustomerIds.includes(customerFilter))) {
      return false;
    }
    if (featureFilter !== 'all' && (!ind.linkedFeatureIds || !ind.linkedFeatureIds.includes(featureFilter))) {
      return false;
    }
    return true;
  };

  // Helper function to check if a KR matches filters
  const krMatchesFilters = (kr: { status: RAGStatus; indicators?: { linkedCustomerIds?: string[]; linkedFeatureIds?: string[] }[] }) => {
    // Status filter
    if (statusFilter !== 'all' && kr.status !== statusFilter) {
      return false;
    }
    // Customer/Feature filter - check if any indicator matches
    if (customerFilter !== 'all' || featureFilter !== 'all') {
      const hasMatchingIndicator = kr.indicators?.some(ind => indicatorMatchesFilters(ind)) ?? false;
      if (!hasMatchingIndicator) return false;
    }
    return true;
  };

  // Helper function to check if an FO matches filters
  const foMatchesFilters = (fo: FunctionalObjective) => {
    // Check status filter on FO itself
    if (statusFilter !== 'all' && fo.status === statusFilter) return true;
    // Check if any KR matches
    return fo.keyResults.some(kr => krMatchesFilters(kr));
  };

  // Filter functional objectives
  const filterFOs = (fos: FunctionalObjective[]): FunctionalObjective[] => {
    if (!hasActiveFilter) return fos;
    
    return fos.filter(fo => foMatchesFilters(fo)).map(fo => ({
      ...fo,
      keyResults: fo.keyResults.filter(kr => krMatchesFilters(kr)),
    })).filter(fo => fo.keyResults.length > 0 || (statusFilter !== 'all' && fo.status === statusFilter));
  };

  // Get filtered departments
  const filteredDepartments = hasDepartments
    ? objective.departments
        .filter(dept => departmentFilter === 'all' || dept.id === departmentFilter)
        .map(dept => ({
          ...dept,
          functionalObjectives: filterFOs(dept.functionalObjectives),
        }))
        .filter(dept => dept.functionalObjectives.length > 0)
    : [];

  // Get filtered FOs for non-department view
  const allFOs = hasDepartments
    ? objective.departments.flatMap(d => d.functionalObjectives)
    : objective.functionalObjectives || [];
  const filteredFOs = filterFOs(allFOs);

  // Calculate KR status breakdown
  const statusCounts = { green: 0, amber: 0, red: 0 };
  allFOs.forEach(fo => {
    fo.keyResults.forEach(kr => {
      if (kr.status === 'green' || kr.status === 'amber' || kr.status === 'red') {
        statusCounts[kr.status]++;
      }
    });
  });

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <DrilldownBreadcrumb 
        items={[
          { label: 'Portfolio', href: '/' },
          { label: objective.name }
        ]} 
      />

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

      {/* Org Objective Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('p-2 rounded-lg', colorClasses.bg)}>
              <Target className={cn('h-5 w-5', colorClasses.text)} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{objective.name}</h1>
            <Badge 
              variant={objective.classification === 'CORE' ? 'default' : 'secondary'}
            >
              {objective.classification}
            </Badge>
            <RAGBadge status={displayHealth} size="lg" showLabel pulse />
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {objective.departments.length} Departments • {foCount} Functional Objectives • {krCount} Key Results • {indicatorCount} Indicators
          </p>
        </div>
      </div>

      {/* Cascade Flow Diagram */}
      <CascadeFlowDiagram
        orgObjectiveId={orgObjectiveId!}
        featureHealth={objective.okrHealth}
        customerHealth={objective.okrHealth}
        okrHealth={objective.okrHealth}
        overallHealth={displayHealth}
        filterStatus={initialFilter}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{objective.departments.length}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{foCount}</p>
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
                <p className="text-2xl font-bold">{krCount}</p>
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
                <p className="text-2xl font-bold">{indicatorCount}</p>
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
                  {statusCounts.green}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rag-amber" />
                  {statusCounts.amber}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rag-red" />
                  {statusCounts.red}
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

        {/* Department Filter */}
        {hasDepartments && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {objective.departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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

      {/* Impact Summary Panel with Flow/List views */}
      {(customerFilter !== 'all' || featureFilter !== 'all') && (
        <div className="space-y-4">
          {customerFilter !== 'all' && (
            <ImpactSummaryPanel
              filterType="customer"
              filterName={customers.find(c => c.id === customerFilter)?.name || 'Unknown'}
              filterId={customerFilter}
              departments={objective.departments}
              orgObjectiveId={orgObjectiveId!}
              orgObjectiveName={objective.name}
            />
          )}
          {featureFilter !== 'all' && (
            <ImpactSummaryPanel
              filterType="feature"
              filterName={features.find(f => f.id === featureFilter)?.name || 'Unknown'}
              filterId={featureFilter}
              departments={objective.departments}
              orgObjectiveId={orgObjectiveId!}
              orgObjectiveName={objective.name}
            />
          )}
        </div>
      )}

      {/* OKR Content */}
      <div className="space-y-6">
        {hasDepartments ? (
          <Accordion type="multiple" className="w-full space-y-4">
            {filteredDepartments.map(dept => (
              <DepartmentCard 
                key={dept.id} 
                department={dept} 
                orgObjectiveId={orgObjectiveId!} 
                orgColor={objective.color}
              />
            ))}
          </Accordion>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4">
            {filteredFOs.map(fo => (
              <FunctionalObjectiveAccordion 
                key={fo.id} 
                functionalObjective={fo} 
                orgObjectiveId={orgObjectiveId!}
                orgColor={objective.color}
              />
            ))}
          </Accordion>
        )}
        
        {((hasDepartments && filteredDepartments.length === 0) || (!hasDepartments && filteredFOs.length === 0)) && (
          <Card className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No items match this filter</h3>
            <p className="text-muted-foreground">
              Try selecting different filter options.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
