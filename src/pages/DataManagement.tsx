import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, FolderTree, Settings, Users, LogOut, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DepartmentUploader } from '@/components/admin/DepartmentUploader';
import { CustomerUploader } from '@/components/admin/CustomerUploader';
import { FeatureUploader } from '@/components/admin/FeatureUploader';
import { OKRHierarchyTab } from '@/components/admin/OKRHierarchyTab';
import { RAGRulesTab } from '@/components/admin/RAGRulesTab';
import { TeamAccessTab } from '@/components/admin/TeamAccessTab';
import { FormulasTab } from '@/components/admin/FormulasTab';
import { SnapshotsTab } from '@/components/admin/SnapshotsTab';
import { AdminDashboardCard } from '@/components/admin/AdminDashboardCard';

export default function DataManagement() {
  const navigate = useNavigate();
  const { user, isAdmin, isDepartmentHead, loading: authLoading, signOut } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState('okr');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleImportComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleDataChange = () => {
    setRefreshKey((k) => k + 1);
  };

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
    const [departments, setDepartments] = useState<Array<{ department_id: string; departments: { id: string; name: string } }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function fetchDepartments() {
        const { data } = await supabase
          .from('department_access')
          .select('department_id, departments(id, name)')
          .eq('user_id', user.id);

        if (data && data.length === 1) {
          // Auto-redirect to bulk entry for single department
          navigate(`/department/${data[0].department_id}/data-entry`, { replace: true });
        } else if (data) {
          setDepartments(data);
          setLoading(false);
        }
      }
      fetchDepartments();
    }, [user.id, navigate]);

    if (loading) {
      return (
        <AppLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </AppLayout>
      );
    }

    // Show department selector for multiple departments
    return (
      <AppLayout>
        <div className="container mx-auto py-8 space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Select Department</h1>
              <p className="text-muted-foreground mt-1">
                Choose a department to enter data
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{user.email}</Badge>
              <Button variant="outline" size="sm" asChild>
                <Link to="/"><Home className="h-4 w-4 mr-2" />Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
              <Card key={dept.department_id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-0 hover:bg-transparent"
                    asChild
                  >
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

  // Admin/Viewer view with simplified tabs
  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header with user info and actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Data Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your OKR hierarchy and system configuration
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{user.email}</Badge>
            {isAdmin && <Badge className="bg-primary">Admin</Badge>}
            <RAGLegend />
            <Button variant="outline" size="sm" asChild>
              <Link to="/"><Home className="h-4 w-4 mr-2" />Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Admin Dashboard Card */}
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

        {/* Main Tab Structure */}
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
            <TabsTrigger value="admin" className="gap-2 px-4 py-2.5">
              <Users className="h-4 w-4" />
              Team & Uploads
            </TabsTrigger>
          </TabsList>

          {/* OKR Structure Tab */}
          <TabsContent value="okr" className="space-y-4">
            <OKRHierarchyTab key={refreshKey} />
          </TabsContent>

          {/* Configuration Tab with Sub-tabs */}
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
          </TabsContent>

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
              <TabsContent value="customers">
                <CustomerUploader onImportComplete={handleImportComplete} />
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
