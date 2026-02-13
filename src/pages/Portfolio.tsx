import React, { useState, useEffect, useMemo } from 'react';
import { useOrgObjectives, useVentures, DBOrgObjective } from '@/hooks/useOrgObjectives';
import { useAuth } from '@/hooks/useAuth';
import { BusinessOutcomeSection } from '@/components/BusinessOutcomeSection';
import { RAGBadge } from '@/components/RAGBadge';
import { OKRHierarchyLegend } from '@/components/OKRHierarchyLegend';
import { RAGLegend } from '@/components/RAGLegend';
import { OrgObjectiveStatBlock } from '@/components/OrgObjectiveStatBlock';
import { DepartmentStatBlock } from '@/components/DepartmentStatBlock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { scoreToRAG } from '@/lib/ragUtils';
import { AlertTriangle, CheckCircle, XCircle, Database, Target, BarChart3, Settings, Activity, Users, Puzzle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RAGStatus, OrgObjectiveColor, OrgObjectiveClassification } from '@/types/venture';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { VentureSelector } from '@/components/VentureSelector';

// Calculate percentage from indicators for an org objective
function calculateOrgObjectivePercentage(objective: DBOrgObjective): number {
  let totalProgress = 0;
  let indicatorCount = 0;

  objective.departments.forEach(dept => {
    dept.functional_objectives.forEach(fo => {
      fo.key_results.forEach(kr => {
        kr.indicators.forEach(ind => {
          if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
            totalProgress += (ind.current_value / ind.target_value) * 100;
            indicatorCount++;
          }
        });
      });
    });
  });

  return indicatorCount > 0 ? totalProgress / indicatorCount : 0;
}

// Calculate filtered percentage based on filter status
function calculateFilteredPercentage(objective: DBOrgObjective, status: RAGStatus | null): number {
  if (!status) return calculateOrgObjectivePercentage(objective);
  
  let totalProgress = 0;
  let count = 0;
  
  objective.departments.forEach(dept => {
    dept.functional_objectives.forEach(fo => {
      fo.key_results.forEach(kr => {
        kr.indicators.forEach(ind => {
          if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
            const progress = (ind.current_value / ind.target_value) * 100;
            const indStatus = scoreToRAG(progress);
            if (indStatus === status) {
              totalProgress += progress;
              count++;
            }
          }
        });
      });
    });
  });
  
  return count > 0 ? totalProgress / count : 0;
}

// Calculate department percentage
function calculateDepartmentPercentage(dept: DBOrgObjective['departments'][0], filterStatus: RAGStatus | null): number {
  let totalProgress = 0;
  let count = 0;

  dept.functional_objectives.forEach(fo => {
    fo.key_results.forEach(kr => {
      kr.indicators.forEach(ind => {
        if (ind.current_value !== null && ind.target_value !== null && ind.target_value > 0) {
          const progress = (ind.current_value / ind.target_value) * 100;
          if (!filterStatus || scoreToRAG(progress) === filterStatus) {
            totalProgress += progress;
            count++;
          }
        }
      });
    });
  });

  return count > 0 ? totalProgress / count : 0;
}

// Calculate department RAG status
function calculateDepartmentStatus(dept: DBOrgObjective['departments'][0]): RAGStatus {
  // Check if there's any actual data (current_value > 0)
  let hasAnyData = false;
  dept.functional_objectives.forEach(fo => {
    fo.key_results.forEach(kr => {
      kr.indicators.forEach(ind => {
        if (ind.current_value !== null && ind.current_value > 0) {
          hasAnyData = true;
        }
      });
    });
  });
  
  if (!hasAnyData) return 'not-set';
  
  const percentage = calculateDepartmentPercentage(dept, null);
  return scoreToRAG(percentage);
}

// Helper to filter objective internal data by RAG status
function filterObjectiveByStatus(objective: DBOrgObjective, status: RAGStatus | null): DBOrgObjective | null {
  if (!status) return objective;
  
  const filteredDepartments = objective.departments.map(dept => {
    const filteredFOs = dept.functional_objectives.map(fo => {
      const filteredKRs = fo.key_results.map(kr => {
        const filteredIndicators = kr.indicators.filter(ind => {
          if (ind.current_value === null || ind.target_value === null || ind.target_value <= 0) {
            return false;
          }
          const progress = (ind.current_value / ind.target_value) * 100;
          let indStatus: RAGStatus = 'red';
          if (progress >= 76) indStatus = 'green';
          else if (progress >= 51) indStatus = 'amber';
          return indStatus === status;
        });
        return { ...kr, indicators: filteredIndicators };
      }).filter(kr => kr.indicators.length > 0);
      return { ...fo, key_results: filteredKRs };
    }).filter(fo => fo.key_results.length > 0);
    return { ...dept, functional_objectives: filteredFOs };
  }).filter(dept => dept.functional_objectives.length > 0);

  if (filteredDepartments.length === 0) return null;

  return { ...objective, departments: filteredDepartments };
}

// Aggregate department type
interface AggregatedDepartment {
  id: string;
  name: string;
  owner?: string | null;
  status: RAGStatus;
  percentage: number;
  foCount: number;
  krCount: number;
  kpiCount: number;
  orgObjectiveId: string;
  orgObjectiveName: string;
  orgColor: OrgObjectiveColor;
}

export default function Portfolio() {
  const [filterStatus, setFilterStatus] = useState<RAGStatus | null>(null);
  const { data: ventures } = useVentures();
  const [selectedVentureId, setSelectedVentureId] = useState<string | null>(null);
  const { user, isAdmin, isCSM, csmId, accessibleDepartments } = useAuth();

  // Auto-select HumanFirewall on first load
  useEffect(() => {
    if (!selectedVentureId && ventures && ventures.length > 0) {
      const hf = ventures.find(v => v.name === 'HumanFirewall');
      setSelectedVentureId(hf?.id || ventures[0].id);
    }
  }, [ventures, selectedVentureId]);

  const { data: rawOrgObjectives, isLoading, refetch } = useOrgObjectives(selectedVentureId ?? undefined);

  const { isDepartmentHead } = useAuth();

  // Department-scoped filtering: CSM and viewer roles see only assigned departments
  // Admins and Department Heads see everything (full portfolio)
  const orgObjectives = useMemo(() => {
    if (!rawOrgObjectives) return rawOrgObjectives;
    // Admins, department heads, and unauthenticated users see everything
    if (isAdmin || isDepartmentHead || !user) return rawOrgObjectives;
    
    // CSMs and viewers: filter departments within each org objective
    return rawOrgObjectives
      .map(obj => ({
        ...obj,
        departments: obj.departments.filter(d => accessibleDepartments.includes(d.id))
      }))
      .filter(obj => obj.departments.length > 0);
  }, [rawOrgObjectives, isAdmin, isDepartmentHead, user, accessibleDepartments]);

  // Derive feature IDs from the scoped orgObjectives hierarchy
  const scopedFeatureIds = useMemo(() => {
    if (!orgObjectives) return new Set<string>();
    const featureIds = new Set<string>();
    orgObjectives.forEach(org => {
      org.departments.forEach(dept => {
        dept.functional_objectives.forEach(fo => {
          fo.key_results.forEach(kr => {
            kr.indicators.forEach(ind => {
              ind.linkedFeatureIds?.forEach(id => featureIds.add(id));
            });
          });
        });
      });
    });
    return featureIds;
  }, [orgObjectives]);

  // Fetch customers linked to scoped features via customer_features
  // For CSMs, further filter to only their assigned customers
  const [scopedCustomerCount, setScopedCustomerCount] = useState(0);
  const [csmScopedFeatureCount, setCsmScopedFeatureCount] = useState<number | null>(null);
  useEffect(() => {
    if (scopedFeatureIds.size === 0) {
      setScopedCustomerCount(0);
      setCsmScopedFeatureCount(null);
      return;
    }
    const fetchScopedCustomers = async () => {
      const featureIdArr = Array.from(scopedFeatureIds);

      // CSM users: filter by their assigned customers (csm_id)
      const isCsmScoped = isCSM && !isAdmin && !isDepartmentHead && !!csmId;

      if (isCsmScoped) {
        const { data } = await supabase
          .from('customer_features')
          .select('customer_id, feature_id, customers!inner(csm_id)')
          .in('feature_id', featureIdArr)
          .eq('customers.csm_id', csmId);
        if (data) {
          const uniqueCustomers = new Set(data.map(r => r.customer_id));
          const uniqueFeatures = new Set(data.map(r => r.feature_id));
          setScopedCustomerCount(uniqueCustomers.size);
          setCsmScopedFeatureCount(uniqueFeatures.size);
        }
      } else {
        const { data } = await supabase
          .from('customer_features')
          .select('customer_id')
          .in('feature_id', featureIdArr);
        if (data) {
          const uniqueCustomers = new Set(data.map(r => r.customer_id));
          setScopedCustomerCount(uniqueCustomers.size);
        }
        setCsmScopedFeatureCount(null);
      }
    };
    fetchScopedCustomers();
  }, [scopedFeatureIds, isCSM, isAdmin, isDepartmentHead, csmId]);

  const scopedCounts = useMemo(() => ({
    customers: scopedCustomerCount,
    features: csmScopedFeatureCount !== null ? csmScopedFeatureCount : scopedFeatureIds.size,
  }), [scopedCustomerCount, scopedFeatureIds]);

  // Calculate portfolio-level stats from ALL indicators across all org objectives
  const portfolioStats = orgObjectives?.reduce((stats, org) => {
    org.departments.forEach(dept => {
      stats.deptCount++;
      dept.functional_objectives.forEach(fo => {
        stats.foCount++;
        fo.key_results.forEach(kr => {
          stats.krCount++;
          kr.indicators.forEach(ind => {
            stats.indicatorCount++;
            if (ind.current_value != null && ind.target_value != null && ind.target_value > 0) {
              const progress = (ind.current_value / ind.target_value) * 100;
              stats.totalProgress += progress;
              stats.indicatorsWithData++;
              if (progress >= 76) stats.green++;
              else if (progress >= 51) stats.amber++;
              else stats.red++;
            }
          });
        });
      });
    });
    return stats;
  }, { green: 0, amber: 0, red: 0, totalProgress: 0, indicatorsWithData: 0, deptCount: 0, foCount: 0, krCount: 0, indicatorCount: 0 }) 
    || { green: 0, amber: 0, red: 0, totalProgress: 0, indicatorsWithData: 0, deptCount: 0, foCount: 0, krCount: 0, indicatorCount: 0 };

  const totalIndicatorsWithStatus = portfolioStats.green + portfolioStats.amber + portfolioStats.red;
  const avgScore = portfolioStats.indicatorsWithData > 0 
    ? portfolioStats.totalProgress / portfolioStats.indicatorsWithData
    : 0;
  const portfolioHealth = portfolioStats.indicatorsWithData > 0 
    ? scoreToRAG(avgScore) 
    : 'not-set';

  // Sort org objectives: Critical first, then At Risk, then On Track
  const sortedObjectives = [...(orgObjectives || [])].sort((a, b) => {
    const priority = { red: 0, amber: 1, green: 2 };
    return priority[a.overallHealth] - priority[b.overallHealth];
  });

  // Filter objectives - show all but filter their internal content
  const filteredObjectives = filterStatus 
    ? sortedObjectives.map(obj => filterObjectiveByStatus(obj, filterStatus)).filter((obj): obj is DBOrgObjective => obj !== null)
    : sortedObjectives;

  // Aggregate all departments from all org objectives
  const allDepartments = useMemo((): AggregatedDepartment[] => {
    if (!orgObjectives) return [];
    
    return orgObjectives.flatMap(org => 
      org.departments.map(dept => {
        const foCount = dept.functional_objectives.length;
        const krCount = dept.functional_objectives.reduce((sum, fo) => sum + fo.key_results.length, 0);
        const kpiCount = dept.functional_objectives.reduce((sum, fo) => 
          sum + fo.key_results.reduce((s, kr) => s + kr.indicators.length, 0), 0);
        
        return {
          id: dept.id,
          name: dept.name,
          owner: dept.owner,
          status: calculateDepartmentStatus(dept),
          percentage: calculateDepartmentPercentage(dept, null),
          foCount,
          krCount,
          kpiCount,
          orgObjectiveId: org.id,
          orgObjectiveName: org.name,
          orgColor: (dept.color || org.color) as OrgObjectiveColor,
        };
      })
    );
  }, [orgObjectives]);

  // Filter departments based on active filter
  const filteredDepartments = useMemo(() => {
    if (!filterStatus) return allDepartments;
    
    return allDepartments.filter(dept => {
      // Check if department has any indicators matching the filter
      const org = orgObjectives?.find(o => o.id === dept.orgObjectiveId);
      if (!org) return false;
      
      const deptData = org.departments.find(d => d.id === dept.id);
      if (!deptData) return false;
      
      return deptData.functional_objectives.some(fo =>
        fo.key_results.some(kr =>
          kr.indicators.some(ind => {
            if (ind.current_value === null || ind.target_value === null || ind.target_value <= 0) return false;
            const progress = (ind.current_value / ind.target_value) * 100;
            return scoreToRAG(progress) === filterStatus;
          })
        )
      );
    });
  }, [allDepartments, filterStatus, orgObjectives]);

  // Toggle filter for a status
  const toggleStatus = (status: RAGStatus) => {
    if (filterStatus === status) {
      setFilterStatus(null);
    } else {
      setFilterStatus(status);
    }
  };

  // Calculate filtered stats based on active filter
  const filteredStats = useMemo(() => {
    if (!filterStatus || !orgObjectives) {
      return { deptCount: portfolioStats.deptCount, foCount: portfolioStats.foCount, krCount: portfolioStats.krCount, indicatorCount: portfolioStats.indicatorCount };
    }

    let deptCount = 0, foCount = 0, krCount = 0, indicatorCount = 0;
    const countedDepts = new Set<string>();
    const countedFOs = new Set<string>();
    const countedKRs = new Set<string>();

    orgObjectives.forEach(org => {
      org.departments.forEach(dept => {
        dept.functional_objectives.forEach(fo => {
          fo.key_results.forEach(kr => {
            kr.indicators.forEach(ind => {
              if (ind.current_value != null && ind.target_value != null && ind.target_value > 0) {
                const progress = (ind.current_value / ind.target_value) * 100;
                const indStatus = scoreToRAG(progress);
                if (indStatus === filterStatus) {
                  indicatorCount++;
                  if (!countedKRs.has(kr.id)) { countedKRs.add(kr.id); krCount++; }
                  if (!countedFOs.has(fo.id)) { countedFOs.add(fo.id); foCount++; }
                  if (!countedDepts.has(dept.id)) { countedDepts.add(dept.id); deptCount++; }
                }
              }
            });
          });
        });
      });
    });

    return { deptCount, foCount, krCount, indicatorCount };
  }, [filterStatus, orgObjectives, portfolioStats]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Empty state - differentiate between no data and no access
  if (!orgObjectives || orgObjectives.length === 0) {
    const hasNoAccess = user && !isAdmin && rawOrgObjectives && rawOrgObjectives.length > 0;
    return (
      <div className="space-y-8">
        <BusinessOutcomeSection businessOutcome="3X Revenue" status="not-set" />
        <div className="glass-card max-w-md mx-auto p-8 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{hasNoAccess ? 'No Departments Assigned' : 'No Data Yet'}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {hasNoAccess 
              ? 'You don\'t have access to any departments yet. Please contact your administrator to get department access.'
              : 'Import OKR data to see your organizational objectives and health metrics.'}
          </p>
          {!hasNoAccess && (
            <Link to="/data" className="text-primary hover:underline text-sm font-medium">
              Go to Data Management →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. OKR Structure & RAG Legend - TOP */}
      <div className="flex items-end justify-end gap-3 flex-wrap">
        <VentureSelector
          selectedVentureId={selectedVentureId}
          onSelect={setSelectedVentureId}
        />
        <OKRHierarchyLegend />
        <RAGLegend />
      </div>

      {/* 2. Business Outcome */}
      <BusinessOutcomeSection 
        businessOutcome={orgObjectives?.find(obj => obj.business_outcome)?.business_outcome ?? null} 
        status={portfolioHealth}
        percentage={avgScore}
        orgObjectiveId={orgObjectives?.find(obj => obj.business_outcome)?.id ?? orgObjectives?.[0]?.id ?? null}
        onEditSuccess={() => refetch()}
      />

      {/* 3. Organizational Objectives - Small Stat Blocks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Organizational Objectives</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredObjectives.map(objective => (
              <OrgObjectiveStatBlock
                key={objective.id}
                name={objective.name}
                classification={objective.classification as OrgObjectiveClassification}
                status={objective.overallHealth}
                percentage={calculateFilteredPercentage(objective, filterStatus)}
                filterStatus={filterStatus}
              />
            ))}
        </div>
      </div>

      {/* 4. Stats Cards - Structure Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className={cn(
          'stats-card p-4',
          filterStatus && 'ring-1 ring-primary/30'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl transition-all duration-300',
              filterStatus ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Target className={cn('h-5 w-5', filterStatus ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredStats.deptCount}</p>
              <p className="text-xs text-muted-foreground">
                Departments{filterStatus && <span className="text-[10px] ml-1 opacity-70">(filtered)</span>}
              </p>
            </div>
          </div>
        </div>
        <div className={cn(
          'stats-card p-4',
          filterStatus && 'ring-1 ring-primary/30'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl transition-all duration-300',
              filterStatus ? 'bg-primary/10' : 'bg-muted'
            )}>
              <BarChart3 className={cn('h-5 w-5', filterStatus ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredStats.foCount}</p>
              <p className="text-xs text-muted-foreground">
                Functional Obj.{filterStatus && <span className="text-[10px] ml-1 opacity-70">(filtered)</span>}
              </p>
            </div>
          </div>
        </div>
        <div className={cn(
          'stats-card p-4',
          filterStatus && 'ring-1 ring-primary/30'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl transition-all duration-300',
              filterStatus ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Settings className={cn('h-5 w-5', filterStatus ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredStats.krCount}</p>
              <p className="text-xs text-muted-foreground">
                Key Results{filterStatus && <span className="text-[10px] ml-1 opacity-70">(filtered)</span>}
              </p>
            </div>
          </div>
        </div>
        <div className={cn(
          'stats-card p-4',
          filterStatus && 'ring-1 ring-primary/30'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl transition-all duration-300',
              filterStatus ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Activity className={cn('h-5 w-5', filterStatus ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredStats.indicatorCount}</p>
              <p className="text-xs text-muted-foreground">
                KPIs{filterStatus && <span className="text-[10px] ml-1 opacity-70">(filtered)</span>}
              </p>
            </div>
          </div>
        </div>
        <Link to="/customers">
          <div className="stats-card p-4 h-full group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{scopedCounts.customers}</p>
                  <p className="text-xs text-muted-foreground">Customers</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
        <Link to="/features">
          <div className="stats-card p-4 h-full group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <Puzzle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{scopedCounts.features}</p>
                  <p className="text-xs text-muted-foreground">Features</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>

      {/* 5. RAG Filtering Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Overall Health</p>
          <div className="flex items-center gap-3">
            <RAGBadge status={portfolioHealth} size="md" pulse />
            <span className="text-2xl font-bold">{Math.round(avgScore)}%</span>
          </div>
          <Progress 
            value={avgScore} 
            className={cn(
              'h-2 mt-3',
              portfolioHealth === 'green' ? '[&>div]:bg-rag-green' :
              portfolioHealth === 'amber' ? '[&>div]:bg-rag-amber' :
              '[&>div]:bg-rag-red'
            )}
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            {portfolioStats.indicatorCount} indicators across {orgObjectives?.length || 0} objectives
          </p>
        </div>
        
        {/* On Track - Clickable filter */}
        <div 
          className={cn(
            'glass-card p-4 cursor-pointer transition-all duration-300 border-l-4 border-l-rag-green',
            filterStatus === 'green' 
              ? 'ring-2 ring-rag-green shadow-lg shadow-rag-green/10 bg-rag-green-muted/30' 
              : 'hover:shadow-md hover:bg-rag-green-muted/20 hover:scale-[1.02]'
          )}
          onClick={() => toggleStatus('green')}
        >
          <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
            <CheckCircle className="h-4 w-4 text-rag-green" />
            <span className="text-rag-green font-semibold">On Track</span>
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rag-green">{portfolioStats.green}</span>
            <span className="text-xs text-muted-foreground">
              ({totalIndicatorsWithStatus > 0 ? Math.round((portfolioStats.green / totalIndicatorsWithStatus) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 font-medium">
            {filterStatus === 'green' ? 'Click to clear' : 'Click to filter'}
          </div>
        </div>
        
        {/* At Risk - Clickable filter */}
        <div 
          className={cn(
            'glass-card p-4 cursor-pointer transition-all duration-300 border-l-4 border-l-rag-amber',
            filterStatus === 'amber' 
              ? 'ring-2 ring-rag-amber shadow-lg shadow-rag-amber/10 bg-rag-amber-muted/30' 
              : 'hover:shadow-md hover:bg-rag-amber-muted/20 hover:scale-[1.02]'
          )}
          onClick={() => toggleStatus('amber')}
        >
          <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4 text-rag-amber" />
            <span className="text-rag-amber font-semibold">At Risk</span>
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rag-amber">{portfolioStats.amber}</span>
            <span className="text-xs text-muted-foreground">
              ({totalIndicatorsWithStatus > 0 ? Math.round((portfolioStats.amber / totalIndicatorsWithStatus) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 font-medium">
            {filterStatus === 'amber' ? 'Click to clear' : 'Click to filter'}
          </div>
        </div>
        
        {/* Off Track - Clickable filter */}
        <div 
          className={cn(
            'glass-card p-4 cursor-pointer transition-all duration-300 border-l-4 border-l-rag-red',
            filterStatus === 'red' 
              ? 'ring-2 ring-rag-red shadow-lg shadow-rag-red/10 bg-rag-red-muted/30' 
              : 'hover:shadow-md hover:bg-rag-red-muted/20 hover:scale-[1.02]'
          )}
          onClick={() => toggleStatus('red')}
        >
          <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
            <XCircle className="h-4 w-4 text-rag-red" />
            <span className="text-rag-red font-semibold">Off Track</span>
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rag-red">{portfolioStats.red}</span>
            <span className="text-xs text-muted-foreground">
              ({totalIndicatorsWithStatus > 0 ? Math.round((portfolioStats.red / totalIndicatorsWithStatus) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 font-medium">
            {filterStatus === 'red' ? 'Click to clear' : 'Click to filter'}
          </div>
        </div>
      </div>

      {/* 6. Filter Active Banner */}
      {filterStatus && (
        <div className="glass-card flex items-center justify-between p-4">
          <span className="text-sm">
            Showing indicators with <strong className={`text-rag-${filterStatus}`}>
              {filterStatus === 'green' ? 'On Track' : filterStatus === 'amber' ? 'At Risk' : 'Off Track'}
            </strong> status
          </span>
          <Button variant="ghost" size="sm" onClick={() => setFilterStatus(null)} className="hover-glow">
            Clear Filter
          </Button>
        </div>
      )}

      {/* 7. All Departments - Small Stat Blocks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Departments</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDepartments.map(dept => (
            <DepartmentStatBlock
              key={dept.id}
              id={dept.id}
              name={dept.name}
              owner={dept.owner}
              status={dept.status}
              percentage={calculateDepartmentPercentage(
                orgObjectives?.find(o => o.id === dept.orgObjectiveId)?.departments.find(d => d.id === dept.id)!,
                filterStatus
              )}
              foCount={dept.foCount}
              krCount={dept.krCount}
              kpiCount={dept.kpiCount}
              orgObjectiveId={dept.orgObjectiveId}
              orgColor={dept.orgColor}
              filterStatus={filterStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
}