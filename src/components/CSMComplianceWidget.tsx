import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function CSMComplianceWidget() {
  const [expanded, setExpanded] = useState(false);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const { data: csms = [], isLoading: csmsLoading } = useQuery({
    queryKey: ['compliance-csms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('csms').select('id, name, email');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: scores = [], isLoading: scoresLoading, dataUpdatedAt: scoresUpdatedAt } = useQuery({
    queryKey: ['compliance-scores', currentPeriod],
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

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['compliance-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, csm_id')
        .not('csm_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const isLoading = csmsLoading || scoresLoading || customersLoading;

  const complianceData = useMemo(() => {
    if (csms.length === 0) return { compliant: [], nonCompliant: [], total: 0 };

    const customersByCsm = new Map<string, string[]>();
    customers.forEach(c => {
      if (!c.csm_id) return;
      if (!customersByCsm.has(c.csm_id)) customersByCsm.set(c.csm_id, []);
      customersByCsm.get(c.csm_id)!.push(c.id);
    });

    const customersWithScores = new Set(scores.map(s => s.customer_id));

    const compliant: { name: string }[] = [];
    const nonCompliant: { name: string }[] = [];

    csms.forEach(csm => {
      const csmCustomers = customersByCsm.get(csm.id) || [];
      if (csmCustomers.length === 0) return;
      const hasScores = csmCustomers.some(cId => customersWithScores.has(cId));
      if (hasScores) {
        compliant.push({ name: csm.name });
      } else {
        nonCompliant.push({ name: csm.name });
      }
    });

    return { compliant, nonCompliant, total: compliant.length + nonCompliant.length };
  }, [csms, scores, customers]);

  // Days until Friday
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

  const allCompliant = complianceData.nonCompliant.length === 0;
  const pendingCount = complianceData.nonCompliant.length;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className={cn(
        "border-l-4 transition-all cursor-pointer",
        allCompliant ? "border-l-rag-green" : "border-l-rag-amber"
      )}>
        <CollapsibleTrigger asChild>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {allCompliant ? (
                  <CheckCircle2 className="h-5 w-5 text-rag-green shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rag-amber shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {allCompliant
                      ? '✅ All CSMs have checked in'
                      : `📋 1 Compliance Report Available`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentPeriod} • {complianceData.compliant.length}/{complianceData.total} submitted
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
              {complianceData.nonCompliant.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-medium text-rag-red">Not Updated:</span>
                  {complianceData.nonCompliant.map(csm => (
                    <Badge key={csm.name} variant="outline" className="text-[10px] border-rag-red/40 text-rag-red">
                      {csm.name}
                    </Badge>
                  ))}
                </div>
              )}
              {complianceData.compliant.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-medium text-rag-green">Updated:</span>
                  {complianceData.compliant.map(csm => (
                    <Badge key={csm.name} variant="outline" className="text-[10px] border-rag-green/40 text-rag-green">
                      {csm.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
