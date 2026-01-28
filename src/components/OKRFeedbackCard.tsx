import { Link } from 'react-router-dom';
import { Target, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RAGBadge } from './RAGBadge';
import { RAGStatus } from '@/types/venture';
import { cn } from '@/lib/utils';
import { getRAGMutedBg, getRAGBorderColor } from '@/lib/ragUtils';

interface AffectedKR {
  name: string;
  target: number;
  current: number;
  unit: string;
  status: RAGStatus;
  impactReason: string;
}

interface OKRFeedbackCardProps {
  orgObjectiveId: string;
  okrHealth: RAGStatus;
  affectedKRs: AffectedKR[];
}

export function OKRFeedbackCard({
  orgObjectiveId,
  okrHealth,
  affectedKRs,
}: OKRFeedbackCardProps) {
  const criticalKRs = affectedKRs.filter(kr => kr.status === 'red');
  const atRiskKRs = affectedKRs.filter(kr => kr.status === 'amber');

  return (
    <Card className={cn('border-l-4', getRAGBorderColor(okrHealth))}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', getRAGMutedBg(okrHealth))}>
              <Target className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">OKRs Affected by Customer Health</CardTitle>
              <p className="text-sm text-muted-foreground">
                Key Results impacted by customer metrics
              </p>
            </div>
          </div>
          <RAGBadge status={okrHealth} size="md" showLabel />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-rag-red-muted p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-4 w-4 text-rag-red" />
              <span className="text-2xl font-bold text-rag-red">{criticalKRs.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Critical KRs</p>
          </div>
          <div className="bg-rag-amber-muted p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-4 w-4 text-rag-amber" />
              <span className="text-2xl font-bold text-rag-amber">{atRiskKRs.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">At Risk KRs</p>
          </div>
        </div>

        {/* Affected KRs */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Affected Key Results</p>
          {affectedKRs.slice(0, 3).map((kr) => {
            const progress = (kr.current / kr.target) * 100;
            return (
              <div key={kr.name} className={cn('p-3 rounded-lg border-l-2', getRAGBorderColor(kr.status), 'bg-muted/30')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{kr.name}</span>
                  <RAGBadge status={kr.status} size="sm" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Progress value={Math.min(progress, 100)} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {kr.current.toLocaleString()}/{kr.target.toLocaleString()} {kr.unit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{kr.impactReason}</p>
              </div>
            );
          })}
        </div>

        {/* Link to OKRs */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to={`/org-objective/${orgObjectiveId}/okr`}>
            <Target className="h-4 w-4 mr-2" />
            View All OKRs
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
