import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Search, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScoreLog {
  id: string;
  customer_id: string;
  feature_id: string;
  indicator_id: string;
  value: number | null;
  period: string;
  updated_at: string;
  created_by: string | null;
  customer_name?: string;
  feature_name?: string;
  indicator_name?: string;
  user_name?: string;
}

interface CSMDataEntryTimelineProps {
  csmId?: string | null;
  isAdmin?: boolean;
}

export function CSMDataEntryTimeline({ csmId, isAdmin }: CSMDataEntryTimelineProps) {
  const [logs, setLogs] = useState<ScoreLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      // If CSM (not admin), scope to assigned customers only
      let assignedCustomerIds: string[] | null = null;
      if (csmId && !isAdmin) {
        const { data: assignedCusts } = await supabase
          .from('customers')
          .select('id')
          .eq('csm_id', csmId);
        if (!assignedCusts?.length) {
          setLogs([]);
          setLoading(false);
          return;
        }
        assignedCustomerIds = assignedCusts.map(c => c.id);
      }

      // Fetch recent score entries ordered by updated_at
      let query = supabase
        .from('csm_customer_feature_scores')
        .select('id, customer_id, feature_id, indicator_id, value, period, updated_at, created_by')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (assignedCustomerIds) {
        query = query.in('customer_id', assignedCustomerIds);
      }

      const { data: scores, error } = await query;

      if (error) throw error;
      if (!scores?.length) { setLogs([]); setLoading(false); return; }

      // Batch fetch related names
      const custIds = [...new Set(scores.map(s => s.customer_id))];
      const featIds = [...new Set(scores.map(s => s.feature_id))];
      const indIds = [...new Set(scores.map(s => s.indicator_id))];
      const userIds = [...new Set(scores.map(s => s.created_by).filter(Boolean))] as string[];

      const [custRes, featRes, indRes, profileRes] = await Promise.all([
        supabase.from('customers').select('id, name').in('id', custIds),
        supabase.from('features').select('id, name').in('id', featIds),
        supabase.from('indicators').select('id, name').in('id', indIds),
        userIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
          : Promise.resolve({ data: [] }),
      ]);

      const custMap = new Map((custRes.data || []).map(c => [c.id, c.name]));
      const featMap = new Map((featRes.data || []).map(f => [f.id, f.name]));
      const indMap = new Map((indRes.data || []).map(i => [i.id, i.name]));
      const profileMap = new Map((profileRes.data || []).map(p => [p.user_id, p.full_name || p.email || '']));

      const enriched: ScoreLog[] = scores.map(s => ({
        ...s,
        customer_name: custMap.get(s.customer_id) || 'Unknown',
        feature_name: featMap.get(s.feature_id) || 'Unknown',
        indicator_name: indMap.get(s.indicator_id) || 'Unknown',
        user_name: s.created_by ? profileMap.get(s.created_by) || '' : '',
      }));

      setLogs(enriched);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [csmId, isAdmin]);

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('csm-scores-timeline')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'csm_customer_feature_scores' },
        () => { fetchLogs(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs]);

  // Group by customer
  const grouped = logs.reduce<Record<string, ScoreLog[]>>((acc, log) => {
    const name = log.customer_name || 'Unknown';
    if (!acc[name]) acc[name] = [];
    acc[name].push(log);
    return acc;
  }, {});

  // Filter by search
  const searchLower = search.toLowerCase();
  const filteredKeys = Object.keys(grouped)
    .filter(name => {
      if (!searchLower) return true;
      if (name.toLowerCase().includes(searchLower)) return true;
      return grouped[name].some(l =>
        l.feature_name?.toLowerCase().includes(searchLower) ||
        l.indicator_name?.toLowerCase().includes(searchLower)
      );
    })
    .sort();

  const getBandColor = (value: number | null) => {
    if (value === null) return 'bg-muted text-muted-foreground';
    if (value >= 1) return 'bg-rag-green/20 text-rag-green border-rag-green/30';
    if (value >= 0.5) return 'bg-rag-amber/20 text-rag-amber border-rag-amber/30';
    return 'bg-rag-red/20 text-rag-red border-rag-red/30';
  };

  const getBandLabel = (value: number | null) => {
    if (value === null) return 'N/A';
    if (value >= 1) return 'Green';
    if (value >= 0.5) return 'Amber';
    return 'Red';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Recent Updates</h3>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            Live
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by customer, feature..."
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="h-4 w-2/3 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredKeys.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-8">
              {search ? 'No matches found' : 'No recent updates'}
            </p>
          ) : (
            filteredKeys.map(customerName => {
              const entries = grouped[customerName];
              const recent = entries.slice(0, 5);
              return (
                <div key={customerName} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-1">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs font-semibold truncate">{customerName}</span>
                    <Badge variant="outline" className="text-[9px] ml-auto shrink-0">
                      {entries.length} update{entries.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="ml-3 border-l border-border pl-3 space-y-1.5">
                    {recent.map(log => (
                      <div
                        key={log.id}
                        className="rounded-md p-1.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] px-1 py-0 h-4 font-medium border', getBandColor(log.value))}
                          >
                            {getBandLabel(log.value)}
                          </Badge>
                          <span className="text-[11px] font-medium truncate flex-1">
                            {log.indicator_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {log.feature_name}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 ml-auto shrink-0">
                            {formatDistanceToNow(new Date(log.updated_at), { addSuffix: true })}
                          </span>
                        </div>
                        {log.user_name && (
                          <span className="text-[9px] text-muted-foreground/50 italic">
                            by {log.user_name}
                          </span>
                        )}
                      </div>
                    ))}
                    {entries.length > 5 && (
                      <p className="text-[10px] text-muted-foreground/60 pl-1">
                        +{entries.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
