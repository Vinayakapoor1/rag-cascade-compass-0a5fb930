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
import { Users, Search, Building2, Activity, Loader2, Filter, Plus, Edit, Trash2, Tag, Cloud, Server, TrendingUp, Globe, Factory, UserCheck, Settings } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

function SparklineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/60 bg-popover px-3 py-2.5 text-popover-foreground shadow-xl text-xs space-y-1.5 min-w-[160px] backdrop-blur-sm">
      <p className="font-semibold text-[11px] text-foreground/80">
        Period {label}
      </p>
      <div className="border-t border-border/40 pt-1.5 space-y-1">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground text-[11px]">Health Score</span>
            </div>
            <span className="font-semibold text-[11px] tabular-nums">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerSparkline({ data, ragStatus }: { data: TrendDataPoint[]; ragStatus: RAGStatus }) {
  if (data.length < 2) {
    return (
      <div className="flex-1 h-16 min-w-[200px] relative rounded-lg bg-muted/20 border border-border/40 px-2 py-1.5 flex items-center justify-center">
        <span className="text-xs text-muted-foreground/60">No trend data yet</span>
      </div>
    );
  }

  const chartData = data.map(d => ({ period: d.period, kpi1: d.score }));

  return (
    <div className="flex-1 h-16 min-w-[200px] relative rounded-lg bg-muted/20 border border-border/40 px-2 py-1.5 group hover:bg-muted/40 transition-colors">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} horizontal vertical={false} />
          <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
          <RechartsTooltip
            content={<SparklineTooltip />}
            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="kpi1"
            stroke={RAG_LINE_COLORS[ragStatus]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 1, stroke: 'hsl(var(--background))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CustomersPage() {
  const { isAdmin, isDepartmentHead, isCSM, csmId } = useAuth();
  const { data: allCustomers, isLoading, refetch } = useCustomersWithImpact();

  // CSM users see only their assigned customers
  const customers = useMemo(() => {
    if (!allCustomers) return allCustomers;
    if (isCSM && !isAdmin && !isDepartmentHead && csmId) {
      return allCustomers.filter(c => c.csmId === csmId);
    }
    return allCustomers;
  }, [allCustomers, isCSM, isAdmin, isDepartmentHead, csmId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deploymentFilter, setDeploymentFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [csmFilter, setCsmFilter] = useState<string>('all');
  const [ragFilter, setRagFilter] = useState<string>('all');
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

  // Helper: filter customers by all filters EXCEPT the excluded one
  const filterExcluding = (exclude: string) => {
    if (!customers) return [];
    return customers.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) ||
        (c.region?.toLowerCase().includes(q)) ||
        (c.industry?.toLowerCase().includes(q)) ||
        (c.csmName?.toLowerCase().includes(q));
      const matchesTier = exclude === 'tier' || tierFilter === 'all' || c.tier === tierFilter;
      const matchesStatus = exclude === 'status' || statusFilter === 'all' || c.status === statusFilter;
      const matchesDeployment = exclude === 'deployment' || deploymentFilter === 'all' || (deploymentFilter === 'Unassigned' ? !c.deploymentType : c.deploymentType === deploymentFilter);
      const matchesRegion = exclude === 'region' || regionFilter === 'all' || c.region === regionFilter;
      const matchesIndustry = exclude === 'industry' || industryFilter === 'all' || c.industry === industryFilter;
      const matchesCsm = exclude === 'csm' || csmFilter === 'all' || c.csmName === csmFilter;
      const matchesRag = exclude === 'rag' || ragFilter === 'all' || c.ragStatus === ragFilter;
      return matchesSearch && matchesTier && matchesStatus && matchesDeployment && matchesRegion && matchesIndustry && matchesCsm && matchesRag;
    });
  };

  // Dynamic filter options - each computed from data filtered by all OTHER active filters
  const { tiers, statuses, deploymentTypes, regions, industries, csmNames, ragOptions } = useMemo(() => {
    if (!customers) return { tiers: [], statuses: [], deploymentTypes: [], regions: [], industries: [], csmNames: [], ragOptions: [] };
    return {
      tiers: [...new Set(filterExcluding('tier').map(c => c.tier))].sort(),
      statuses: [...new Set(filterExcluding('status').map(c => c.status))].sort(),
      deploymentTypes: [...new Set(filterExcluding('deployment').map(c => c.deploymentType || 'Unassigned'))].filter(d => d !== 'Cloud').sort() as string[],
      regions: [...new Set(filterExcluding('region').map(c => c.region).filter(Boolean))].sort() as string[],
      industries: [...new Set(filterExcluding('industry').map(c => c.industry).filter(Boolean))].sort() as string[],
      csmNames: [...new Set(filterExcluding('csm').map(c => c.csmName).filter(Boolean))].sort() as string[],
      ragOptions: [...new Set(filterExcluding('rag').map(c => c.ragStatus))].sort() as string[],
    };
  }, [customers, searchQuery, tierFilter, statusFilter, deploymentFilter, regionFilter, industryFilter, csmFilter, ragFilter]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) ||
        (c.region?.toLowerCase().includes(q)) ||
        (c.industry?.toLowerCase().includes(q)) ||
        (c.csmName?.toLowerCase().includes(q));
      const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesDeployment = deploymentFilter === 'all' || (deploymentFilter === 'Unassigned' ? !c.deploymentType : c.deploymentType === deploymentFilter);
      const matchesRegion = regionFilter === 'all' || c.region === regionFilter;
      const matchesIndustry = industryFilter === 'all' || c.industry === industryFilter;
      const matchesCsm = csmFilter === 'all' || c.csmName === csmFilter;
      const matchesRag = ragFilter === 'all' || c.ragStatus === ragFilter;
      return matchesSearch && matchesTier && matchesStatus && matchesDeployment && matchesRegion && matchesIndustry && matchesCsm && matchesRag;
    });
  }, [customers, searchQuery, tierFilter, statusFilter, deploymentFilter, regionFilter, industryFilter, csmFilter, ragFilter]);

  // Summary stats - now based on filtered customers
  const stats = useMemo(() => {
    if (!filteredCustomers) return { total: 0, linked: 0, uniqueKpis: 0 };
    const linked = filteredCustomers.filter(c => c.linkedIndicatorCount > 0).length;
    const allIndicatorIds = new Set<string>();
    filteredCustomers.forEach(c => c.linkedIndicatorIds?.forEach(id => allIndicatorIds.add(id)));
    return { total: filteredCustomers.length, linked, uniqueKpis: allIndicatorIds.size };
  }, [filteredCustomers]);

  // Filter breakdown counts
  const filterBreakdowns = useMemo(() => {
    if (!filteredCustomers.length) return [];

    const countBy = (key: (c: typeof filteredCustomers[0]) => string | null | undefined, label: string, icon: string, maxVisible?: number) => {
      const counts: Record<string, number> = {};
      filteredCustomers.forEach(c => {
        const val = key(c) || 'Unassigned';
        counts[val] = (counts[val] || 0) + 1;
      });
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) return null;
      const totalDistinct = entries.length;
      return { label, icon, counts: entries.map(([name, count]) => ({ name, count })), maxVisible, totalDistinct };
    };

    return [
      countBy(c => c.region, 'By Region', 'globe'),
      countBy(c => c.industry, 'By Industry', 'factory'),
      countBy(c => c.csmName, 'By CSM', 'usercheck', 7),
      countBy(c => c.deploymentType, 'By Deployment', 'server'),
      countBy(c => c.tier, 'By Tier', 'tag'),
      countBy(c => c.status, 'By Status', 'activity'),
      countBy(c => c.managedServices === true ? 'Yes' : c.managedServices === false ? 'No' : 'Unknown', 'By Managed Services', 'settings'),
    ].filter(Boolean) as { label: string; icon: string; counts: { name: string; count: number }[]; maxVisible?: number; totalDistinct: number }[];
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
                <p className="text-sm text-muted-foreground">Customers with KPIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-3xl font-bold">{stats.uniqueKpis}</p>
                <p className="text-sm text-muted-foreground">Unique KPIs Linked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Breakdown Stat Cards */}
      {filterBreakdowns.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {filterBreakdowns.map(breakdown => {
            const IconComponent = { globe: Globe, factory: Factory, usercheck: UserCheck, server: Server, tag: Tag, activity: Activity, settings: Settings }[breakdown.icon] || Tag;
            const maxShow = 5;
            const visible = breakdown.counts.slice(0, maxShow);
            const overflow = breakdown.counts.slice(maxShow);
            const isBadgeStyle = breakdown.icon === 'usercheck';

            return (
              <Card key={breakdown.label} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">{breakdown.label}</span>
                  {breakdown.totalDistinct > 1 && (
                    <span className="text-[10px] text-muted-foreground ml-auto">{breakdown.totalDistinct} total</span>
                  )}
                </div>
                {isBadgeStyle ? (
                  <div className="flex flex-wrap gap-1.5">
                    {visible.map(({ name, count }) => (
                      <Badge key={name} variant="secondary" className="text-[11px] px-2 py-0.5 font-normal">
                        {name}: {count}
                      </Badge>
                    ))}
                    {overflow.length > 0 && (
                      <HoverCard openDelay={0} closeDelay={150}>
                        <HoverCardTrigger>
                          <button type="button" className="inline-flex">
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-normal text-muted-foreground cursor-pointer hover:bg-muted/50">
                              +{overflow.length} more
                            </Badge>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-auto p-2 z-50 bg-popover border shadow-md" side="bottom" align="start">
                          <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                            {overflow.map(({ name, count }) => (
                              <Badge key={name} variant="secondary" className="text-[11px] px-2 py-0.5 font-normal">
                                {name}: {count}
                              </Badge>
                            ))}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {visible.map(({ name, count }) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <span className={cn("truncate", name === 'Unassigned' ? 'text-warning' : 'text-foreground')}>{name}</span>
                        <span className="font-semibold tabular-nums text-foreground ml-2">{count}</span>
                      </div>
                    ))}
                    {overflow.length > 0 && (
                      <HoverCard openDelay={0} closeDelay={150}>
                        <HoverCardTrigger>
                          <button type="button" className="text-[11px] text-muted-foreground pt-0.5 cursor-pointer hover:text-foreground transition-colors">
                            +{overflow.length} more
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-auto p-3 z-50 bg-popover border shadow-md" side="bottom" align="start">
                          <div className="space-y-1 min-w-[120px]">
                            {overflow.map(({ name, count }) => (
                              <div key={name} className="flex items-center justify-between text-xs">
                                <span className={cn("truncate", name === 'Unassigned' ? 'text-warning' : 'text-foreground')}>{name}</span>
                                <span className="font-semibold tabular-nums text-foreground ml-2">{count}</span>
                              </div>
                            ))}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

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
            <SelectValue placeholder="Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tiers</SelectItem>
            {tiers.map(tier => (
              <SelectItem key={tier} value={tier}>{tier}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Deployment Type Filter */}
        <Select value={deploymentFilter} onValueChange={setDeploymentFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Deployments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Deployments</SelectItem>
            {deploymentTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Region Filter */}
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Regions</SelectItem>
            {regions.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Industry Filter */}
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Industries</SelectItem>
            {industries.map(i => (
              <SelectItem key={i} value={i}>{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* CSM Filter */}
        <Select value={csmFilter} onValueChange={setCsmFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="CSMs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">CSMs</SelectItem>
            {csmNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* RAG Status Filter */}
        <Select value={ragFilter} onValueChange={setRagFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="RAG" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">RAG</SelectItem>
            {ragOptions.map(rag => {
              const label: Record<string, string> = { green: 'Green', amber: 'Amber', red: 'Red', 'not-set': 'Not Set' };
              return <SelectItem key={rag} value={rag}>{label[rag] || rag}</SelectItem>;
            })}
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
            {searchQuery || tierFilter !== 'all' || statusFilter !== 'all' || deploymentFilter !== 'all' || regionFilter !== 'all' || industryFilter !== 'all' || csmFilter !== 'all' || ragFilter !== 'all'
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
                      {/* Status Badge - Clickable Toggle */}
                      <Badge
                        className={cn(
                          "text-xs font-bold px-3 py-1 shrink-0 cursor-pointer hover:opacity-80 transition-opacity",
                          getStatusBadgeClasses(customer.status)
                        )}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
                          await supabase.from('customers').update({ status: newStatus }).eq('id', customer.id);
                          toast.success(`${customer.name} set to ${newStatus}`);
                          refetch();
                        }}
                        title="Click to toggle status"
                      >
                        {customer.status}
                      </Badge>
                      {/* Customer Avatar/Logo */}
                      <Avatar className="h-10 w-10 shrink-0">
                        {customer.logoUrl && <AvatarImage src={customer.logoUrl} alt={customer.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{customer.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline">{customer.tier}</Badge>
                          {customer.region && (
                            <span className="text-xs text-muted-foreground">{customer.region}</span>
                          )}
                          {customer.industry && (
                            <span className="text-xs text-muted-foreground">• {customer.industry}</span>
                          )}
                          {customer.deploymentType && (
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              {customer.deploymentType?.toLowerCase().includes('cloud') ? (
                                <Cloud className="h-3 w-3" />
                              ) : customer.deploymentType === 'On Prem' || customer.deploymentType === 'Hybrid' ? (
                                <Server className="h-3 w-3" />
                              ) : null}
                              {customer.deploymentType}
                            </Badge>
                          )}
                        </div>
                        {customer.csmName && (
                          <p className="text-xs text-muted-foreground mt-1">CSM: {customer.csmName}</p>
                        )}
                        {features.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {features.slice(0, 3).map(feature => (
                              <Badge key={feature.id} variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-foreground/10 text-foreground/80">
                                {feature.name}
                              </Badge>
                            ))}
                            {features.length > 3 && (
                              <HoverCard openDelay={0} closeDelay={200}>
                                <HoverCardTrigger asChild>
                                  <span
                                    className="inline-flex"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-primary/20 transition-colors">
                                      +{features.length - 3} more
                                    </Badge>
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-72 z-50" align="start" side="top">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">All Features ({features.length})</p>
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
                      <Link
                        to={`/customers/${customer.id}`}
                        className="text-right hover:opacity-80 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className={cn(
                          "text-2xl font-bold",
                          customer.linkedIndicatorCount > 0 ? "text-primary underline decoration-dotted underline-offset-4" : "text-muted-foreground"
                        )}>
                          {customer.linkedIndicatorCount}
                        </p>
                        <p className="text-xs text-muted-foreground">KPIs</p>
                      </Link>
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