import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
    Building2, Bell, CheckCircle2, AlertCircle, TrendingUp, Users
} from 'lucide-react';

interface DepartmentStatus {
    id: string;
    name: string;
    totalIndicators: number;
    completedIndicators: number;
    headCount: number;
}

export default function AdminDepartmentStatus() {
    const { user } = useAuth();
    const [departments, setDepartments] = useState<DepartmentStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [nudging, setNudging] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get all departments
            const { data: depts, error: deptError } = await supabase
                .from('departments')
                .select('id, name')
                .order('name');

            if (deptError) throw deptError;

            // For each department, get stats
            // Note: This is not optimized for large datasets, but fine for MVP
            const deptStats = await Promise.all((depts || []).map(async (dept) => {
                // Get indicators count
                const { count: totalIndicators } = await supabase
                    .from('indicators')
                    .select('id', { count: 'exact', head: true })
                    // We need to join through tables to filter by department
                    // Simpler approach: fetch all indicators for department logic is complex without backend function
                    // Let's rely on functional_objectives -> department_id
                    .in('key_result_id', (
                        await supabase.from('key_results').select('id').in('functional_objective_id', (
                            await supabase.from('functional_objectives').select('id').eq('department_id', dept.id)
                        ).data?.map(fo => fo.id) || [])
                    ).data?.map(kr => kr.id) || []);

                // Get completed indicators (assuming logic is non-null current_value)
                const { count: completedIndicators } = await supabase
                    .from('indicators')
                    .select('id', { count: 'exact', head: true })
                    .not('current_value', 'is', null)
                    .in('key_result_id', (
                        await supabase.from('key_results').select('id').in('functional_objective_id', (
                            await supabase.from('functional_objectives').select('id').eq('department_id', dept.id)
                        ).data?.map(fo => fo.id) || [])
                    ).data?.map(kr => kr.id) || []);

                // Get head count
                const { count: headCount } = await supabase
                    .from('department_access')
                    .select('user_id', { count: 'exact', head: true })
                    .eq('department_id', dept.id);

                return {
                    id: dept.id,
                    name: dept.name,
                    totalIndicators: totalIndicators || 0,
                    completedIndicators: completedIndicators || 0,
                    headCount: headCount || 0
                };
            }));

            setDepartments(deptStats);
        } catch (error) {
            console.error('Error fetching department status:', error);
            toast.error('Failed to load department status');
        } finally {
            setLoading(false);
        }
    };

    const handleNudge = async (deptId: string, deptName: string) => {
        setNudging(deptId);
        try {
            // Get users with access
            const { data: users, error: usersError } = await supabase
                .from('department_access')
                .select('user_id')
                .eq('department_id', deptId);

            if (usersError) throw usersError;

            if (!users || users.length === 0) {
                toast.warning(`No users found for ${deptName}`);
                return;
            }

            const notifications = users.map(u => ({
                user_id: u.user_id,
                title: 'Data Entry Reminder',
                message: `Please update the KPI data for ${deptName}.`,
                link: `/department/${deptId}/data-entry`,
                is_read: false
            }));

            // @ts-ignore - notifications table not in generated types yet
            const { error: notifError } = await supabase
                .from('notifications' as any)
                .insert(notifications);

            if (notifError) throw notifError;

            toast.success(`Nudged ${users.length} user${users.length > 1 ? 's' : ''} in ${deptName}`);
        } catch (error) {
            console.error('Error nudging users:', error);
            toast.error('Failed to send nudges');
        } finally {
            setNudging(null);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Users className="h-8 w-8" />
                        Department Status
                    </h1>
                    <p className="text-muted-foreground">Monitor data entry progress and nudge department heads</p>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={loading}>
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept) => {
                    const progress = dept.totalIndicators > 0
                        ? Math.round((dept.completedIndicators / dept.totalIndicators) * 100)
                        : 0;

                    const isComplete = progress === 100;

                    return (
                        <Card key={dept.id} className="relative overflow-hidden">
                            <div className={cn(
                                "absolute top-0 left-0 w-1 h-full",
                                isComplete ? "bg-green-500" : "bg-amber-500"
                            )} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-muted-foreground" />
                                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                                    </div>
                                    <Badge variant={isComplete ? "default" : "secondary"} className={isComplete ? "bg-green-500 hover:bg-green-600" : ""}>
                                        {isComplete ? "Complete" : "Pending"}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    {dept.headCount} assigned user{dept.headCount !== 1 ? 's' : ''}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{dept.completedIndicators} completed</span>
                                        <span>{dept.totalIndicators} total</span>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    {!isComplete && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={() => handleNudge(dept.id, dept.name)}
                                            disabled={nudging === dept.id || dept.headCount === 0}
                                        >
                                            <Bell className="h-4 w-4" />
                                            {nudging === dept.id ? 'Sending...' : 'Nudge Team'}
                                        </Button>
                                    )}
                                    {isComplete && (
                                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium px-3 py-2 bg-green-50 rounded-md">
                                            <CheckCircle2 className="h-4 w-4" />
                                            All Data Entered
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

// Utility class import fix
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
