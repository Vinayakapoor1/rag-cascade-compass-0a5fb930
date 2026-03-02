import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceSummaryCards } from '@/components/compliance/ComplianceSummaryCards';
import { ComplianceCustomerTable, type CustomerRow } from '@/components/compliance/ComplianceCustomerTable';
import type { ScoreRecord } from '@/components/compliance/ComplianceCustomerDetail';

export default function ComplianceReport() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<string>('current');

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // --- Queries ---
  const { data: csms = [], isLoading: csmsLoading, isFetching: csmsFetching, refetch: refetchCsms } = useQuery({
    queryKey: ['compliance-report-csms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('csms').select('id, name, email, user_id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customers = [], isLoading: customersLoading, isFetching: customersFetching, refetch: refetchCustomers } = useQuery({
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

  // Customer-feature mapping
  const { data: customerFeatures = [], isLoading: cfLoading } = useQuery({
    queryKey: ['compliance-customer-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_features')
        .select('customer_id, feature_id')
        .limit(50000);
      if (error) throw error;
      return data || [];
    },
  });

  // Feature names
  const { data: features = [] } = useQuery({
    queryKey: ['compliance-features'],
    queryFn: async () => {
      const { data, error } = await supabase.from('features').select('id, name');
      if (error) throw error;
      return data || [];
    },
  });

  // Current period scores (detailed with feature_id, indicator_id)
  const { data: currentScores = [], isLoading: scoresLoading, isFetching: scoresFetching, dataUpdatedAt: scoresUpdatedAt, refetch: refetchScores } = useQuery({
    queryKey: ['compliance-scores-current', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('customer_id, feature_id, indicator_id, period, created_at')
        .eq('period', currentPeriod)
        .limit(50000);
      if (error) throw error;
      return (data || []) as ScoreRecord[];
    },
  });

  // All-time scores (detailed)
  const { data: allTimeScores = [], isLoading: allTimeLoading, refetch: refetchAllTime } = useQuery({
    queryKey: ['compliance-scores-alltime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('customer_id, feature_id, indicator_id, period, created_at')
        .limit(50000);
      if (error) throw error;
      return (data || []) as ScoreRecord[];
    },
  });

  // Indicator-feature links
  const { data: featureLinks = [], isLoading: linksLoading } = useQuery({
    queryKey: ['compliance-feature-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicator_feature_links')
        .select('indicator_id, feature_id');
      if (error) throw error;
      return data || [];
    },
  });

  // Recent activity
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['compliance-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, entity_type, entity_name, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // CSM name map
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    csms.forEach(csm => { if (csm.user_id) map[csm.user_id] = csm.name; });
    return map;
  }, [csms]);

  // Per-customer feature mapping
  const customerFeaturesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    customerFeatures.forEach(cf => {
      const list = map.get(cf.customer_id) || [];
      list.push(cf.feature_id);
      map.set(cf.customer_id, list);
    });
    return map;
  }, [customerFeatures]);

  // Feature name map
  const featureNameMap = useMemo(() => {
    return new Map(features.map(f => [f.id, f.name]));
  }, [features]);

  // Per-customer expected count: count indicator-feature links where feature is in customer's features
  const customerExpectedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [custId, featureIds] of customerFeaturesMap.entries()) {
      const featureSet = new Set(featureIds);
      const expected = featureLinks.filter(l => featureSet.has(l.feature_id)).length;
      map.set(custId, expected);
    }
    return map;
  }, [customerFeaturesMap, featureLinks]);

  // Build customer rows
  const buildRows = (scores: ScoreRecord[]): CustomerRow[] => {
    const scoresByCustomer = new Map<string, { count: number; latest: string }>();
    scores.forEach(s => {
      const existing = scoresByCustomer.get(s.customer_id);
      if (!existing) {
        scoresByCustomer.set(s.customer_id, { count: 1, latest: s.created_at });
      } else {
        existing.count++;
        if (s.created_at > existing.latest) existing.latest = s.created_at;
      }
    });

    // Last ever submission from all-time data
    const lastEver = new Map<string, string>();
    allTimeScores.forEach(s => {
      const prev = lastEver.get(s.customer_id);
      if (!prev || s.created_at > prev) lastEver.set(s.customer_id, s.created_at);
    });

    const csmMap = new Map(csms.map(c => [c.id, c]));

    return customers.map(cust => {
      const csm = csmMap.get(cust.csm_id!);
      const scoreInfo = scoresByCustomer.get(cust.id);
      const count = scoreInfo?.count || 0;
      const totalExpected = customerExpectedMap.get(cust.id) || 0;
      let status: 'complete' | 'partial' | 'pending' = 'pending';
      if (count > 0 && count >= totalExpected) status = 'complete';
      else if (count > 0) status = 'partial';

      return {
        customerId: cust.id,
        customerName: cust.name,
        csmName: csm?.name || 'Unassigned',
        csmEmail: csm?.email || null,
        scoresThisPeriod: count,
        totalExpected,
        lastEverSubmission: lastEver.get(cust.id) || null,
        status,
      };
    });
  };

  const currentRows = useMemo(() => buildRows(currentScores), [currentScores, allTimeScores, customers, csms, customerExpectedMap]);
  const allTimeRows = useMemo(() => buildRows(allTimeScores), [allTimeScores, customers, csms, customerExpectedMap]);

  const computeStats = (rows: CustomerRow[]) => {
    const completed = rows.filter(r => r.status !== 'pending').length;
    const pending = rows.filter(r => r.status === 'pending').length;
    const csmWithSubmissions = new Set(rows.filter(r => r.status !== 'pending').map(r => r.csmName));
    const csmWithCustomers = new Set(rows.map(r => r.csmName));
    const pendingCsmCount = [...csmWithCustomers].filter(n => !csmWithSubmissions.has(n)).length;
    const pct = rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0;
    return {
      totalCsms: csmWithCustomers.size,
      compliantCount: csmWithSubmissions.size,
      pendingCsmCount,
      completionPct: pct,
      totalCustomers: rows.length,
      completedCustomers: completed,
      pendingCustomers: pending,
    };
  };

  const currentStats = useMemo(() => computeStats(currentRows), [currentRows]);
  const allTimeStats = useMemo(() => computeStats(allTimeRows), [allTimeRows]);

  const isLoading = csmsLoading || scoresLoading || customersLoading || authLoading || linksLoading || allTimeLoading || cfLoading;
  const isFetching = csmsFetching || scoresFetching || customersFetching;

  const handleRefresh = () => { refetchCsms(); refetchScores(); refetchCustomers(); refetchAllTime(); };

  const lastUpdatedLabel = useMemo(() => {
    if (!scoresUpdatedAt) return null;
    return formatDistanceToNow(new Date(scoresUpdatedAt), { addSuffix: true });
  }, [scoresUpdatedAt]);

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
            {lastUpdatedLabel && ` • Updated ${lastUpdatedLabel}`}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching} className="shrink-0">
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="current">Current Period</TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6 mt-4">
            <ComplianceSummaryCards
              totalCsms={currentStats.totalCsms}
              compliantCount={currentStats.compliantCount}
              pendingCount={currentStats.pendingCsmCount}
              completionPct={currentStats.completionPct}
              totalCustomers={currentStats.totalCustomers}
              completedCustomers={currentStats.completedCustomers}
              pendingCustomers={currentStats.pendingCustomers}
            />
            <ComplianceCustomerTable
              rows={currentRows}
              periodLabel={currentPeriod}
              customerFeaturesMap={customerFeaturesMap}
              featureNameMap={featureNameMap}
              indicatorFeatureLinks={featureLinks}
              detailedScores={currentScores}
              period={currentPeriod}
            />
          </TabsContent>

          <TabsContent value="alltime" className="space-y-6 mt-4">
            <ComplianceSummaryCards
              totalCsms={allTimeStats.totalCsms}
              compliantCount={allTimeStats.compliantCount}
              pendingCount={allTimeStats.pendingCsmCount}
              completionPct={allTimeStats.completionPct}
              totalCustomers={allTimeStats.totalCustomers}
              completedCustomers={allTimeStats.completedCustomers}
              pendingCustomers={allTimeStats.pendingCustomers}
            />
            <ComplianceCustomerTable
              rows={allTimeRows}
              periodLabel="All Time"
              customerFeaturesMap={customerFeaturesMap}
              featureNameMap={featureNameMap}
              indicatorFeatureLinks={featureLinks}
              detailedScores={allTimeScores}
              period="all"
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="font-medium text-sm">
                      {a.user_id && userNameMap[a.user_id] ? userNameMap[a.user_id] : 'Unknown user'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium capitalize">{a.action}</span> {a.entity_type}
                      {a.entity_name && `: ${a.entity_name}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-3">
                    {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
