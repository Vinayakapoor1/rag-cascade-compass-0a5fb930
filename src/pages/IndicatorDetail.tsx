import { useParams, Navigate, Link } from 'react-router-dom';
import { useOrgObjectiveById } from '@/hooks/useOrgObjectives';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { RAGBadge } from '@/components/RAGBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  getIndicatorTierClasses, 
  getOrgObjectiveColorClasses, 
  getRAGMutedBg
} from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  Calculator, 
  Clock,
  Target,
  ArrowRight
} from 'lucide-react';

export default function IndicatorDetail() {
  const { orgObjectiveId, indicatorId } = useParams<{ orgObjectiveId: string; indicatorId: string }>();
  const { data: objective, isLoading } = useOrgObjectiveById(orgObjectiveId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Find the indicator in the objective hierarchy
  let indicator = null;
  let keyResult = null;
  let functionalObjective = null;
  
  if (objective) {
    for (const dept of objective.departments) {
      for (const fo of dept.functionalObjectives) {
        for (const kr of fo.keyResults) {
          const ind = kr.indicators?.find(i => i.id === indicatorId);
          if (ind) {
            indicator = ind;
            keyResult = kr;
            functionalObjective = fo;
            break;
          }
        }
        if (indicator) break;
      }
      if (indicator) break;
    }
  }

  if (!objective || !indicator || !keyResult || !functionalObjective) {
    return <Navigate to="/" replace />;
  }

  const tierClasses = getIndicatorTierClasses(indicator.tier);
  const orgColorClasses = getOrgObjectiveColorClasses(objective.color);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <DrilldownBreadcrumb 
        items={[
          { label: 'Portfolio', href: '/' },
          { label: objective.name, href: `/org-objective/${orgObjectiveId}` },
          { label: 'OKRs', href: `/org-objective/${orgObjectiveId}/okr` },
          { label: keyResult.name, href: `/org-objective/${orgObjectiveId}/okr/${keyResult.id}` },
          { label: indicator.name }
        ]} 
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          {/* Parent Context */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Badge 
              variant="outline" 
              className={cn('border-2', orgColorClasses.border, orgColorClasses.text)}
            >
              {objective.name}
            </Badge>
            <span>→</span>
            <Badge variant="outline">{functionalObjective.name}</Badge>
            <span>→</span>
            <Badge variant="outline">{keyResult.name}</Badge>
          </div>
          
          {/* Indicator Name */}
          <h1 className="text-3xl font-bold tracking-tight">{indicator.name}</h1>
          
          {/* Tier Badge */}
          <div className="flex items-center gap-3">
            <span className={cn(
              'text-sm px-3 py-1 rounded-full font-medium',
              tierClasses.bg,
              tierClasses.text
            )}>
              {tierClasses.label}
            </span>
          </div>
        </div>
        <RAGBadge status={indicator.status} size="lg" showLabel pulse />
      </div>

      {/* Indicator Details Card */}
      <Card className={cn('border-l-4', orgColorClasses.border)}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calculator className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Formula</p>
                  <p className="text-sm text-muted-foreground">{indicator.formula || 'Not defined'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Measurement Frequency</p>
                  <p className="text-sm text-muted-foreground">{indicator.frequency || 'Not defined'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {indicator.currentValue !== undefined && (
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Current Value</p>
                    <p className="text-2xl font-bold">{indicator.currentValue}</p>
                  </div>
                </div>
              )}
              {indicator.targetValue !== undefined && (
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Target Value</p>
                    <p className="text-2xl font-bold">{indicator.targetValue}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', tierClasses.bg)}>
                <Activity className={cn('h-5 w-5', tierClasses.text)} />
              </div>
              <div>
                <p className="text-sm font-medium">KPI</p>
                <p className="text-xs text-muted-foreground">Key Performance Indicator</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', getRAGMutedBg(indicator.status))}>
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">{indicator.status === 'green' ? 'On Track' : indicator.status === 'amber' ? 'At Risk' : indicator.status === 'red' ? 'Critical' : 'Not Set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parent Key Result Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parent Key Result</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            to={`/org-objective/${orgObjectiveId}/okr/${keyResult.id}`}
            className={cn(
              'block p-4 rounded-lg border-l-4 transition-colors hover:bg-muted/50',
              orgColorClasses.border,
              getRAGMutedBg(keyResult.status)
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{keyResult.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {keyResult.current.toLocaleString()} / {keyResult.target.toLocaleString()} {keyResult.unit} • Owner: {keyResult.owner || 'Not assigned'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RAGBadge status={keyResult.status} size="sm" />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
