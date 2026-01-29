import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Briefcase, Layers, LayoutGrid, Calendar, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
    profile_email?: string;
}

interface ActivityTimelineMiniProps {
    limit?: number;
}

export function ActivityTimelineMini({ limit = 10 }: ActivityTimelineMiniProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentLogs();
    }, []);

    const fetchRecentLogs = async () => {
        try {
            // Fetch logs with profile info via user_id
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            // Fetch profiles for user_ids that exist
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

            // Merge profile info into logs
            const logsWithEmail = (data || []).map(log => {
                const profile = log.user_id ? profilesMap[log.user_id] : null;
                return {
                    ...log,
                    user_email: (log.metadata as Record<string, any>)?.user_email || profile?.email || null,
                    profile_name: profile?.full_name || null,
                    profile_email: profile?.email || null
                };
            });

            setLogs(logsWithEmail);
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEntityIcon = (type: string) => {
        switch (type) {
            case 'indicator': return <FileText className="h-3 w-3" />;
            case 'key_result': return <LayoutGrid className="h-3 w-3" />;
            case 'functional_objective': return <Layers className="h-3 w-3" />;
            case 'department': return <Briefcase className="h-3 w-3" />;
            default: return <FileText className="h-3 w-3" />;
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

    const getRAGColor = (status: string) => {
        switch (status) {
            case 'green': return 'bg-green-500/10 text-green-700 border-green-500/20';
            case 'amber': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
            case 'red': return 'bg-red-500/10 text-red-700 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
        }
    };

    if (loading) {
        return (
            <div className="space-y-3 p-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-2 animate-pulse">
                        <div className="h-6 w-6 rounded-full bg-muted" />
                        <div className="flex-1 space-y-1">
                            <div className="h-3 w-3/4 bg-muted rounded" />
                            <div className="h-2 w-1/2 bg-muted rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                No recent activity
            </div>
        );
    }

    return (
        <ScrollArea className="h-[320px]">
            <div className="space-y-2 p-2">
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-2 items-start p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        {/* Icon */}
                        <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                            {getEntityIcon(log.entity_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium truncate">
                                {log.entity_name || 'Unnamed Entity'}
                            </p>

                            {/* KR Name - no truncation */}
                            {log.metadata?.kr_name && (
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    KR: {log.metadata.kr_name}
                                </p>
                            )}

                            {/* User Info */}
                            {(log.profile_name || log.user_email) && (
                                <p className="text-[9px] text-muted-foreground/70 italic">
                                    Updated by {log.profile_name || log.user_email}
                                </p>
                            )}

                            {/* Value Change - for any update with old/new values */}
                            {log.action === 'update' && (log.old_value || log.new_value) && (
                                <div className="flex items-center gap-1 text-xs">
                                    <span className="font-mono text-muted-foreground">
                                        {getDisplayValue(log.old_value)}
                                    </span>
                                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                    <span className="font-mono text-primary font-medium">
                                        {getDisplayValue(log.new_value)}
                                    </span>
                                </div>
                            )}

                            {/* RAG Status Change */}
                            {log.metadata?.old_rag_status && log.metadata?.new_rag_status && (
                                <div className="flex items-center gap-1">
                                    <Badge variant="outline" className={cn(
                                        "text-[8px] px-1 py-0 h-3.5 uppercase font-medium",
                                        getRAGColor(log.metadata.old_rag_status)
                                    )}>
                                        {log.metadata.old_rag_status}
                                    </Badge>
                                    <ArrowRight className="h-2 w-2 text-muted-foreground" />
                                    <Badge variant="outline" className={cn(
                                        "text-[8px] px-1 py-0 h-3.5 uppercase font-medium",
                                        getRAGColor(log.metadata.new_rag_status)
                                    )}>
                                        {log.metadata.new_rag_status}
                                    </Badge>
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-2.5 w-2.5" />
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
