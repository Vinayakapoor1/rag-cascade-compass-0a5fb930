import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, Target, BarChart3, Users, 
  Database, Calculator, TrendingUp, AlertCircle, CheckCircle
} from 'lucide-react';

interface DashboardStats {
  orgObjectives: number;
  departments: number;
  functionalObjectives: number;
  keyResults: number;
  indicators: number;
  customers: number;
  rawDataInputs: number;
  snapshots: number;
  formulaVersions: number;
}

interface DashboardTabProps {
  stats: DashboardStats;
  loading: boolean;
  onRefresh: () => void;
}

export function DashboardTab({ stats, loading, onRefresh }: DashboardTabProps) {
  const hierarchyComplete = stats.orgObjectives > 0 && 
    stats.departments > 0 && 
    stats.functionalObjectives > 0 && 
    stats.keyResults > 0 && 
    stats.indicators > 0;

  const dataFlowReady = stats.customers > 0 && stats.formulaVersions > 0;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={hierarchyComplete ? 'border-rag-green' : 'border-rag-amber'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {hierarchyComplete ? (
                <CheckCircle className="h-4 w-4 text-rag-green" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rag-amber" />
              )}
              OKR Hierarchy Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={hierarchyComplete ? 'bg-rag-green-muted text-rag-green' : 'bg-rag-amber-muted text-rag-amber'}>
              {hierarchyComplete ? 'Complete' : 'Incomplete - Import Required'}
            </Badge>
          </CardContent>
        </Card>

        <Card className={dataFlowReady ? 'border-rag-green' : 'border-rag-amber'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {dataFlowReady ? (
                <CheckCircle className="h-4 w-4 text-rag-green" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rag-amber" />
              )}
              Data Flow Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={dataFlowReady ? 'bg-rag-green-muted text-rag-green' : 'bg-rag-amber-muted text-rag-amber'}>
              {dataFlowReady ? 'Ready for Calculation' : 'Setup Required'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            OKR Hierarchy
          </CardTitle>
          <CardDescription>Current structure in database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-org-purple-muted">
              <div className="text-2xl font-bold">{stats.orgObjectives}</div>
              <div className="text-xs text-muted-foreground">Org Objectives</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-org-blue-muted">
              <div className="text-2xl font-bold">{stats.departments}</div>
              <div className="text-xs text-muted-foreground">Departments</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-org-green-muted">
              <div className="text-2xl font-bold">{stats.functionalObjectives}</div>
              <div className="text-xs text-muted-foreground">Func. Objectives</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-org-yellow-muted">
              <div className="text-2xl font-bold">{stats.keyResults}</div>
              <div className="text-xs text-muted-foreground">Key Results</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-org-orange-muted">
              <div className="text-2xl font-bold">{stats.indicators}</div>
              <div className="text-xs text-muted-foreground">Indicators</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Flow Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Flow Engine
          </CardTitle>
          <CardDescription>Calculation engine components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-tier-1-muted">
              <Users className="h-5 w-5 mx-auto mb-1 text-tier-1" />
              <div className="text-2xl font-bold">{stats.customers}</div>
              <div className="text-xs text-muted-foreground">Customers</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-tier-2-muted">
              <Database className="h-5 w-5 mx-auto mb-1 text-tier-2" />
              <div className="text-2xl font-bold">{stats.rawDataInputs}</div>
              <div className="text-xs text-muted-foreground">Data Inputs</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-rag-green-muted">
              <Calculator className="h-5 w-5 mx-auto mb-1 text-rag-green" />
              <div className="text-2xl font-bold">{stats.formulaVersions}</div>
              <div className="text-xs text-muted-foreground">Formulas</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-rag-amber-muted">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-rag-amber" />
              <div className="text-2xl font-bold">{stats.snapshots}</div>
              <div className="text-xs text-muted-foreground">Snapshots</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administration tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh Stats
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
