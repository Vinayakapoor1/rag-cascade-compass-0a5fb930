import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RAGBadge } from '@/components/RAGBadge';
import { 
  Users, Boxes, Target, Building2, Settings, Activity, 
  ChevronDown, ChevronUp, ExternalLink, ArrowDown, Maximize2, List, GitBranch
} from 'lucide-react';
import { RAGStatus, Department, KeyResult, Indicator } from '@/types/venture';
import { cn } from '@/lib/utils';

interface ImpactSummaryPanelProps {
  filterType: 'customer' | 'feature';
  filterName: string;
  filterId: string;
  departments: Department[];
  orgObjectiveId: string;
  orgObjectiveName: string;
}

interface ImpactData {
  departments: Set<string>;
  departmentNames: Map<string, string>;
  keyResults: Map<string, { kr: KeyResult; foName: string; deptName: string; status: RAGStatus }>;
  indicators: Map<string, { ind: Indicator; krName: string; status: RAGStatus }>;
  statusBreakdown: { green: number; amber: number; red: number; notSet: number };
}

interface FlowNode {
  id: string;
  name: string;
  type: 'source' | 'org' | 'dept' | 'fo' | 'kr' | 'kpi';
  status?: RAGStatus;
  tier?: string;
  children: FlowNode[];
  link?: string;
}

export function ImpactSummaryPanel({ 
  filterType, 
  filterName, 
  filterId,
  departments,
  orgObjectiveId,
  orgObjectiveName
}: ImpactSummaryPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'flow' | 'list'>('flow');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['source', 'org']));

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Calculate impact data for list view
  const impactData = useMemo<ImpactData>(() => {
    const data: ImpactData = {
      departments: new Set(),
      departmentNames: new Map(),
      keyResults: new Map(),
      indicators: new Map(),
      statusBreakdown: { green: 0, amber: 0, red: 0, notSet: 0 },
    };

    departments.forEach(dept => {
      dept.functionalObjectives.forEach(fo => {
        fo.keyResults.forEach(kr => {
          kr.indicators?.forEach(ind => {
            const isLinked = filterType === 'customer' 
              ? ind.linkedCustomerIds?.includes(filterId)
              : ind.linkedFeatureIds?.includes(filterId);
            
            if (isLinked) {
              data.departments.add(dept.id);
              data.departmentNames.set(dept.id, dept.name);
              
              if (!data.keyResults.has(kr.id)) {
                data.keyResults.set(kr.id, {
                  kr,
                  foName: fo.name,
                  deptName: dept.name,
                  status: kr.status,
                });
              }
              
              data.indicators.set(ind.id, {
                ind,
                krName: kr.name,
                status: ind.status,
              });

              if (ind.status === 'green') data.statusBreakdown.green++;
              else if (ind.status === 'amber') data.statusBreakdown.amber++;
              else if (ind.status === 'red') data.statusBreakdown.red++;
              else data.statusBreakdown.notSet++;
            }
          });
        });
      });
    });

    return data;
  }, [departments, filterType, filterId]);

  // Build flow tree for flow view
  const flowTree = useMemo<FlowNode>(() => {
    const orgNode: FlowNode = {
      id: 'org',
      name: orgObjectiveName,
      type: 'org',
      link: `/org-objective/${orgObjectiveId}`,
      children: [],
    };

    const deptMap = new Map<string, FlowNode>();

    departments.forEach(dept => {
      dept.functionalObjectives.forEach(fo => {
        fo.keyResults.forEach(kr => {
          kr.indicators?.forEach(ind => {
            const isLinked = filterType === 'customer' 
              ? ind.linkedCustomerIds?.includes(filterId)
              : ind.linkedFeatureIds?.includes(filterId);
            
            if (isLinked) {
              if (!deptMap.has(dept.id)) {
                deptMap.set(dept.id, {
                  id: dept.id,
                  name: dept.name,
                  type: 'dept',
                  children: [],
                });
              }
              const deptNode = deptMap.get(dept.id)!;

              let foNode = deptNode.children.find(n => n.id === fo.id);
              if (!foNode) {
                foNode = {
                  id: fo.id,
                  name: fo.name,
                  type: 'fo',
                  children: [],
                };
                deptNode.children.push(foNode);
              }

              let krNode = foNode.children.find(n => n.id === kr.id);
              if (!krNode) {
                krNode = {
                  id: kr.id,
                  name: kr.name,
                  type: 'kr',
                  status: kr.status,
                  link: `/org-objective/${orgObjectiveId}/okr/${kr.id}`,
                  children: [],
                };
                foNode.children.push(krNode);
              }

              const indNode: FlowNode = {
                id: ind.id,
                name: ind.name,
                type: 'kpi',
                status: ind.status,
                tier: ind.tier,
                link: `/org-objective/${orgObjectiveId}/indicator/${ind.id}`,
                children: [],
              };
              krNode.children.push(indNode);
            }
          });
        });
      });
    });

    orgNode.children = Array.from(deptMap.values());
    return orgNode;
  }, [departments, filterType, filterId, orgObjectiveId, orgObjectiveName]);

  const expandAll = () => {
    const allNodeIds = new Set<string>(['source', 'org']);
    flowTree.children.forEach(dept => {
      allNodeIds.add(dept.id);
      dept.children.forEach(fo => {
        allNodeIds.add(fo.id);
        fo.children.forEach(kr => {
          allNodeIds.add(kr.id);
        });
      });
    });
    setExpandedNodes(allNodeIds);
  };

  const hasData = impactData.indicators.size > 0;
  const Icon = filterType === 'customer' ? Users : Boxes;

  const getNodeIcon = (type: FlowNode['type']) => {
    switch (type) {
      case 'source': return filterType === 'customer' ? Users : Boxes;
      case 'org': return Target;
      case 'dept': return Building2;
      case 'fo': return Target;
      case 'kr': return Settings;
      case 'kpi': return Activity;
    }
  };

  const getNodeColor = (type: FlowNode['type']) => {
    switch (type) {
      case 'source': return filterType === 'customer' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-purple-500/10 border-purple-500/50';
      case 'org': return 'bg-primary/10 border-primary/50';
      case 'dept': return 'bg-orange-500/10 border-orange-500/50';
      case 'fo': return 'bg-cyan-500/10 border-cyan-500/50';
      case 'kr': return 'bg-amber-500/10 border-amber-500/50';
      case 'kpi': return 'bg-emerald-500/10 border-emerald-500/50';
    }
  };

  const getNodeLabel = (type: FlowNode['type']) => {
    switch (type) {
      case 'source': return filterType === 'customer' ? 'Customer' : 'Feature';
      case 'org': return 'Org Objective';
      case 'dept': return 'Department';
      case 'fo': return 'Functional Objective';
      case 'kr': return 'Key Result';
      case 'kpi': return 'KPI';
    }
  };

  const renderNode = (node: FlowNode, level: number = 0) => {
    const NodeIcon = getNodeIcon(node.type);
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isClickable = node.link;

    const nodeContent = (
      <div 
        className={cn(
          'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
          getNodeColor(node.type),
          isClickable && 'hover:scale-[1.02] cursor-pointer'
        )}
      >
        <NodeIcon className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
              {getNodeLabel(node.type)}
            </Badge>
            {node.status && <RAGBadge status={node.status} size="sm" />}
            {node.tier && (
              <Badge variant="secondary" className="text-[10px] px-1.5">{node.tier}</Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate mt-1">{node.name}</p>
        </div>
        {hasChildren && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleNode(node.id);
            }}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>
    );

    return (
      <div key={node.id} className="w-full">
        {isClickable ? (
          <Link to={node.link!}>{nodeContent}</Link>
        ) : (
          nodeContent
        )}
        
        {hasChildren && isExpanded && (
          <div className="mt-2 ml-6 pl-4 border-l-2 border-muted space-y-2">
            <div className="flex items-center gap-2 -ml-4 text-muted-foreground">
              <ArrowDown className="h-4 w-4 ml-[6px]" />
              <span className="text-xs">{node.children.length} linked</span>
            </div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={cn(
      'border-2 transition-colors',
      filterType === 'customer' ? 'border-blue-500/50 bg-blue-500/5' : 'border-purple-500/50 bg-purple-500/5'
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className={cn(
                'h-5 w-5',
                filterType === 'customer' ? 'text-blue-500' : 'text-purple-500'
              )} />
              <span className="capitalize">{filterType}</span> Impact: {filterName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Link to={filterType === 'customer' ? `/customers/${filterId}` : `/features/${filterId}`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View Full Impact <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-2">
            {hasData ? (
              <div className="space-y-4">
                {/* Summary Stats - Always visible */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-bold">{impactData.departments.size}</p>
                      <p className="text-xs text-muted-foreground">Departments</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-bold">{impactData.keyResults.size}</p>
                      <p className="text-xs text-muted-foreground">Key Results</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-bold">{impactData.indicators.size}</p>
                      <p className="text-xs text-muted-foreground">KPIs</p>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">KPI Status:</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-rag-green" />
                      {impactData.statusBreakdown.green}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-rag-amber" />
                      {impactData.statusBreakdown.amber}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-rag-red" />
                      {impactData.statusBreakdown.red}
                    </span>
                    {impactData.statusBreakdown.notSet > 0 && (
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                        {impactData.statusBreakdown.notSet}
                      </span>
                    )}
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center justify-between border-t pt-4">
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'flow' | 'list')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="flow" className="gap-1.5 text-xs px-3">
                        <GitBranch className="h-3.5 w-3.5" />
                        Flow View
                      </TabsTrigger>
                      <TabsTrigger value="list" className="gap-1.5 text-xs px-3">
                        <List className="h-3.5 w-3.5" />
                        List View
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {viewMode === 'flow' && (
                    <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs gap-1">
                      <Maximize2 className="h-3 w-3" /> Expand All
                    </Button>
                  )}
                </div>

                {/* Flow View */}
                {viewMode === 'flow' && (
                  <div className="space-y-3">
                    {/* Source node */}
                    <div 
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border-2',
                        getNodeColor('source')
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {filterType === 'customer' ? 'Customer' : 'Feature'}
                        </Badge>
                        <p className="text-sm font-medium mt-1">{filterName}</p>
                      </div>
                    </div>

                    {/* Arrow to org */}
                    <div className="flex justify-center">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <ArrowDown className="h-5 w-5" />
                        <span className="text-xs">impacts</span>
                      </div>
                    </div>

                    {/* Org Objective with nested hierarchy */}
                    {renderNode(flowTree)}

                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t text-xs text-muted-foreground">
                      <span className="font-medium">Flow:</span>
                      <span className={cn('px-2 py-0.5 rounded', getNodeColor('source').split(' ')[0])}>
                        {filterType === 'customer' ? 'Customer' : 'Feature'}
                      </span>
                      <span>→</span>
                      <span className={cn('px-2 py-0.5 rounded', getNodeColor('org').split(' ')[0])}>Org Objective</span>
                      <span>→</span>
                      <span className={cn('px-2 py-0.5 rounded', getNodeColor('dept').split(' ')[0])}>Department</span>
                      <span>→</span>
                      <span className={cn('px-2 py-0.5 rounded', getNodeColor('fo').split(' ')[0])}>FO</span>
                      <span>→</span>
                      <span className={cn('px-2 py-0.5 rounded', getNodeColor('kr').split(' ')[0])}>KR</span>
                      <span>→</span>
                      <span className={cn('px-2 py-0.5 rounded', getNodeColor('kpi').split(' ')[0])}>KPI</span>
                    </div>
                  </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <div className="space-y-4">
                    {/* Departments */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Departments Impacted
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(impactData.departmentNames.entries()).map(([id, name]) => (
                          <Badge key={id} variant="outline">{name}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Key Results */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Key Results Linked
                      </h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {Array.from(impactData.keyResults.entries()).map(([id, { kr, foName, deptName, status }]) => (
                          <div 
                            key={id} 
                            className="flex items-center justify-between p-2 rounded-lg bg-background/50 text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <RAGBadge status={status} size="sm" />
                              <Link 
                                to={`/org-objective/${orgObjectiveId}/okr/${id}`}
                                className="font-medium hover:underline truncate"
                              >
                                {kr.name}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                              <span>{deptName}</span>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{foName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KPIs */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        KPIs Linked
                      </h4>
                      <div className="space-y-1 max-h-[150px] overflow-y-auto">
                        {Array.from(impactData.indicators.entries()).map(([id, { ind, krName, status }]) => (
                          <div 
                            key={id} 
                            className="flex items-center justify-between p-1.5 rounded bg-background/30 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <RAGBadge status={status} size="sm" />
                              <Link 
                                to={`/org-objective/${orgObjectiveId}/indicator/${id}`}
                                className="hover:underline truncate"
                              >
                                {ind.name}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                              <Badge variant="outline" className="text-xs px-1.5">{ind.tier}</Badge>
                              <span className="truncate max-w-[120px]">{krName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No KPIs linked to this {filterType}</p>
                <p className="text-xs">Link KPIs to see their impact here</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}