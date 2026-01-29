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
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            // Use metadata.user_email if available
            const logsWithEmail = (data || []).map(log => ({
                ...log,
                user_email: log.metadata?.user_email || null
            }));

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

                            {/* User Email */}
                            {log.user_email && (
                                <p className="text-[9px] text-muted-foreground/70 italic">
                                    Updated by {log.user_email}
                                </p>
                            )}

                            {/* Value Change */}
                            {log.entity_type === 'indicator' && log.action === 'update' && (
                                <div className="flex items-center gap-1 text-xs">
                                    <span className="font-mono text-muted-foreground">
                                        {log.old_value?.current_value ?? 'Empty'}
                                    </span>
                                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                    <span className="font-mono text-primary font-medium">
                                        {log.new_value?.current_value}
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
