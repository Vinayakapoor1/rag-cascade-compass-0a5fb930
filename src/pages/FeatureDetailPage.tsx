import { useParams, Navigate, Link } from 'react-router-dom';
import { useFeatureImpact } from '@/hooks/useFeatureImpact';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { RAGBadge } from '@/components/RAGBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Puzzle, Target, Building2, BarChart3, Settings, Activity, 
  Loader2, ChevronRight, TrendingUp 
} from 'lucide-react';
import { getOrgObjectiveColorClasses, getRAGBorderColor, getRAGMutedBg } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { OrgObjectiveColor } from '@/types/venture';

export default function FeatureDetailPage() {
  const { featureId } = useParams<{ featureId: string }>();
  const { data: impact, isLoading, error } = useFeatureImpact(featureId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !impact) {
    return <Navigate to="/features" replace />;
  }

  const hasLinks = impact.totalIndicators > 0;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <DrilldownBreadcrumb 
        items={[
          { label: 'Portfolio', href: '/' },
          { label: 'Features', href: '/features' },
          { label: impact.featureName }
        ]} 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Puzzle className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{impact.featureName}</h1>
            {impact.featureCategory && (
              <Badge variant="outline">{impact.featureCategory}</Badge>
            )}
            {impact.featureStatus && (
              <Badge variant={impact.featureStatus === 'Active' ? 'default' : 'secondary'}>
                {impact.featureStatus}
              </Badge>
            )}
          </div>
          {impact.featureDescription && (
            <p className="text-muted-foreground">{impact.featureDescription}</p>
          )}
        </div>
      </div>

      {/* Impact Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{impact.totalOrgObjectives}</p>
                <p className="text-xs text-muted-foreground">Org Objectives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{impact.totalDepartments}</p>
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
                <p className="text-2xl font-bold">{impact.totalFunctionalObjectives}</p>
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
                <p className="text-2xl font-bold">{impact.totalKeyResults}</p>
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
                <p className="text-2xl font-bold">{impact.totalIndicators}</p>
                <p className="text-xs text-muted-foreground">KPIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {hasLinks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              KPI Health Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-rag-green" />
                <span className="font-semibold">{impact.statusBreakdown.green}</span>
                <span className="text-muted-foreground text-sm">On Track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-rag-amber" />
                <span className="font-semibold">{impact.statusBreakdown.amber}</span>
                <span className="text-muted-foreground text-sm">At Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-rag-red" />
                <span className="font-semibold">{impact.statusBreakdown.red}</span>
                <span className="text-muted-foreground text-sm">Critical</span>
              </div>
              {impact.statusBreakdown.notSet > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-muted-foreground/30" />
                  <span className="font-semibold">{impact.statusBreakdown.notSet}</span>
                  <span className="text-muted-foreground text-sm">Not Set</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Impact Hierarchy */}
      {hasLinks ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Impact Hierarchy</h2>
          
          <Accordion type="multiple" className="w-full space-y-4">
            {Array.from(impact.byOrgObjective.entries()).map(([orgId, org]) => {
              const colorClasses = getOrgObjectiveColorClasses(org.color as OrgObjectiveColor);
              
              return (
                <AccordionItem 
                  key={orgId} 
                  value={orgId}
                  className={cn(
                    'border rounded-lg border-l-4 px-4',
                    colorClasses.border,
                    colorClasses.bg
                  )}
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left flex-1">
                      <div className={cn('p-1.5 rounded-md', colorClasses.bg)}>
                        <Target className={cn('h-4 w-4', colorClasses.text)} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{org.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {org.departments.size} Departments
                        </p>
                      </div>
                      <Link 
                        to={`/org-objective/${orgId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {Array.from(org.departments.entries()).map(([deptId, dept]) => (
                        <div key={deptId} className="ml-4 border-l-2 border-muted pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{dept.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {dept.functionalObjectives.size} FOs
                            </Badge>
                          </div>
                          
                          <div className="space-y-3 ml-6">
                            {Array.from(dept.functionalObjectives.entries()).map(([foId, fo]) => (
                              <div key={foId} className="border-l-2 border-muted/50 pl-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{fo.name}</span>
                                </div>
                                
                                <div className="space-y-2 ml-5">
                                  {Array.from(fo.keyResults.entries()).map(([krId, kr]) => (
                                    <div 
                                      key={krId}
                                      className={cn(
                                        'p-3 rounded-lg border border-l-4',
                                        getRAGBorderColor(kr.status),
                                        getRAGMutedBg(kr.status)
                                      )}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <RAGBadge status={kr.status} size="sm" />
                                          <Link 
                                            to={`/org-objective/${orgId}/okr/${krId}`}
                                            className="font-medium text-sm hover:underline"
                                          >
                                            {kr.name}
                                          </Link>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                          {kr.indicators.length} KPIs
                                        </Badge>
                                      </div>
                                      
                                      <div className="grid gap-1.5 mt-2">
                                        {kr.indicators.map(ind => (
                                          <div 
                                            key={ind.id}
                                            className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1.5"
                                          >
                                            <div className="flex items-center gap-2">
                                              <RAGBadge status={ind.status} size="sm" />
                                              <Link 
                                                to={`/org-objective/${orgId}/indicator/${ind.id}`}
                                                className="hover:underline"
                                              >
                                                {ind.name}
                                              </Link>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <Badge variant="outline" className="text-xs px-1.5">
                                                {ind.tier}
                                              </Badge>
                                              {ind.currentValue !== null && ind.targetValue !== null && (
                                                <span>
                                                  {ind.currentValue} / {ind.targetValue}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No KPI Links Found</h3>
          <p className="text-muted-foreground">
            This feature is not linked to any KPIs yet. Link KPIs to see their impact on objectives.
          </p>
        </Card>
      )}
    </div>
  );
}
