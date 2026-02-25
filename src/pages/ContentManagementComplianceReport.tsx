import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, Clock, Users, ArrowLeft, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function ContentManagementComplianceReport() {
  const { user, isAdmin, isContentManager, loading: authLoading } = useAuth();

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Get managed-services customers
  const { data: customers = [], isLoading: customersLoading, isFetching: customersFetching, refetch: refetchCustomers } = useQuery({
    queryKey: ['content-mgmt-report-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('managed_services', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Get scores for current period
  const { data: scores = [], isLoading: scoresLoading, isFetching: scoresFetching, dataUpdatedAt: scoresUpdatedAt, refetch: refetchScores } = useQuery({
    queryKey: ['content-mgmt-report-scores', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('customer_id, period, created_at, created_by')
        .eq('period', currentPeriod);
      if (error) throw error;
      return data || [];
    },
  });

  // Get content managers (users with content_manager role)
  const { data: contentManagers = [], isLoading: cmLoading, isFetching: cmFetching, refetch: refetchCMs } = useQuery({
    queryKey: ['content-mgmt-report-managers'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'content_manager' as any);
      if (error) throw error;
      if (!roles?.length) return [];

      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      return (profiles || []).map(p => ({
        userId: p.user_id,
        name: p.full_name || p.email || 'Unknown',
        email: p.email,
      }));
    },
  });

  // Get recent activity from content managers
  const cmUserIds = useMemo(() => contentManagers.map(cm => cm.userId), [contentManagers]);

  const { data: activityMap = {} } = useQuery({
    queryKey: ['content-mgmt-activity', cmUserIds],
    queryFn: async () => {
      if (cmUserIds.length === 0) return {};
      const { data, error } = await supabase
        .from('activity_logs')
        .select('user_id, created_at')
        .in('user_id', cmUserIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach(row => {
        if (row.user_id && !map[row.user_id]) {
          map[row.user_id] = row.created_at!;
        }
      });
      return map;
    },
    enabled: cmUserIds.length > 0,
  });

  // Recent activity logs
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['content-mgmt-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, entity_type, entity_name, user_id, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Map user_ids to names
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    contentManagers.forEach(cm => {
      map[cm.userId] = cm.name;
    });
    return map;
  }, [contentManagers]);

  const isLoading = customersLoading || scoresLoading || cmLoading || authLoading;
  const isFetching = customersFetching || scoresFetching || cmFetching;

  const handleRefresh = () => {
    refetchCustomers();
    refetchScores();
    refetchCMs();
  };

  const lastUpdatedLabel = useMemo(() => {
    if (!scoresUpdatedAt) return null;
    return formatDistanceToNow(new Date(scoresUpdatedAt), { addSuffix: true });
  }, [scoresUpdatedAt]);

  const complianceData = useMemo(() => {
    if (customers.length === 0) return { scored: [], pending: [], total: 0 };

    const customersWithScores = new Set(scores.map(s => s.customer_id));

    const scored: { name: string; lastScored: string | null }[] = [];
    const pending: { name: string }[] = [];

    customers.forEach(c => {
      if (customersWithScores.has(c.id)) {
        const latestScore = scores
          .filter(s => s.customer_id === c.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        scored.push({ name: c.name, lastScored: latestScore?.created_at || null });
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
    if (diff === 0) return 'Today (Friday) 11:30 PM';
    if (diff === 1) return 'Tomorrow 11:30 PM';
    return `Friday 11:30 PM (in ${diff} days)`;
  }, []);

  if (!authLoading && (!user || (!isAdmin && !isContentManager))) {
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
          <h1 className="text-2xl font-bold">📋 Content Management Compliance Report</h1>
          <p className="text-sm text-muted-foreground">
            Period: {currentPeriod} • Deadline: {deadlineLabel}
            {lastUpdatedLabel && ` • Updated ${lastUpdatedLabel}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
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
                    <p className="text-xs text-muted-foreground">Managed Services Customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-3d border-l-4 border-l-rag-green">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-rag-green" />
                  <div>
                    <p className="text-2xl font-bold">{complianceData.scored.length}</p>
                    <p className="text-xs text-muted-foreground">Scored</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-3d border-l-4 border-l-rag-red">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-rag-red" />
                  <div>
                    <p className="text-2xl font-bold">{complianceData.pending.length}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Customers */}
          {complianceData.pending.length > 0 && (
            <Card className="card-3d border-l-4 border-l-rag-red">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rag-red" />
                  Pending Scores ({complianceData.pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {complianceData.pending.map(c => (
                    <Badge key={c.name} variant="outline" className="text-xs border-rag-red/30 text-rag-red">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scored Customers */}
          {complianceData.scored.length > 0 && (
            <Card className="card-3d border-l-4 border-l-rag-green">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-rag-green" />
                  Scored ({complianceData.scored.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {complianceData.scored.map(c => (
                    <div key={c.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <p className="font-semibold text-sm">{c.name}</p>
                      <div className="flex items-center gap-2">
                        {c.lastScored && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(c.lastScored), { addSuffix: true })}
                          </span>
                        )}
                        <CheckCircle2 className="h-4 w-4 text-rag-green" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Manager Team Activity */}
          {contentManagers.length > 0 && (
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Content Management Team ({contentManagers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contentManagers.map(cm => {
                    const lastActive = activityMap[cm.userId];
                    return (
                      <div key={cm.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="font-semibold text-sm">{cm.name}</p>
                          {cm.email && <p className="text-xs text-muted-foreground">{cm.email}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {lastActive
                            ? `Last active ${formatDistanceToNow(new Date(lastActive), { addSuffix: true })}`
                            : 'No recent activity'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity Log */}
          {recentActivities.length > 0 && (
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity ({recentActivities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {recentActivities.map(activity => (
                    <div key={activity.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-medium text-sm">
                          {activity.user_id && userNameMap[activity.user_id]
                            ? userNameMap[activity.user_id]
                            : 'Unknown user'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium capitalize">{activity.action}</span>
                          {' '}{activity.entity_type}
                          {activity.entity_name && `: ${activity.entity_name}`}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-3">
                        {activity.created_at
                          ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
                          : ''}
                      </span>
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
