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
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { RAGStatus } from '@/types/venture';

const RAG_LINE_COLORS: Record<RAGStatus, string> = {
  green: 'hsl(142, 71%, 45%)',
  amber: 'hsl(38, 92%, 50%)',
  red: 'hsl(0, 72%, 50%)',
  'not-set': 'hsl(var(--muted-foreground))',
};

function CustomerSparkline({ data, ragStatus }: { data: TrendDataPoint[]; ragStatus: RAGStatus }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground w-36">
        <TrendingUp className="h-3 w-3" />
        <span>No trend</span>
      </div>
    );
  }

  return (
    <div className="w-36 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="score"
            stroke={RAG_LINE_COLORS[ragStatus]}
            strokeWidth={1.5}
            dot={false}
          />
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
                              <Badge key={feature.id} variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-primary/15 text-primary border border-primary/20">
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
                                      <Badge key={f.id} variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-primary/15 text-primary border border-primary/20">
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