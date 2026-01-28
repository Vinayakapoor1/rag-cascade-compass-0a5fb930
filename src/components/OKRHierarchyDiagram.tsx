import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronDown, ChevronRight, Target, Briefcase, Flag, Activity, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface HierarchyIndicator {
  id: string;
  name: string;
  tier: string;
}

interface HierarchyKeyResult {
  id: string;
  name: string;
  indicators: HierarchyIndicator[];
}

interface HierarchyFunctionalObjective {
  id: string;
  name: string;
  keyResults: HierarchyKeyResult[];
}

interface HierarchyDepartment {
  id: string;
  name: string;
  functionalObjectives: HierarchyFunctionalObjective[];
}

interface HierarchyOrgObjective {
  id: string;
  name: string;
  color: string;
  classification: string;
  departments: HierarchyDepartment[];
}

const colorMap: Record<string, string> = {
  green: 'bg-org-green/20 border-org-green text-org-green',
  purple: 'bg-org-purple/20 border-org-purple text-org-purple',
  blue: 'bg-org-blue/20 border-org-blue text-org-blue',
  yellow: 'bg-org-yellow/20 border-org-yellow text-org-yellow',
  orange: 'bg-org-orange/20 border-org-orange text-org-orange',
};

export function OKRHierarchyDiagram() {
  const [hierarchy, setHierarchy] = useState<HierarchyOrgObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedFOs, setExpandedFOs] = useState<Set<string>>(new Set());
  const [expandedKRs, setExpandedKRs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);

    // Fetch all data in parallel
    const [orgRes, deptRes, foRes, krRes, indRes] = await Promise.all([
      supabase.from('org_objectives').select('id, name, color, classification').order('name'),
      supabase.from('departments').select('id, name, org_objective_id').order('name'),
      supabase.from('functional_objectives').select('id, name, department_id').order('name'),
      supabase.from('key_results').select('id, name, functional_objective_id').order('name'),
      supabase.from('indicators').select('id, name, tier, key_result_id').order('name'),
    ]);

    if (orgRes.data && deptRes.data && foRes.data && krRes.data && indRes.data) {
      // Build hierarchy
      const hierarchyData: HierarchyOrgObjective[] = orgRes.data.map(org => {
        const orgDepts = deptRes.data.filter(d => d.org_objective_id === org.id);
        
        return {
          ...org,
          departments: orgDepts.map(dept => {
            const deptFOs = foRes.data.filter(fo => fo.department_id === dept.id);
            
            return {
              ...dept,
              functionalObjectives: deptFOs.map(fo => {
                const foKRs = krRes.data.filter(kr => kr.functional_objective_id === fo.id);
                
                return {
                  ...fo,
                  keyResults: foKRs.map(kr => {
                    const krInds = indRes.data.filter(ind => ind.key_result_id === kr.id);
                    return {
                      ...kr,
                      indicators: krInds,
                    };
                  }),
                };
              }),
            };
          }),
        };
      });

      setHierarchy(hierarchyData);
    }

    setLoading(false);
  };

  const toggleOrg = (id: string) => {
    const next = new Set(expandedOrgs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedOrgs(next);
  };

  const toggleDept = (id: string) => {
    const next = new Set(expandedDepts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedDepts(next);
  };

  const toggleFO = (id: string) => {
    const next = new Set(expandedFOs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedFOs(next);
  };

  const toggleKR = (id: string) => {
    const next = new Set(expandedKRs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedKRs(next);
  };

  const expandAll = () => {
    const allOrgs = new Set(hierarchy.map(o => o.id));
    const allDepts = new Set(hierarchy.flatMap(o => o.departments.map(d => d.id)));
    const allFOs = new Set(hierarchy.flatMap(o => o.departments.flatMap(d => d.functionalObjectives.map(fo => fo.id))));
    const allKRs = new Set(hierarchy.flatMap(o => o.departments.flatMap(d => d.functionalObjectives.flatMap(fo => fo.keyResults.map(kr => kr.id)))));
    setExpandedOrgs(allOrgs);
    setExpandedDepts(allDepts);
    setExpandedFOs(allFOs);
    setExpandedKRs(allKRs);
  };

  const collapseAll = () => {
    setExpandedOrgs(new Set());
    setExpandedDepts(new Set());
    setExpandedFOs(new Set());
    setExpandedKRs(new Set());
  };

  // Calculate totals
  const totalDepts = hierarchy.reduce((sum, org) => sum + org.departments.length, 0);
  const totalFOs = hierarchy.reduce((sum, org) => sum + org.departments.reduce((s, d) => s + d.functionalObjectives.length, 0), 0);
  const totalKRs = hierarchy.reduce((sum, org) => sum + org.departments.reduce((s, d) => s + d.functionalObjectives.reduce((ss, fo) => ss + fo.keyResults.length, 0), 0), 0);
  const totalInds = hierarchy.reduce((sum, org) => sum + org.departments.reduce((s, d) => s + d.functionalObjectives.reduce((ss, fo) => ss + fo.keyResults.reduce((sss, kr) => sss + kr.indicators.length, 0), 0), 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">OKR Hierarchy Funnel</CardTitle>
          <CardDescription>Visual breakdown of the complete OKR structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2">
            {/* Level 1: Org Objectives */}
            <div className="w-full max-w-md">
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-primary/10 border-2 border-primary rounded-lg">
                <Target className="h-6 w-6 text-primary" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{hierarchy.length}</div>
                  <div className="text-sm text-muted-foreground">Org Objectives</div>
                </div>
              </div>
            </div>

            <div className="h-6 w-0.5 bg-border" />

            {/* Level 2: Departments */}
            <div className="w-full max-w-lg">
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-org-purple/10 border-2 border-org-purple rounded-lg">
                <Building2 className="h-6 w-6 text-org-purple" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-org-purple">{totalDepts}</div>
                  <div className="text-sm text-muted-foreground">Departments</div>
                </div>
              </div>
            </div>

            <div className="h-6 w-0.5 bg-border" />

            {/* Level 3: Functional Objectives */}
            <div className="w-full max-w-xl">
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-org-blue/10 border-2 border-org-blue rounded-lg">
                <Briefcase className="h-6 w-6 text-org-blue" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-org-blue">{totalFOs}</div>
                  <div className="text-sm text-muted-foreground">Functional Objectives</div>
                </div>
              </div>
            </div>

            <div className="h-6 w-0.5 bg-border" />

            {/* Level 4: Key Results */}
            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-org-orange/10 border-2 border-org-orange rounded-lg">
                <Flag className="h-6 w-6 text-org-orange" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-org-orange">{totalKRs}</div>
                  <div className="text-sm text-muted-foreground">Key Results</div>
                </div>
              </div>
            </div>

            <div className="h-6 w-0.5 bg-border" />

            {/* Level 5: Indicators */}
            <div className="w-full">
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-tier-1/10 border-2 border-tier-1 rounded-lg">
                <Activity className="h-6 w-6 text-tier-1" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-tier-1">{totalInds}</div>
                  <div className="text-sm text-muted-foreground">Indicators</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Hierarchy Tree */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Detailed Hierarchy</CardTitle>
              <CardDescription>Click to expand and explore the full structure</CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-primary hover:underline"
              >
                Expand All
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-primary hover:underline"
              >
                Collapse All
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-2">
              {hierarchy.map(org => (
                <div key={org.id} className="border rounded-lg overflow-hidden">
                  {/* Org Objective */}
                  <button
                    onClick={() => toggleOrg(org.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                      colorMap[org.color] || 'bg-muted'
                    )}
                  >
                    {expandedOrgs.has(org.id) ? (
                      <ChevronDown className="h-5 w-5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0" />
                    )}
                    <Target className="h-5 w-5 shrink-0" />
                    <span className="font-semibold flex-1">{org.name}</span>
                    <Badge variant="outline" className="shrink-0">
                      {org.departments.length} Depts
                    </Badge>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {org.classification}
                    </Badge>
                  </button>

                  {/* Departments */}
                  {expandedOrgs.has(org.id) && (
                    <div className="ml-6 border-l-2 border-border">
                      {org.departments.length === 0 ? (
                        <div className="py-3 pl-4 text-sm text-muted-foreground italic">
                          No departments
                        </div>
                      ) : (
                        org.departments.map(dept => (
                          <div key={dept.id}>
                            <button
                              onClick={() => toggleDept(dept.id)}
                              className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30"
                            >
                              {expandedDepts.has(dept.id) ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-org-purple" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-org-purple" />
                              )}
                              <Building2 className="h-4 w-4 shrink-0 text-org-purple" />
                              <span className="flex-1">{dept.name}</span>
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {dept.functionalObjectives.length} FOs
                              </Badge>
                            </button>

                            {/* Functional Objectives */}
                            {expandedDepts.has(dept.id) && (
                              <div className="ml-6 border-l-2 border-border/50">
                                {dept.functionalObjectives.length === 0 ? (
                                  <div className="py-2 pl-4 text-sm text-muted-foreground italic">
                                    No functional objectives
                                  </div>
                                ) : (
                                  dept.functionalObjectives.map(fo => (
                                    <div key={fo.id}>
                                      <button
                                        onClick={() => toggleFO(fo.id)}
                                        className="w-full flex items-center gap-3 p-2 pl-4 text-left transition-colors hover:bg-muted/20"
                                      >
                                        {expandedFOs.has(fo.id) ? (
                                          <ChevronDown className="h-4 w-4 shrink-0 text-org-blue" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 shrink-0 text-org-blue" />
                                        )}
                                        <Briefcase className="h-4 w-4 shrink-0 text-org-blue" />
                                        <span className="flex-1 text-sm">{fo.name}</span>
                                        <Badge variant="outline" className="shrink-0 text-xs">
                                          {fo.keyResults.length} KRs
                                        </Badge>
                                      </button>

                                      {/* Key Results */}
                                      {expandedFOs.has(fo.id) && (
                                        <div className="ml-6 border-l-2 border-border/30">
                                          {fo.keyResults.length === 0 ? (
                                            <div className="py-2 pl-4 text-xs text-muted-foreground italic">
                                              No key results
                                            </div>
                                          ) : (
                                            fo.keyResults.map(kr => (
                                              <div key={kr.id}>
                                                <button
                                                  onClick={() => toggleKR(kr.id)}
                                                  className="w-full flex items-center gap-3 p-2 pl-4 text-left transition-colors hover:bg-muted/10"
                                                >
                                                  {expandedKRs.has(kr.id) ? (
                                                    <ChevronDown className="h-3 w-3 shrink-0 text-org-orange" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3 shrink-0 text-org-orange" />
                                                  )}
                                                  <Flag className="h-3 w-3 shrink-0 text-org-orange" />
                                                  <span className="flex-1 text-sm">{kr.name}</span>
                                                  <Badge variant="outline" className="shrink-0 text-xs">
                                                    {kr.indicators.length} Ind
                                                  </Badge>
                                                </button>

                                                {/* Indicators */}
                                                {expandedKRs.has(kr.id) && (
                                                  <div className="ml-6 pl-4 py-1 space-y-1">
                                                    {kr.indicators.length === 0 ? (
                                                      <div className="text-xs text-muted-foreground italic">
                                                        No indicators
                                                      </div>
                                                    ) : (
                                                      kr.indicators.map(ind => (
                                                        <div
                                                          key={ind.id}
                                                          className="flex items-center gap-2 py-1 text-xs"
                                                        >
                                                          <Activity className="h-3 w-3 shrink-0 text-primary" />
                                                          <span className="flex-1 text-muted-foreground">
                                                            {ind.name}
                                                          </span>
                                                          <Badge 
                                                            variant="outline" 
                                                            className="text-xs border-primary text-primary"
                                                          >
                                                            KPI
                                                          </Badge>
                                                        </div>
                                                      ))
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
