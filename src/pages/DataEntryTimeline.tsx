import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
    History, Calendar, Filter, User, ArrowRight,
    FileText, Briefcase, ChevronRight, Layers, LayoutGrid
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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
    user?: {
        email: string;
        full_name?: string;
    };
}

interface FilterState {
    userId: string;
    entityType: string;
    days: string;
}

export default function DataEntryTimeline() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<FilterState>({
        userId: 'all',
        entityType: 'all',
        days: '30'
    });

    // Lists for filters
    const [users, setUsers] = useState<{ id: string, email: string }[]>([]);

    useEffect(() => {
        if (user) {
            fetchLogs();
            fetchUsers();
        }
    }, [user, filters]);

    const fetchUsers = async () => {
        // Determine unique users from logs (simplified approach as we can't query auth.users directly easily without admin function usually)
        // Alternatively, we can just fetch unique user_ids from activity_logs and try to look them up if we have profile table
        // For now, let's just use what we have in logs or skipping strict user list if complex
        // Actually, let's group by user_id from the logs query for the filter
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters.userId !== 'all') {
                query = query.eq('user_id', filters.userId);
            }

            if (filters.entityType !== 'all') {
                query = query.eq('entity_type', filters.entityType);
            }

            if (filters.days !== 'all') {
                const date = new Date();
                date.setDate(date.getDate() - parseInt(filters.days));
                query = query.gte('created_at', date.toISOString());
            }

            const { data, error } = await query.limit(50); // Pagination could be added

            if (error) throw error;

            // Mock user data fetching since we might not have a public profiles table joined easily
            // In a real app, join with profiles table
            const logsWithUser = await Promise.all((data || []).map(async (log) => {
                // Here we ideally verify if we have a table for users. 
                // For now, we'll just format the ID or use metadata if available.
                return {
                    ...log,
                    user: { email: 'Unknown User' } // Placeholder if no profile system
                };
            }));

            setLogs(logsWithUser);
        } catch (error) {
            console.error('Error fetching timeline:', error);
            toast.error('Failed to load activity log');
        } finally {
            setLoading(false);
        }
    };

    const getEntityIcon = (type: string) => {
        switch (type) {
            case 'indicator': return <FileText className="h-4 w-4" />;
            case 'key_result': return <LayoutGrid className="h-4 w-4" />;
            case 'functional_objective': return <Layers className="h-4 w-4" />;
            case 'department': return <Briefcase className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const formatValue = (val: any) => {
        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
        return String(val);
    };

    const getRAGColor = (status: string) => {
        switch (status) {
            case 'green': return 'bg-green-500/10 text-green-700 border-green-500/20';
            case 'amber': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
            case 'red': return 'bg-red-500/10 text-red-700 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
        }
    };

    const renderDiff = (log: ActivityLog) => {
        if (log.entity_type === 'indicator' && log.action === 'update') {
            const oldVal = log.old_value?.current_value;
            const newVal = log.new_value?.current_value;
            const krName = log.metadata?.kr_name;
            const oldRAG = log.metadata?.old_rag_status;
            const newRAG = log.metadata?.new_rag_status;

            return (
                <div className="space-y-2 mt-2">
                    {/* KR Name */}
                    {krName && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Key Result:</span>
                            <Badge variant="outline" className="text-xs font-normal">
                                {krName}
                            </Badge>
                        </div>
                    )}

                    {/* Value Change */}
                    {oldVal !== undefined && newVal !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="bg-muted text-muted-foreground hover:bg-muted font-mono">
                                {oldVal ?? 'Empty'}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20 font-mono border-primary/20">
                                {newVal}
                            </Badge>
                        </div>
                    )}

                    {/* RAG Status Change */}
                    {oldRAG && newRAG && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            <Badge variant="outline" className={`text-xs font-medium uppercase ${getRAGColor(oldRAG)}`}>
                                {oldRAG}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className={`text-xs font-medium uppercase ${getRAGColor(newRAG)}`}>
                                {newRAG}
                            </Badge>
                        </div>
                    )}
                </div>
            );
        }
        return (
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-md">
                {JSON.stringify(log.new_value)}
            </p>
        );
    };

    const uniqueUserIds = Array.from(new Set(logs.map(l => l.user_id)));

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <History className="h-8 w-8" />
                        Data Entry Timeline
                    </h1>
                    <p className="text-muted-foreground">Audit trail of all system updates</p>
                </div>
                <Button variant="outline" onClick={fetchLogs}>
                    Refresh
                </Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Filters:</span>
                        </div>

                        <Select value={filters.entityType} onValueChange={(v) => setFilters({ ...filters, entityType: v })}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Entity Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Entities</SelectItem>
                                <SelectItem value="indicator">Indicators</SelectItem>
                                <SelectItem value="key_result">Key Results</SelectItem>
                                <SelectItem value="functional_objective">Objectives</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.days} onValueChange={(v) => setFilters({ ...filters, days: v })}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Time Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 Days</SelectItem>
                                <SelectItem value="30">Last 30 Days</SelectItem>
                                <SelectItem value="90">Last 3 Months</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="ml-auto text-sm text-muted-foreground">
                            Showing {logs.length} entries
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4 relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-4 bottom-4 w-px bg-border" />

                {loading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="flex gap-4 items-start pl-2">
                            <Skeleton className="h-8 w-8 rounded-full z-10" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </div>
                    ))
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 pl-4">
                        <p className="text-muted-foreground">No activity logs found matching your filters.</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="group flex gap-4 items-start relative pl-2">
                            {/* Timeline Dot */}
                            <div className="z-10 bg-background p-1 mt-1">
                                <Avatar className="h-6 w-6 border-2 border-muted group-hover:border-primary transition-colors">
                                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                                        <User className="h-3 w-3" />
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            <Card className="flex-1 mb-2 hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs">
                                                    {getEntityIcon(log.entity_type)}
                                                    {log.entity_type}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {log.action}d by
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {log.metadata?.user_email || log.user?.email || log.user_id.slice(0, 8)}
                                                </span>
                                            </div>

                                            <h4 className="font-semibold text-base flex items-center gap-2">
                                                {log.entity_name || 'Unnamed Entity'}
                                            </h4>

                                            {renderDiff(log)}
                                        </div>

                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground" title={new Date(log.created_at).toLocaleString()}>
                                                <Calendar className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                            </div>
                                            {log.metadata?.department_id && (
                                                <Badge variant="secondary" className="mt-2 text-[10px]">
                                                    Department Update
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
