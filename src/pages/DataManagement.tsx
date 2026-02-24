import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, AlertCircle, FolderTree, Settings, Users, LogOut, Home, Database, ClipboardCheck, Calendar as CalendarIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DepartmentUploader } from '@/components/admin/DepartmentUploader';
import { CustomerUploader } from '@/components/admin/CustomerUploader';
import { FeatureUploader } from '@/components/admin/FeatureUploader';
import { CustomerIndustryUpdater } from '@/components/admin/CustomerIndustryUpdater';
import { OKRHierarchyTab } from '@/components/admin/OKRHierarchyTab';
import { OrgObjectivesManager } from '@/components/admin/OrgObjectivesManager';
import { RAGRulesTab } from '@/components/admin/RAGRulesTab';
import { IndustryManager } from '@/components/admin/IndustryManager';
import { TeamAccessTab } from '@/components/admin/TeamAccessTab';
import { FormulasTab } from '@/components/admin/FormulasTab';
import { SnapshotsTab } from '@/components/admin/SnapshotsTab';
import { AdminDashboardCard } from '@/components/admin/AdminDashboardCard';
import { AdminDataControls } from '@/components/admin/AdminDataControls';
import { RAGLegend } from '@/components/RAGLegend';
import { CSMDataEntryMatrix } from '@/components/user/CSMDataEntryMatrix';
import { cn } from '@/lib/utils';
import { format, getISOWeek, getYear } from 'date-fns';

type PeriodMode = 'monthly' | 'weekly';

function getISOWeekString(date: Date): string {
  const week = getISOWeek(date);
  const year = getYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function dateToPeriod(date: Date, mode: PeriodMode): string {
  if (mode === 'weekly') return getISOWeekString(date);
  return format(date, 'yyyy-MM');
}

export default function DataManagement() {
  const navigate = useNavigate();
  const { user, isAdmin, isDepartmentHead, loading: authLoading, signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState('okr');

  // Department head state
  const [departments, setDepartments] = useState<Array<{ department_id: string; departments: { id: string; name: string } }>>([]);
  const [deptLoading, setDeptLoading] = useState(true);

  // CSM Entries tab state
  const [csmDepartments, setCsmDepartments] = useState<{ id: string; name: string }[]>([]);
  const [csmDeptId, setCsmDeptId] = useState<string | null>(null);
  const [csmPeriodMode, setCsmPeriodMode] = useState<PeriodMode>('monthly');
  const [csmPeriod, setCsmPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [csmCalendarOpen, setCsmCalendarOpen] = useState(false);
  const [csmPeriodsWithData, setCsmPeriodsWithData] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch departments for department heads
  useEffect(() => {
    async function fetchDepartments() {
      if (!user || !isDepartmentHead || isAdmin) {
        setDeptLoading(false);
        return;
      }

      const { data } = await supabase
        .from('department_access')
        .select('department_id, departments(id, name)')
        .eq('user_id', user.id);

      if (data && data.length === 1) {
        navigate(`/department/${data[0].department_id}/data-entry`, { replace: true });
      } else if (data) {
        setDepartments(data);
        setDeptLoading(false);
      }
    }
    fetchDepartments();
  }, [user, isDepartmentHead, isAdmin, navigate]);

  // Fetch all departments + periods with data for CSM Entries tab
  useEffect(() => {
    if (!isAdmin) return;
    async function fetchCsmData() {
      const [{ data: depts }, { data: periods }] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('csm_customer_feature_scores').select('period'),
      ]);
      if (depts?.length) {
        setCsmDepartments(depts);
        setCsmDeptId(depts[0].id);
      }
      if (periods) {
        setCsmPeriodsWithData(new Set(periods.map(r => r.period)));
      }
    }
    fetchCsmData();
  }, [isAdmin]);

  // Reset CSM period when mode changes
  useEffect(() => {
    if (csmPeriodMode === 'monthly') {
      setCsmPeriod(new Date().toISOString().slice(0, 7));
    } else {
      setCsmPeriod(getISOWeekString(new Date()));
    }
  }, [csmPeriodMode]);

  const generateCsmPeriodOptions = (): string[] => {
    const options: string[] = [];
    const now = new Date();
    if (csmPeriodMode === 'monthly') {
      for (let i = -12; i <= 1; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        options.push(format(d, 'yyyy-MM'));
      }
    } else {
      for (let i = -12; i <= 1; i++) {
        const d = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        options.push(getISOWeekString(d));
      }
      return [...new Set(options)];
    }
    return options;
  };

  const handleImportComplete = () => setRefreshKey((k) => k + 1);
  const handleDataChange = () => setRefreshKey((k) => k + 1);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleQuickAction = (action: 'add-indicator' | 'add-customer' | 'upload') => {
    switch (action) {
      case 'add-indicator':
        setActiveMainTab('okr');
        break;
      case 'upload':
        setActiveMainTab('admin');
        break;
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  // Department heads are redirected to bulk entry view
  if (isDepartmentHead && !isAdmin) {
    if (deptLoading) {
      return (
        <AppLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </AppLayout>
      );
    }

    return (
      <AppLayout>
        <div className="container mx-auto py-8 space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Select Department</h1>
              <p className="text-muted-foreground mt-1">Choose a department to enter data</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{user.email}</Badge>
              <Button variant="outline" size="sm" asChild>
                <Link to="/"><Home className="h-4 w-4 mr-2" />Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />Sign Out
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
              <Card key={dept.department_id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <Button variant="ghost" className="w-full h-auto p-0 hover:bg-transparent" asChild>
                    <Link to={`/department/${dept.department_id}/data-entry`}>
                      <div className="text-left w-full">
                        <h3 className="text-lg font-semibold mb-2">{dept.departments.name}</h3>
                        <p className="text-sm text-muted-foreground">Click to enter data →</p>
                      </div>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const csmPeriodOptions = generateCsmPeriodOptions();

  // Admin/Viewer view
  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Data Management</h1>
            <p className="text-muted-foreground mt-1">Manage your OKR hierarchy and system configuration</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{user.email}</Badge>
            {isAdmin && <Badge className="bg-primary">Admin</Badge>}
            <RAGLegend />
            <Button variant="outline" size="sm" asChild>
              <Link to="/"><Home className="h-4 w-4 mr-2" />Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>

        <AdminDashboardCard onQuickAction={handleQuickAction} userEmail={user.email} />

        {!isAdmin && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span>You have viewer access. Contact an administrator to modify data.</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="h-auto p-1 bg-muted/50">
            <TabsTrigger value="okr" className="gap-2 px-4 py-2.5">
              <FolderTree className="h-4 w-4" />
              OKR Structure
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2 px-4 py-2.5">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="data-controls" className="gap-2 px-4 py-2.5">
                <Database className="h-4 w-4" />
                Data Controls
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="csm-entries" className="gap-2 px-4 py-2.5">
                <ClipboardCheck className="h-4 w-4" />
                CSM Entries
              </TabsTrigger>
            )}
            <TabsTrigger value="admin" className="gap-2 px-4 py-2.5">
              <Users className="h-4 w-4" />
              Team & Uploads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="okr" className="space-y-4">
            <OrgObjectivesManager />
            <OKRHierarchyTab key={refreshKey} />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Tabs defaultValue="rag">
              <TabsList className="mb-4">
                <TabsTrigger value="rag">RAG Thresholds</TabsTrigger>
                <TabsTrigger value="formulas">Formulas</TabsTrigger>
                <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
              </TabsList>
              <TabsContent value="rag">
                <RAGRulesTab isAdmin={isAdmin} onDataChange={handleDataChange} />
              </TabsContent>
              <TabsContent value="formulas">
                <FormulasTab isAdmin={isAdmin} onDataChange={handleDataChange} />
              </TabsContent>
              <TabsContent value="snapshots">
                <SnapshotsTab isAdmin={isAdmin} />
              </TabsContent>
            </Tabs>
            {isAdmin && <IndustryManager />}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="data-controls" className="space-y-4">
              <AdminDataControls />
            </TabsContent>
          )}

          {/* CSM Entries Tab */}
          {isAdmin && (
            <TabsContent value="csm-entries" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    CSM Feature Scores
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Review and edit CSM-submitted feature adoption scores across all departments
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={csmDeptId || ''} onValueChange={setCsmDeptId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {csmDepartments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCsmPeriodMode(m => m === 'monthly' ? 'weekly' : 'monthly')}
                    className="gap-1.5"
                  >
                    {csmPeriodMode === 'monthly' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                    {csmPeriodMode === 'monthly' ? 'Monthly' : 'Weekly'}
                  </Button>

                  <Select value={csmPeriod} onValueChange={setCsmPeriod}>
                    <SelectTrigger className="w-[180px]">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {csmPeriodOptions.map(p => (
                        <SelectItem key={p} value={p}>
                          <span className="flex items-center gap-2">
                            {p}
                            {csmPeriodsWithData.has(p) && (
                              <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Popover open={csmCalendarOpen} onOpenChange={setCsmCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" title="Pick a date">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        onSelect={(date) => {
                          if (!date) return;
                          setCsmPeriod(dateToPeriod(date, csmPeriodMode));
                          setCsmCalendarOpen(false);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {csmDeptId && (
                <CSMDataEntryMatrix departmentId={csmDeptId} period={csmPeriod} />
              )}
            </TabsContent>
          )}

          <TabsContent value="admin" className="space-y-4">
            <Tabs defaultValue="upload">
              <TabsList className="mb-4">
                {isAdmin && <TabsTrigger value="team">Team Access</TabsTrigger>}
                <TabsTrigger value="upload">OKR Upload</TabsTrigger>
                <TabsTrigger value="customers">Customer Upload</TabsTrigger>
                <TabsTrigger value="features">Feature Upload</TabsTrigger>
              </TabsList>
              {isAdmin && (
                <TabsContent value="team">
                  <TeamAccessTab isAdmin={isAdmin} />
                </TabsContent>
              )}
              <TabsContent value="upload">
                <DepartmentUploader onImportComplete={handleImportComplete} />
              </TabsContent>
              <TabsContent value="customers" className="space-y-4">
                <CustomerUploader onImportComplete={handleImportComplete} />
                <CustomerIndustryUpdater />
              </TabsContent>
              <TabsContent value="features">
                <FeatureUploader onImportComplete={handleImportComplete} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
