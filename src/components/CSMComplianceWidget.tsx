import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CSMComplianceWidget() {
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Get all CSMs
  const { data: csms = [], isLoading: csmsLoading } = useQuery({
    queryKey: ['compliance-csms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csms')
        .select('id, name, email');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Get all scores for current period to determine compliance
  const { data: scores = [], isLoading: scoresLoading } = useQuery({
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

  // Get customer-to-CSM mapping
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

  // Compute compliance per CSM
  const complianceData = useMemo(() => {
    if (csms.length === 0) return { compliant: [], nonCompliant: [], total: 0 };

    const customersByCsm = new Map<string, string[]>();
    customers.forEach(c => {
      if (!c.csm_id) return;
      if (!customersByCsm.has(c.csm_id)) customersByCsm.set(c.csm_id, []);
      customersByCsm.get(c.csm_id)!.push(c.id);
    });

    const customersWithScores = new Set(scores.map(s => s.customer_id));

    const compliant: { name: string; email: string | null }[] = [];
    const nonCompliant: { name: string; email: string | null }[] = [];

    csms.forEach(csm => {
      const csmCustomers = customersByCsm.get(csm.id) || [];
      if (csmCustomers.length === 0) return; // Skip CSMs with no customers
      const hasScores = csmCustomers.some(cId => customersWithScores.has(cId));
      if (hasScores) {
        compliant.push({ name: csm.name, email: csm.email });
      } else {
        nonCompliant.push({ name: csm.name, email: csm.email });
      }
    });

    return { compliant, nonCompliant, total: compliant.length + nonCompliant.length };
  }, [csms, scores, customers]);

  // Days until Friday
  const daysUntilFriday = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 5=Fri
    const diff = (5 - day + 7) % 7;
    return diff === 0 ? 0 : diff; // 0 means today is Friday
  }, []);

  const deadlineLabel = daysUntilFriday === 0 
    ? 'Today 11:30 PM' 
    : daysUntilFriday === 1 
      ? 'Tomorrow (Friday) 11:30 PM' 
      : `${daysUntilFriday} days (Friday 11:30 PM)`;

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (complianceData.total === 0) return null;

  const allCompliant = complianceData.nonCompliant.length === 0;
  const complianceRate = Math.round((complianceData.compliant.length / complianceData.total) * 100);

  return (
    <Card className={cn(
      "border-l-4 transition-all",
      allCompliant ? "border-l-rag-green bg-rag-green/5" : "border-l-rag-amber bg-rag-amber/5"
    )}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              allCompliant ? "bg-rag-green/10" : "bg-rag-amber/10"
            )}>
              {allCompliant ? (
                <CheckCircle2 className="h-5 w-5 text-rag-green" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rag-amber" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm flex items-center gap-2">
                CSM Weekly Check-in — {currentPeriod}
                <Badge variant={allCompliant ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                  {complianceRate}%
                </Badge>
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>Deadline: {deadlineLabel}</span>
              </div>

              {complianceData.nonCompliant.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">Pending:</span>
                  {complianceData.nonCompliant.map(csm => (
                    <Badge key={csm.name} variant="outline" className="text-[10px] border-rag-red/40 text-rag-red">
                      {csm.name}
                    </Badge>
                  ))}
                </div>
              )}

              {complianceData.compliant.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">Completed:</span>
                  {complianceData.compliant.map(csm => (
                    <Badge key={csm.name} variant="outline" className="text-[10px] border-rag-green/40 text-rag-green">
                      {csm.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {complianceData.compliant.length}/{complianceData.total}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
