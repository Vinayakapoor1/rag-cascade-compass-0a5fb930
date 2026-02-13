import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
    Activity, Calendar, FileText, Briefcase, Layers,
    LayoutGrid, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityLog {
    id: string;
    created_at: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    entity_name: string;
    old_value: any;
    new_value: any;
    metadata: any;
    user_email?: string;
    profile_name?: string;
}

export function ActivityTimelineWidget() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        // Force fresh fetch on mount - bypass any stale cache
        setLoading(true);
        fetchRecentLogs();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchRecentLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchRecentLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            if (error) throw error;

            // Fetch profiles for user_ids
            const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
            let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
            
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name, email')
                    .in('user_id', userIds);
                
                profilesMap = (profiles || []).reduce((acc, p) => {
                    acc[p.user_id] = { full_name: p.full_name, email: p.email };
                    return acc;
                }, {} as Record<string, { full_name: string | null; email: string | null }>);
            }

            // Merge profile info
            const logsWithUser = (data || []).map(log => {
                const profile = log.user_id ? profilesMap[log.user_id] : null;
                return {
                    ...log,
                    user_email: (log.metadata as Record<string, any>)?.user_email || profile?.email || null,
                    profile_name: profile?.full_name || null
                };
            });

            setLogs(logsWithUser);
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEntityIcon = (type: string) => {
        switch (type) {
            case 'indicator': return <FileText className="h-3.5 w-3.5" />;
            case 'key_result': return <LayoutGrid className="h-3.5 w-3.5" />;
            case 'functional_objective': return <Layers className="h-3.5 w-3.5" />;
            case 'department': return <Briefcase className="h-3.5 w-3.5" />;
            default: return <FileText className="h-3.5 w-3.5" />;
        }
    };

    const getDisplayValue = (value: any): string => {
        if (value === null || value === undefined) return 'Empty';
        
        // Handle primitive values directly
        if (typeof value === 'string') return value || 'Empty';
        if (typeof value === 'number') return String(value);
        
        // Handle indicator values (has current_value)
        if ('current_value' in value) {
            return value.current_value !== null ? String(value.current_value) : 'Empty';
        }
        
        // Handle business outcome values (has value property)
        if ('value' in value) {
            return value.value || 'Empty';
        }
        
        // For any other object with a single key, return that value
        const keys = Object.keys(value);
        if (keys.length === 1) {
            const singleValue = value[keys[0]];
            if (typeof singleValue === 'string' || typeof singleValue === 'number') {
                return String(singleValue);
            }
        }
        
        // Last resort: avoid ugly JSON
        return 'Updated';
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'text-rag-green';
            case 'update': return 'text-rag-amber';
            case 'delete': return 'text-rag-red';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <Card className="glass-card">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Recent Activity
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Link to="/admin">
                            <Button variant="ghost" size="sm" className="text-xs gap-1">
                                View All
                                <ChevronRight className="h-3 w-3" />
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-0">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-3/4 bg-muted rounded" />
                                        <div className="h-2 w-1/2 bg-muted rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No recent activity
                        </div>
                    ) : (
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-3 relative">
                                {/* Timeline line */}
                                <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

                                {logs.map((log) => (
                                    <div key={log.id} className="flex gap-3 items-start relative group">
                                        {/* Icon */}
                                        <div className="z-10 bg-background p-1.5 rounded-full border-2 border-muted group-hover:border-primary transition-colors">
                                            <div className={cn(
                                                "transition-colors",
                                                getActionColor(log.action)
                                            )}>
                                                {getEntityIcon(log.entity_type)}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <p className="text-sm font-medium truncate">
                                                        {log.entity_name || 'Unnamed Entity'}
                                                    </p>

                                                    {/* KR Name */}
                                                    {log.metadata?.kr_name && (
                                                        <p className="text-[10px] text-muted-foreground truncate">
                                                            KR: {log.metadata.kr_name}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                                            {log.entity_type}
                                                        </Badge>
                                                        <span className={cn(
                                                            "text-xs font-medium",
                                                            getActionColor(log.action)
                                                        )}>
                                                            {log.action}d
                                                        </span>

                                                        {/* RAG Status Change */}
                                                        {log.metadata?.old_rag_status && log.metadata?.new_rag_status && (
                                                            <div className="flex items-center gap-1">
                                                                <Badge variant="outline" className={cn(
                                                                    "text-[9px] px-1 py-0 h-4 uppercase",
                                                                    log.metadata.old_rag_status === 'green' && "bg-green-500/10 text-green-700 border-green-500/20",
                                                                    log.metadata.old_rag_status === 'amber' && "bg-amber-500/10 text-amber-700 border-amber-500/20",
                                                                    log.metadata.old_rag_status === 'red' && "bg-red-500/10 text-red-700 border-red-500/20",
                                                                    log.metadata.old_rag_status === 'gray' && "bg-gray-500/10 text-gray-700 border-gray-500/20"
                                                                )}>
                                                                    {log.metadata.old_rag_status}
                                                                </Badge>
                                                                <span className="text-[10px] text-muted-foreground">→</span>
                                                                <Badge variant="outline" className={cn(
                                                                    "text-[9px] px-1 py-0 h-4 uppercase",
                                                                    log.metadata.new_rag_status === 'green' && "bg-green-500/10 text-green-700 border-green-500/20",
                                                                    log.metadata.new_rag_status === 'amber' && "bg-amber-500/10 text-amber-700 border-amber-500/20",
                                                                    log.metadata.new_rag_status === 'red' && "bg-red-500/10 text-red-700 border-red-500/20",
                                                                    log.metadata.new_rag_status === 'gray' && "bg-gray-500/10 text-gray-700 border-gray-500/20"
                                                                )}>
                                                                {log.metadata.new_rag_status}
                                                            </Badge>
                                                        </div>
                                                    )}

                                                        {/* Skip Reason */}
                                                        {log.metadata?.skip_reason && (
                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400">
                                                                SKIPPED
                                                            </Badge>
                                                        )}

                                                        {/* Value Change - for any update with old/new values */}
                                                        {log.action === 'update' && (log.old_value || log.new_value) && !log.metadata?.skip_reason && (
                                                            <div className="flex items-center gap-1 text-xs">
                                                                <span className="font-mono text-muted-foreground">
                                                                    {getDisplayValue(log.old_value)}
                                                                </span>
                                                                <span className="text-muted-foreground">→</span>
                                                                <span className="font-mono text-primary font-medium">
                                                                    {getDisplayValue(log.new_value)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Skip Reason Text */}
                                                        {log.metadata?.skip_reason && (
                                                            <span className="text-xs italic text-muted-foreground truncate max-w-[200px]" title={log.metadata.skip_reason}>
                                                                "{log.metadata.skip_reason}"
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                                    <Calendar className="h-2.5 w-2.5" />
                                                    {format(new Date(log.created_at), 'MMM d, yyyy, h:mm a')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
