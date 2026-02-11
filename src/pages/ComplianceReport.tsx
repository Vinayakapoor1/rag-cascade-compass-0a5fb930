import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, Clock, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ComplianceReport() {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const { data: csms = [], isLoading: csmsLoading } = useQuery({
    queryKey: ['compliance-report-csms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('csms').select('id, name, email, user_id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['compliance-report-scores', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('customer_id, period, created_at')
        .eq('period', currentPeriod);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['compliance-report-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, csm_id')
        .not('csm_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = csmsLoading || scoresLoading || customersLoading || authLoading;

  const complianceData = useMemo(() => {
    if (csms.length === 0) return { compliant: [], nonCompliant: [], total: 0 };

    const customersByCsm = new Map<string, { id: string; name: string }[]>();
    customers.forEach(c => {
      if (!c.csm_id) return;
      if (!customersByCsm.has(c.csm_id)) customersByCsm.set(c.csm_id, []);
      customersByCsm.get(c.csm_id)!.push({ id: c.id, name: c.name });
    });

    const customersWithScores = new Set(scores.map(s => s.customer_id));

    const compliant: { name: string; email: string | null; customerCount: number; lastSubmitted: string | null }[] = [];
    const nonCompliant: { name: string; email: string | null; customerCount: number; pendingCustomers: string[] }[] = [];

    csms.forEach(csm => {
      const csmCustomers = customersByCsm.get(csm.id) || [];
      if (csmCustomers.length === 0) return;

      const pending = csmCustomers.filter(c => !customersWithScores.has(c.id));
      const submitted = csmCustomers.filter(c => customersWithScores.has(c.id));

      if (pending.length === 0) {
        const latestScore = scores
          .filter(s => csmCustomers.some(c => c.id === s.customer_id))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        compliant.push({
          name: csm.name,
          email: csm.email,
          customerCount: csmCustomers.length,
          lastSubmitted: latestScore?.created_at || null,
        });
      } else {
        nonCompliant.push({
          name: csm.name,
          email: csm.email,
          customerCount: csmCustomers.length,
          pendingCustomers: pending.map(c => c.name),
        });
      }
    });

    return { compliant, nonCompliant, total: compliant.length + nonCompliant.length };
  }, [csms, scores, customers]);

  // Deadline info
  const deadlineLabel = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = (5 - day + 7) % 7;
    if (diff === 0) return 'Today (Friday) 11:30 PM';
    if (diff === 1) return 'Tomorrow 11:30 PM';
    return `Friday 11:30 PM (in ${diff} days)`;
  }, []);

  if (!authLoading && (!user || !isAdmin)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">📋 CSM Compliance Report</h1>
          <p className="text-sm text-muted-foreground">
            Period: {currentPeriod} • Deadline: {deadlineLabel}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="card-3d">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{complianceData.total}</p>
                    <p className="text-xs text-muted-foreground">Total CSMs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-3d border-l-4 border-l-rag-green">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-rag-green" />
                  <div>
                    <p className="text-2xl font-bold">{complianceData.compliant.length}</p>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-3d border-l-4 border-l-rag-red">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-rag-red" />
                  <div>
                    <p className="text-2xl font-bold">{complianceData.nonCompliant.length}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Non-Compliant CSMs */}
          {complianceData.nonCompliant.length > 0 && (
            <Card className="card-3d border-l-4 border-l-rag-red">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rag-red" />
                  Pending Check-ins ({complianceData.nonCompliant.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceData.nonCompliant.map(csm => (
                    <div key={csm.name} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{csm.name}</p>
                        {csm.email && <p className="text-xs text-muted-foreground">{csm.email}</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {csm.pendingCustomers.map(customer => (
                            <Badge key={customer} variant="outline" className="text-[10px] border-rag-red/30 text-rag-red">
                              {customer}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        {csm.pendingCustomers.length}/{csm.customerCount} pending
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliant CSMs */}
          {complianceData.compliant.length > 0 && (
            <Card className="card-3d border-l-4 border-l-rag-green">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-rag-green" />
                  Completed ({complianceData.compliant.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {complianceData.compliant.map(csm => (
                    <div key={csm.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-semibold text-sm">{csm.name}</p>
                        {csm.email && <p className="text-xs text-muted-foreground">{csm.email}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-rag-green/30 text-rag-green">
                          {csm.customerCount} customers
                        </Badge>
                        <CheckCircle2 className="h-4 w-4 text-rag-green" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
