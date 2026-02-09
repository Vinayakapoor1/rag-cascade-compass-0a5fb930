import { Link } from 'react-router-dom';
import { useCustomersWithImpact, TrendDataPoint } from '@/hooks/useCustomerImpact';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { CustomerFormDialog } from '@/components/CustomerFormDialog';
import { RAGBadge } from '@/components/RAGBadge';
import { Users, Search, Building2, Activity, Loader2, Filter, Plus, Edit, Trash2, Tag, Cloud, Server, TrendingUp } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { RAGStatus } from '@/types/venture';

const RAG_LINE_COLORS: Record<RAGStatus, string> = {
  green: 'hsl(142, 71%, 45%)',
  amber: 'hsl(38, 92%, 50%)',
  red: 'hsl(0, 72%, 50%)',
  'not-set': 'hsl(var(--muted-foreground))',
};

const MOCK_KPI_NAMES: Record<string, string> = {
  kpi1: 'Adoption Rate',
  kpi2: 'Satisfaction Score',
  kpi3: 'Usage Frequency',
};

const MOCK_KPI_COLORS: Record<string, string> = {
  kpi1: 'hsl(142, 71%, 45%)',
  kpi2: 'hsl(38, 92%, 50%)',
  kpi3: 'hsl(0, 72%, 50%)',
};

function SparklineTooltip({ active, payload, label, isMock }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-lg text-xs space-y-1">
      <p className="font-semibold text-[11px] border-b border-border pb-1 mb-1">
        Period {label}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">
            {isMock ? MOCK_KPI_NAMES[entry.dataKey] || entry.dataKey : 'Health Score'}:
          </span>
          <span className="font-semibold ml-auto">{entry.value}%</span>
        </div>
      ))}
      {isMock && (
        <p className="text-[9px] text-muted-foreground/60 pt-1 border-t border-border mt-1 italic">
          Sample data — will reflect linked KPIs
        </p>
      )}
    </div>
  );
}

function CustomerSparkline({ data, ragStatus }: { data: TrendDataPoint[]; ragStatus: RAGStatus }) {
  const MOCK_DATA = [
    { period: '1', kpi1: 45, kpi2: 60, kpi3: 30 },
    { period: '2', kpi1: 52, kpi2: 55, kpi3: 42 },
    { period: '3', kpi1: 48, kpi2: 62, kpi3: 38 },
    { period: '4', kpi1: 65, kpi2: 58, kpi3: 55 },
    { period: '5', kpi1: 58, kpi2: 70, kpi3: 50 },
    { period: '6', kpi1: 72, kpi2: 68, kpi3: 62 },
    { period: '7', kpi1: 78, kpi2: 65, kpi3: 70 },
    { period: '8', kpi1: 74, kpi2: 72, kpi3: 68 },
  ];

  const hasRealData = data.length >= 2;
  const isMock = !hasRealData;

  const chartData = hasRealData
    ? data.map(d => ({ period: d.period, kpi1: d.score }))
    : MOCK_DATA;

  return (
    <div className="flex-1 h-16 min-w-[200px] relative rounded-lg bg-muted/20 border border-border/40 px-2 py-1.5 group hover:bg-muted/40 transition-colors">
      {isMock && (
        <div className="absolute top-1 right-2 flex items-center gap-1 z-10">
          <span className="text-[8px] text-muted-foreground/50 font-medium uppercase tracking-wider">Preview</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} horizontal vertical={false} />
          <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
          <RechartsTooltip
            content={<SparklineTooltip isMock={isMock} />}
            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="kpi1"
            stroke={isMock ? MOCK_KPI_COLORS.kpi1 : RAG_LINE_COLORS[ragStatus]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 1, stroke: 'hsl(var(--background))' }}
            strokeDasharray={isMock ? '4 2' : undefined}
          />
          {isMock && (
            <>
              <Line type="monotone" dataKey="kpi2" stroke={MOCK_KPI_COLORS.kpi2} strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 1, stroke: 'hsl(var(--background))' }} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="kpi3" stroke={MOCK_KPI_COLORS.kpi3} strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 1, stroke: 'hsl(var(--background))' }} strokeDasharray="4 2" />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CustomersPage() {
  const { data: customers, isLoading, refetch } = useCustomersWithImpact();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deploymentFilter, setDeploymentFilter] = useState<string>('all');
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<any>(null);
  const [customerFeatures, setCustomerFeatures] = useState<Record<string, any[]>>({});

  // Fetch customer features
  useEffect(() => {
    if (customers) {
      fetchCustomerFeatures();
    }
  }, [customers]);

  const fetchCustomerFeatures = async () => {
    if (!customers) return;

    const { data, error } = await supabase
      .from('customer_features')
      .select('customer_id, features(id, name)')
      .in('customer_id', customers.map(c => c.id));

    if (!error && data) {
      const featuresMap: Record<string, any[]> = {};
      data.forEach(cf => {
        if (!featuresMap[cf.customer_id]) {
          featuresMap[cf.customer_id] = [];
        }
        if (cf.features) {
          featuresMap[cf.customer_id].push(cf.features);
        }
      });
      setCustomerFeatures(featuresMap);
    }
  };

  // Get unique tiers, statuses, and deployment types for filters
  const { tiers, statuses, deploymentTypes } = useMemo(() => {
    if (!customers) return { tiers: [], statuses: [], deploymentTypes: [] };
    const deployments = [...new Set(customers.map(c => c.deploymentType).filter(Boolean))].sort();
    return {
      tiers: [...new Set(customers.map(c => c.tier))].sort(),
      statuses: [...new Set(customers.map(c => c.status))].sort(),
      deploymentTypes: deployments as string[],
    };
  }, [customers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.region?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.industry?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesDeployment = deploymentFilter === 'all' || c.deploymentType === deploymentFilter;
      return matchesSearch && matchesTier && matchesStatus && matchesDeployment;
    });
  }, [customers, searchQuery, tierFilter, statusFilter, deploymentFilter]);

  // Summary stats - now based on filtered customers
  const stats = useMemo(() => {
    if (!filteredCustomers) return { total: 0, linked: 0, totalLinks: 0 };
    const linked = filteredCustomers.filter(c => c.linkedIndicatorCount > 0).length;
    const totalLinks = filteredCustomers.reduce((sum, c) => sum + c.linkedIndicatorCount, 0);
    return { total: filteredCustomers.length, linked, totalLinks };
  }, [filteredCustomers]);

  // Get status badge styling
  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-rag-green/10 text-rag-green border-rag-green/20';
      case 'Inactive':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'Prospect':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return '';
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <DrilldownBreadcrumb
        items={[
          { label: 'Portfolio', href: '/' },
          { label: 'Customers' }
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          </div>
          <p className="text-muted-foreground">
            Manage customers, view features, and track KPI impact
          </p>
        </div>
        <Button onClick={() => { setEditingCustomer(null); setCustomerFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-3xl font-bold">{stats.linked}</p>
                <p className="text-sm text-muted-foreground">Linked to KPIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-3xl font-bold">{stats.totalLinks}</p>
                <p className="text-sm text-muted-foreground">Total KPI Links</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tier Filter */}
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {tiers.map(tier => (
              <SelectItem key={tier} value={tier}>{tier}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Deployment Type Filter */}
        <Select value={deploymentFilter} onValueChange={setDeploymentFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Deployment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deployments</SelectItem>
            {deploymentTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <div className="grid gap-4">
        {filteredCustomers.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No customers found</h3>
            <p className="text-muted-foreground">
              {searchQuery || tierFilter !== 'all' || statusFilter !== 'all' || deploymentFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'No customers have been added yet.'}
            </p>
          </Card>
        ) : (
          filteredCustomers.map(customer => {
            const features = customerFeatures[customer.id] || [];
            return (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <Link to={`/customers/${customer.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Customer Avatar/Logo */}
                      <Avatar className="h-10 w-10">
                        {customer.logoUrl && <AvatarImage src={customer.logoUrl} alt={customer.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{customer.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline">{customer.tier}</Badge>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClasses(customer.status)}
                          >
                            {customer.status}
                          </Badge>
                          {customer.deploymentType && (
                            <Badge variant="outline" className="gap-1">
                              {customer.deploymentType === 'Cloud' ? (
                                <Cloud className="h-3 w-3" />
                              ) : customer.deploymentType === 'On Prem' ? (
                                <Server className="h-3 w-3" />
                              ) : null}
                              {customer.deploymentType}
                            </Badge>
                          )}
                          {customer.region && (
                            <span className="text-xs text-muted-foreground">{customer.region}</span>
                          )}
                          {customer.industry && (
                            <span className="text-xs text-muted-foreground">• {customer.industry}</span>
                          )}
                        </div>
                        {features.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {features.slice(0, 3).map(feature => (
                              <Badge key={feature.id} variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-foreground/10 text-foreground/80">
                                {feature.name}
                              </Badge>
                            ))}
                            {features.length > 3 && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-primary/20 transition-colors">
                                    +{features.length - 3} more
                                  </Badge>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64" align="start">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">All Features</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {features.map(f => (
                                      <Badge key={f.id} variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-foreground/10 text-foreground/80">
                                        {f.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center gap-4">
                      {/* Sparkline Trend */}
                      <CustomerSparkline data={customer.trendData} ragStatus={customer.ragStatus} />
                      {/* RAG Status */}
                      <div className="flex flex-col items-center">
                        <RAGBadge status={customer.ragStatus} size="md" />
                        <span className="text-[10px] text-muted-foreground mt-1">Health</span>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-2xl font-bold",
                          customer.linkedIndicatorCount > 0 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {customer.linkedIndicatorCount}
                        </p>
                        <p className="text-xs text-muted-foreground">KPIs</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingCustomer(customer);
                            setCustomerFormOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeletingCustomer(customer);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Customer Form Dialog */}
      <CustomerFormDialog
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        customer={editingCustomer}
        onSuccess={() => {
          refetch();
          fetchCustomerFeatures();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCustomer?.name}"? This will also remove all feature mappings and KPI links for this customer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from('customers')
                    .delete()
                    .eq('id', deletingCustomer.id);

                  if (error) throw error;
                  toast.success('Customer deleted successfully');
                  refetch();
                  setDeletingCustomer(null);
                } catch (error: any) {
                  console.error('Error deleting customer:', error);
                  toast.error(error.message || 'Failed to delete customer');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}