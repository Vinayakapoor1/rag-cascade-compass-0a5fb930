import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useOrgObjectiveById } from '@/hooks/useOrgObjectives';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { RAGBadge } from '@/components/RAGBadge';
import { IndicatorCard } from '@/components/IndicatorCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getRAGMutedBg, getOrgObjectiveColorClasses } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { Target, User, TrendingUp, TrendingDown, Activity, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export default function KeyResultDetail() {
  const { orgObjectiveId, krId } = useParams<{ orgObjectiveId: string; krId: string }>();
  const { data: objective, isLoading } = useOrgObjectiveById(orgObjectiveId || '');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

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

  const handleResetKR = async () => {
    if (!keyResult?.indicators?.length) {
      toast.error('No indicators to reset');
      return;
    }

    setResetting(true);
    try {
      const indicatorIds = keyResult.indicators.map(ind => ind.id);

      // Reset all indicators for this KR
      const { error } = await supabase
        .from('indicators')
        .update({
          current_value: null,
          evidence_url: null,
          evidence_type: null,
          no_evidence_reason: null,
          rag_status: 'not-set',
        })
        .in('id', indicatorIds);

      if (error) throw error;

      // Delete history for these indicators
      const { error: historyError } = await supabase
        .from('indicator_history')
        .delete()
        .in('indicator_id', indicatorIds);

      if (historyError) {
        console.warn('History delete error:', historyError);
      }

      toast.success('Key Result data reset successfully');
      queryClient.invalidateQueries({ queryKey: ['org-objectives'] });
      setResetDialogOpen(false);
    } catch (error: any) {
      console.error('Error resetting KR:', error);
      toast.error(error.message || 'Failed to reset Key Result');
    } finally {
      setResetting(false);
    }
  };

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
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setResetDialogOpen(true)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset KR
            </Button>
          )}
          <RAGBadge status={keyResult.status} size="lg" showLabel pulse />
        </div>
      </div>

      {/* Reset KR Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Key Result Data?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>This will reset all indicators for:</p>
                <p className="font-medium text-foreground">{keyResult.name}</p>
                <p className="mt-2">All values, evidence, and history for these indicators will be deleted. This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetKR}
              disabled={resetting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {resetting ? 'Resetting...' : 'Reset Key Result'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
