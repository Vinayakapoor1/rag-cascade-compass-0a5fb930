import { useParams, Navigate, Link } from 'react-router-dom';
import { useOrgObjectiveById } from '@/hooks/useOrgObjectives';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { RAGBadge } from '@/components/RAGBadge';
import { IndicatorCard } from '@/components/IndicatorCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getRAGMutedBg, getOrgObjectiveColorClasses } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { Target, User, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function KeyResultDetail() {
  const { orgObjectiveId, krId } = useParams<{ orgObjectiveId: string; krId: string }>();
  const { data: objective, isLoading } = useOrgObjectiveById(orgObjectiveId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Find the key result in the objective hierarchy
  let keyResult = null;
  let functionalObjective = null;
  
  if (objective) {
    for (const dept of objective.departments) {
      for (const fo of dept.functionalObjectives) {
        const kr = fo.keyResults.find(k => k.id === krId);
        if (kr) {
          keyResult = kr;
          functionalObjective = fo;
          break;
        }
      }
      if (keyResult) break;
    }
  }

  if (!objective || !keyResult || !functionalObjective) {
    return <Navigate to="/" replace />;
  }

  const progress = keyResult.target > 0 ? (keyResult.current / keyResult.target) * 100 : 0;
  const isOnTrack = progress >= 100 || keyResult.status === 'green';
  const orgColorClasses = getOrgObjectiveColorClasses(objective.color);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <DrilldownBreadcrumb 
        items={[
          { label: 'Portfolio', href: '/' },
          { label: objective.name, href: `/org-objective/${orgObjectiveId}` },
          { label: 'OKRs', href: `/org-objective/${orgObjectiveId}/okr` },
          { label: keyResult.name }
        ]} 
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Badge 
              variant="outline" 
              className={cn('border-2', orgColorClasses.border, orgColorClasses.text)}
            >
              {objective.name}
            </Badge>
            <span>→</span>
            <Badge variant="outline">{functionalObjective.name}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{keyResult.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            Owner: {keyResult.owner || 'Not assigned'}
          </p>
        </div>
        <RAGBadge status={keyResult.status} size="lg" showLabel pulse />
      </div>

      {/* Progress Card */}
      <Card className={cn('border-l-4', orgColorClasses.border)}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Progress</span>
              <div className="flex items-center gap-2">
                {isOnTrack ? (
                  <TrendingUp className="h-4 w-4 text-rag-green" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rag-red" />
                )}
                <span className="text-2xl font-bold">{Math.round(progress)}%</span>
              </div>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current: {keyResult.current.toLocaleString()} {keyResult.unit}</span>
              <span className="text-muted-foreground">Target: {keyResult.target.toLocaleString()} {keyResult.unit}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicators Section */}
      {keyResult.indicators && keyResult.indicators.length > 0 && (
        <Card className={cn('border-l-4', orgColorClasses.border)}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                KPIs ({keyResult.indicators.length})
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {keyResult.indicators.length} Key Performance Indicators
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {keyResult.indicators.map(indicator => (
                <IndicatorCard 
                  key={indicator.id}
                  indicator={indicator}
                  orgObjectiveId={orgObjectiveId!}
                  orgColor={objective.color}
                />
              ))}
            </div>
            {/* RAG Status Explanation */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p className="font-medium mb-1">How KR Status is Derived:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><span className="text-rag-red font-medium">Critical:</span> ≥50% of KPIs are Red</li>
                <li><span className="text-rag-amber font-medium">At Risk:</span> ≥30% Red, OR ≥50% Amber</li>
                <li><span className="text-rag-green font-medium">On Track:</span> Otherwise</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{keyResult.indicators?.length || 0}</p>
                <p className="text-xs text-muted-foreground">KPIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', getRAGMutedBg(keyResult.status))}>
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {keyResult.target - keyResult.current > 0 
                    ? (keyResult.target - keyResult.current).toLocaleString() 
                    : '0'}
                </p>
                <p className="text-xs text-muted-foreground">Gap to Target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
