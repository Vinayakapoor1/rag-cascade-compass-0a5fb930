import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RAGBadge } from '@/components/RAGBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  BarChart3, 
  Settings, 
  Activity, 
  ChevronDown, 
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown
} from 'lucide-react';
import { RAGStatus } from '@/types/venture';
import { scoreToRAG } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';

interface DBIndicator {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  tier: string;
  unit: string | null;
}

interface DBKeyResult {
  id: string;
  name: string;
  owner: string | null;
  indicators: DBIndicator[];
}

interface DBFunctionalObjective {
  id: string;
  name: string;
  owner: string | null;
  key_results: DBKeyResult[];
}

interface HierarchyFunnelViewProps {
  functionalObjectives: DBFunctionalObjective[];
  statusFilter: RAGStatus | 'all';
  filteredKRNames?: Set<string>;
  filteredIndicatorIds?: Set<string>;
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
  return scoreToRAG(progress);
}

// Calculate KR status from indicators
function calculateKRStatus(kr: DBKeyResult): RAGStatus {
  const indicators = kr.indicators || [];
  if (indicators.length === 0) return 'not-set';
  
  let totalProgress = 0;
  let count = 0;
  let hasData = false;
  
  indicators.forEach(ind => {
    if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
      if (ind.current_value > 0) hasData = true;
      const progress = (ind.current_value / ind.target_value) * 100;
      totalProgress += progress;
      count++;
    }
  });
  
  if (!hasData) return 'not-set';
  if (count === 0) return 'not-set';
  
  return scoreToRAG(totalProgress / count);
}

// Calculate FO status from KRs
function calculateFOStatus(fo: DBFunctionalObjective): RAGStatus {
  const krs = fo.key_results || [];
  if (krs.length === 0) return 'not-set';
  
  let totalProgress = 0;
  let count = 0;
  let hasData = false;
  
  krs.forEach(kr => {
    kr.indicators?.forEach(ind => {
      if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
        if (ind.current_value > 0) hasData = true;
        const progress = (ind.current_value / ind.target_value) * 100;
        totalProgress += progress;
        count++;
      }
    });
  });
  
  if (!hasData) return 'not-set';
  if (count === 0) return 'not-set';
  
  return scoreToRAG(totalProgress / count);
}

// Calculate FO percentage
function calculateFOPercentage(fo: DBFunctionalObjective): number {
  let totalProgress = 0;
  let count = 0;
  
  fo.key_results?.forEach(kr => {
    kr.indicators?.forEach(ind => {
      if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
        const progress = (ind.current_value / ind.target_value) * 100;
        totalProgress += progress;
        count++;
      }
    });
  });
  
  return count > 0 ? totalProgress / count : 0;
}

// Calculate KR percentage
function calculateKRPercentage(kr: DBKeyResult): number {
  let totalProgress = 0;
  let count = 0;
  
  kr.indicators?.forEach(ind => {
    if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
      const progress = (ind.current_value / ind.target_value) * 100;
      totalProgress += progress;
      count++;
    }
  });
  
  return count > 0 ? totalProgress / count : 0;
}

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
    case 'green': return 'border-rag-green';
    case 'amber': return 'border-rag-amber';
    case 'red': return 'border-rag-red';
    default: return 'border-muted-foreground/30';
  }
};

export function HierarchyFunnelView({ 
  functionalObjectives,
  statusFilter,
  filteredKRNames,
  filteredIndicatorIds
}: HierarchyFunnelViewProps) {
  // Track open state for all FOs and KRs
  const [openFOs, setOpenFOs] = useState<Set<string>>(() => new Set(functionalObjectives.map(fo => fo.id)));
  const [openKRs, setOpenKRs] = useState<Set<string>>(() => {
    const allKRIds = new Set<string>();
    functionalObjectives.forEach(fo => {
      fo.key_results?.forEach(kr => allKRIds.add(kr.id));
    });
    return allKRIds;
  });

  const allFOIds = useMemo(() => functionalObjectives.map(fo => fo.id), [functionalObjectives]);
  const allKRIds = useMemo(() => {
    const ids: string[] = [];
    functionalObjectives.forEach(fo => {
      fo.key_results?.forEach(kr => ids.push(kr.id));
    });
    return ids;
  }, [functionalObjectives]);

  const expandAll = () => {
    setOpenFOs(new Set(allFOIds));
    setOpenKRs(new Set(allKRIds));
  };

  const collapseAll = () => {
    setOpenFOs(new Set());
    setOpenKRs(new Set());
  };

  const toggleFO = (foId: string) => {
    setOpenFOs(prev => {
      const next = new Set(prev);
      if (next.has(foId)) {
        next.delete(foId);
      } else {
        next.add(foId);
      }
      return next;
    });
  };

  const toggleKR = (krId: string) => {
    setOpenKRs(prev => {
      const next = new Set(prev);
      if (next.has(krId)) {
        next.delete(krId);
      } else {
        next.add(krId);
      }
      return next;
    });
  };

  // Filter KRs based on filter names if provided
  const getFilteredKRs = (fo: DBFunctionalObjective) => {
    let krs = fo.key_results || [];
    
    if (filteredKRNames) {
      krs = krs.filter(kr => filteredKRNames.has(kr.name));
    }
    
    if (statusFilter !== 'all') {
      krs = krs.filter(kr =>
        (kr.indicators || []).some(ind => calculateIndicatorStatus(ind) === statusFilter)
      );
    }
    
    return krs;
  };

  // Filter indicators based on filter IDs if provided
  const getFilteredIndicators = (kr: DBKeyResult) => {
    let indicators = kr.indicators || [];
    
    if (filteredIndicatorIds) {
      indicators = indicators.filter(ind => filteredIndicatorIds.has(ind.id));
    }
    
    if (statusFilter !== 'all') {
      indicators = indicators.filter(ind => calculateIndicatorStatus(ind) === statusFilter);
    }
    
    return indicators;
  };

  if (functionalObjectives.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No items match the current filters</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Expand/Collapse Controls */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={expandAll} className="gap-1.5">
          <ChevronsDownUp className="h-4 w-4" />
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1.5">
          <ChevronsUpDown className="h-4 w-4" />
          Collapse All
        </Button>
      </div>

      {/* Hierarchy Tree */}
      <div className="space-y-3">
        {functionalObjectives.map(fo => {
          const foStatus = calculateFOStatus(fo);
          const foPercentage = calculateFOPercentage(fo);
          const displayStatus = statusFilter !== 'all' ? statusFilter : foStatus;
          const isFOOpen = openFOs.has(fo.id);
          const filteredKRs = getFilteredKRs(fo);
          const krCount = fo.key_results?.length || 0;
          const kpiCount = fo.key_results?.reduce((sum, kr) => sum + (kr.indicators?.length || 0), 0) || 0;

          return (
            <Collapsible key={fo.id} open={isFOOpen} onOpenChange={() => toggleFO(fo.id)}>
              {/* FO Header - Collapsible Trigger */}
              <CollapsibleTrigger asChild>
                <div className={cn(
                  'flex items-center justify-between w-full p-4 rounded-lg cursor-pointer transition-colors',
                  'bg-muted/50 hover:bg-muted border-l-4',
                  getBorderColorClass(displayStatus)
                )}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 text-muted-foreground">
                      {isFOOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                    <div className="p-2 rounded-lg bg-background flex-shrink-0">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{fo.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{krCount} KRs</span>
                        <span>•</span>
                        <span>{kpiCount} KPIs</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-24 hidden sm:block">
                      <Progress value={Math.min(foPercentage, 100)} className={cn('h-2', getProgressColorClass(displayStatus))} />
                    </div>
                    <span className="font-bold text-sm w-12 text-right">{Math.round(foPercentage)}%</span>
                    <RAGBadge status={displayStatus} size="sm" />
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* FO Content - Nested KRs */}
              <CollapsibleContent>
                <div className="ml-6 mt-2 pl-4 border-l-2 border-primary/20 space-y-2">
                  {filteredKRs.length > 0 ? (
                    filteredKRs.map(kr => {
                      const krStatus = calculateKRStatus(kr);
                      const krPercentage = calculateKRPercentage(kr);
                      const krDisplayStatus = statusFilter !== 'all' ? statusFilter : krStatus;
                      const isKROpen = openKRs.has(kr.id);
                      const filteredInds = getFilteredIndicators(kr);
                      const indicatorCount = kr.indicators?.length || 0;

                      return (
                        <Collapsible key={kr.id} open={isKROpen} onOpenChange={() => toggleKR(kr.id)}>
                          {/* KR Header */}
                          <CollapsibleTrigger asChild>
                            <div className={cn(
                              'flex items-center justify-between w-full p-3 rounded-lg cursor-pointer transition-colors',
                              'bg-background hover:bg-muted/50 border border-border',
                              'border-l-4',
                              getBorderColorClass(krDisplayStatus)
                            )}>
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="flex-shrink-0 text-muted-foreground">
                                  {isKROpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </div>
                                <div className="p-1.5 rounded bg-muted flex-shrink-0">
                                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-sm truncate">{kr.name}</h4>
                                  <span className="text-xs text-muted-foreground">{indicatorCount} Indicators</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="w-16 hidden sm:block">
                                  <Progress value={Math.min(krPercentage, 100)} className={cn('h-1.5', getProgressColorClass(krDisplayStatus))} />
                                </div>
                                <span className="font-bold text-xs w-10 text-right">{Math.round(krPercentage)}%</span>
                                <RAGBadge status={krDisplayStatus} size="sm" />
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          {/* KR Content - Indicators */}
                          <CollapsibleContent>
                            <div className="ml-6 mt-2 pl-4 border-l-2 border-muted grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {filteredInds.length > 0 ? (
                                filteredInds.map(ind => {
                                  const indStatus = calculateIndicatorStatus(ind);
                                  const indDisplayStatus = statusFilter !== 'all' ? statusFilter : indStatus;
                                  const indPercentage = ind.current_value !== null && ind.target_value !== null && ind.target_value > 0
                                    ? (ind.current_value / ind.target_value) * 100
                                    : 0;

                                  return (
                                    <Card key={ind.id} className={cn('border-l-4', getBorderColorClass(indDisplayStatus))}>
                                      <CardContent className="p-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-2 min-w-0 flex-1">
                                            <div className="p-1 rounded bg-muted flex-shrink-0 mt-0.5">
                                              <Activity className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <h5 className="font-medium text-xs leading-tight line-clamp-2">{ind.name}</h5>
                                              <span className="text-[10px] text-muted-foreground">
                                                {ind.current_value ?? '-'} / {ind.target_value ?? '-'} {ind.unit || ''}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                            <RAGBadge status={indDisplayStatus} size="sm" />
                                            <span className="text-xs font-bold">{Math.round(indPercentage)}%</span>
                                          </div>
                                        </div>
                                        <Progress 
                                          value={Math.min(indPercentage, 100)} 
                                          className={cn('h-1 mt-2', getProgressColorClass(indDisplayStatus))}
                                        />
                                      </CardContent>
                                    </Card>
                                  );
                                })
                              ) : (
                                <div className="col-span-full text-center py-3 text-xs text-muted-foreground">
                                  No indicators match the current filters
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No key results match the current filters
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
