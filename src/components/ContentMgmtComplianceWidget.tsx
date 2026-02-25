import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function ContentMgmtComplianceWidget() {
  const [expanded, setExpanded] = useState(false);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Get Content Management department
  const { data: deptId } = useQuery({
    queryKey: ['content-mgmt-dept-id'],
    queryFn: async () => {
      const { data } = await supabase
        .from('departments')
        .select('id')
        .eq('name', 'Content Management')
        .maybeSingle();
      return data?.id || null;
    },
    staleTime: 300000,
  });

  // Get managed-services customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['content-mgmt-compliance-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('managed_services', true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Get scores for current period
  const { data: scores = [], isLoading: scoresLoading, dataUpdatedAt: scoresUpdatedAt } = useQuery({
    queryKey: ['content-mgmt-compliance-scores', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('customer_id, period')
        .eq('period', currentPeriod);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const isLoading = customersLoading || scoresLoading;

  const complianceData = useMemo(() => {
    if (customers.length === 0) return { scored: [], pending: [], total: 0 };

    const customersWithScores = new Set(scores.map(s => s.customer_id));

    const scored: { name: string }[] = [];
    const pending: { name: string }[] = [];

    customers.forEach(c => {
      if (customersWithScores.has(c.id)) {
        scored.push({ name: c.name });
      } else {
        pending.push({ name: c.name });
      }
    });

    return { scored, pending, total: customers.length };
  }, [customers, scores]);

  // Deadline info
  const deadlineLabel = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = (5 - day + 7) % 7;
    if (diff === 0) return 'Today 11:30 PM';
    if (diff === 1) return 'Tomorrow 11:30 PM';
    return `Friday 11:30 PM (${diff} days)`;
  }, []);

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (complianceData.total === 0) return null;

  const allScored = complianceData.pending.length === 0;
  const pendingCount = complianceData.pending.length;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className={cn(
        "border-l-4 transition-all cursor-pointer",
        allScored ? "border-l-rag-green" : "border-l-rag-amber"
      )}>
        <CollapsibleTrigger asChild>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {allScored ? (
                  <CheckCircle2 className="h-5 w-5 text-rag-green shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rag-amber shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {allScored
                      ? '✅ All managed-services customers scored'
                      : `📋 Content Mgmt: ${pendingCount} customer${pendingCount !== 1 ? 's' : ''} pending`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentPeriod} • {complianceData.scored.length}/{complianceData.total} scored
                    {scoresUpdatedAt ? ` • Updated ${formatDistanceToNow(new Date(scoresUpdatedAt), { addSuffix: true })}` : ''}
                    {' • Deadline: '}{deadlineLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {pendingCount} pending
                  </Badge>
                )}
                {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 border-t">
            <div className="mt-3 space-y-2">
              {complianceData.pending.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-medium text-rag-red">Not Scored:</span>
                  {complianceData.pending.slice(0, 15).map(c => (
                    <Badge key={c.name} variant="outline" className="text-[10px] border-rag-red/40 text-rag-red">
                      {c.name}
                    </Badge>
                  ))}
                  {complianceData.pending.length > 15 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{complianceData.pending.length - 15} more
                    </Badge>
                  )}
                </div>
              )}
              {complianceData.scored.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-medium text-rag-green">Scored:</span>
                  {complianceData.scored.slice(0, 15).map(c => (
                    <Badge key={c.name} variant="outline" className="text-[10px] border-rag-green/40 text-rag-green">
                      {c.name}
                    </Badge>
                  ))}
                  {complianceData.scored.length > 15 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{complianceData.scored.length - 15} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
