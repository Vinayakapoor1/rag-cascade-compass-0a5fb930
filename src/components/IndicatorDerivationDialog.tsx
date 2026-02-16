import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RAGBadge } from '@/components/RAGBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { progressToRAG } from '@/lib/formulaCalculations';
import { RAGStatus } from '@/types/venture';
import { X, Calendar as CalendarIcon, ToggleLeft, ToggleRight, TrendingUp } from 'lucide-react';
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

interface IndicatorDerivationDialogProps {
  indicatorId: string;
  indicatorName: string;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScoreRow {
  id: string;
  customer_id: string;
  feature_id: string;
  value: number | null;
  period: string;
  customers: { name: string } | null;
  features: { name: string } | null;
}

interface CustomerBreakdown {
  customerId: string;
  customerName: string;
  featureScores: { featureName: string; value: number | null }[];
  average: number;
}

const RAG_COLORS: Record<string, string> = {
  green: 'hsl(142, 71%, 45%)',
  amber: 'hsl(38, 92%, 50%)',
  red: 'hsl(0, 84%, 60%)',
  'not-set': 'hsl(var(--muted-foreground))',
};

function getBarColor(value: number): string {
  if (value >= 76) return RAG_COLORS.green;
  if (value >= 51) return RAG_COLORS.amber;
  if (value > 0) return RAG_COLORS.red;
  return RAG_COLORS['not-set'];
}

/** Map a rag_numeric weight (0, 0.5, 1) to its band label if custom bands exist */
function getBandLabel(ragNumeric: number, ragBands: { band_label: string; rag_numeric: number; rag_color: string }[]): string | null {
  if (ragBands.length === 0) return null;
  const band = ragBands.find(b => b.rag_numeric === ragNumeric);
  return band ? band.band_label : null;
}

function getBandColorClass(ragNumeric: number, ragBands: { band_label: string; rag_numeric: number; rag_color: string }[]): string {
  const band = ragBands.find(b => b.rag_numeric === ragNumeric);
  if (!band) return 'text-muted-foreground';
  if (band.rag_color === 'green') return 'text-rag-green font-medium';
  if (band.rag_color === 'amber') return 'text-rag-amber font-medium';
  if (band.rag_color === 'red') return 'text-rag-red font-medium';
  return 'text-muted-foreground';
}

function getRAGFromPct(pct: number): RAGStatus {
  if (pct >= 76) return 'green';
  if (pct >= 51) return 'amber';
  if (pct > 0) return 'red';
  return 'not-set';
}

function computeAggregateFromScores(scores: ScoreRow[]): number {
  const grouped = new Map<string, number[]>();
  scores.forEach(s => {
    if (s.value === null) return;
    if (!grouped.has(s.customer_id)) grouped.set(s.customer_id, []);
    grouped.get(s.customer_id)!.push(s.value);
  });
  if (grouped.size === 0) return 0;
  let total = 0;
  grouped.forEach(values => {
    total += values.reduce((a, b) => a + b, 0) / values.length;
  });
  return (total / grouped.size) * 100;
}

export function IndicatorDerivationDialog({
  indicatorId,
  indicatorName,
  currentValue,
  targetValue,
  unit,
  open,
  onOpenChange,
}: IndicatorDerivationDialogProps) {
  const { isAdmin, isCSM, csmId } = useAuth();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [ragFilter, setRagFilter] = useState<RAGStatus | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch ALL scores for this indicator (for trendline + period list)
  const { data: allScores = [], isLoading: allScoresLoading } = useQuery({
    queryKey: ['derivation-all-scores', indicatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('id, customer_id, feature_id, value, period, customers(name), features(name)')
        .eq('indicator_id', indicatorId);
      if (error) throw error;
      return (data || []) as ScoreRow[];
    },
    enabled: open,
    staleTime: 60000,
  });

  // For CSMs, fetch their assigned customer IDs
  const { data: assignedCustomerIds } = useQuery({
    queryKey: ['csm-assigned-customers', csmId],
    queryFn: async () => {
      if (!csmId) return null;
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('csm_id', csmId);
      if (error) throw error;
      return (data || []).map(c => c.id);
    },
    enabled: open && isCSM && !isAdmin && !!csmId,
  });

  // Fetch RAG bands for this indicator
  const { data: ragBands = [] } = useQuery({
    queryKey: ['kpi-rag-bands', indicatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_rag_bands')
        .select('*')
        .eq('indicator_id', indicatorId)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Apply RBAC filter
  const rbacFilteredScores = useMemo(() => {
    if (isCSM && !isAdmin && assignedCustomerIds) {
      return allScores.filter(s => assignedCustomerIds.includes(s.customer_id));
    }
    return allScores;
  }, [allScores, isCSM, isAdmin, assignedCustomerIds]);

  // Distinct periods from data, filtered by mode
  const periods = useMemo(() => {
    const unique = [...new Set(rbacFilteredScores.map(s => s.period))];
    // Filter by mode: monthly = YYYY-MM, weekly = YYYY-Wxx
    const filtered = unique.filter(p => {
      if (periodMode === 'monthly') return /^\d{4}-\d{2}$/.test(p);
      if (periodMode === 'weekly') return /^\d{4}-W\d{2}$/.test(p);
      return true;
    });
    return filtered.sort().reverse();
  }, [rbacFilteredScores, periodMode]);

  // Auto-select latest period when periods change
  useEffect(() => {
    if (periods.length > 0) {
      if (!periods.includes(selectedPeriod)) {
        setSelectedPeriod(periods[0]);
      }
    } else {
      setSelectedPeriod('');
    }
  }, [periods]);

  // Scores for the selected period
  const scores = useMemo(() => {
    return rbacFilteredScores.filter(s => s.period === selectedPeriod);
  }, [rbacFilteredScores, selectedPeriod]);

  const isLoading = allScoresLoading;

  // Trendline data: aggregate per period (sorted chronologically)
  const trendlineData = useMemo(() => {
    const periodGroups = new Map<string, ScoreRow[]>();
    rbacFilteredScores.forEach(s => {
      // Filter by current mode
      if (periodMode === 'monthly' && !/^\d{4}-\d{2}$/.test(s.period)) return;
      if (periodMode === 'weekly' && !/^\d{4}-W\d{2}$/.test(s.period)) return;
      if (!periodGroups.has(s.period)) periodGroups.set(s.period, []);
      periodGroups.get(s.period)!.push(s);
    });

    return Array.from(periodGroups.entries())
      .map(([period, scores]) => ({
        period,
        aggregate: Math.round(computeAggregateFromScores(scores) * 10) / 10,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [rbacFilteredScores, periodMode]);

  // Group scores by customer (unfiltered — for aggregate calculation)
  const breakdown = useMemo((): CustomerBreakdown[] => {
    const grouped = new Map<string, { customerName: string; features: Map<string, number | null> }>();

    scores.forEach(score => {
      if (!grouped.has(score.customer_id)) {
        grouped.set(score.customer_id, {
          customerName: score.customers?.name || 'Unknown',
          features: new Map(),
        });
      }
      const entry = grouped.get(score.customer_id)!;
      const featureName = score.features?.name || 'Unknown';
      entry.features.set(featureName, score.value);
    });

    return Array.from(grouped.entries()).map(([customerId, data]) => {
      const featureScores = Array.from(data.features.entries()).map(([featureName, value]) => ({
        featureName,
        value,
      }));
      const validValues = featureScores.filter(f => f.value !== null).map(f => f.value!);
      const average = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;

      return {
        customerId,
        customerName: data.customerName,
        featureScores,
        average,
      };
    }).sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [scores]);

  // All unique feature names and customer names for filter dropdowns
  const allFeatureNames = useMemo(() => {
    const names = new Set<string>();
    breakdown.forEach(c => c.featureScores.forEach(f => names.add(f.featureName)));
    return Array.from(names).sort();
  }, [breakdown]);

  const allCustomerNames = useMemo(() => {
    return breakdown.map(c => ({ id: c.customerId, name: c.customerName }));
  }, [breakdown]);

  // Filtered breakdown based on customer, feature, and RAG filters
  const filteredBreakdown = useMemo(() => {
    let filtered = breakdown;
    if (customerFilter !== 'all') {
      filtered = filtered.filter(c => c.customerId === customerFilter);
    }
    if (ragFilter) {
      filtered = filtered.filter(c => {
        const avgPct = Math.round(c.average * 100);
        return getRAGFromPct(avgPct) === ragFilter;
      });
    }
    return filtered;
  }, [breakdown, customerFilter, ragFilter]);

  // Feature names to show (filtered)
  const visibleFeatureNames = useMemo(() => {
    if (featureFilter !== 'all') return [featureFilter];
    const names = new Set<string>();
    filteredBreakdown.forEach(c => c.featureScores.forEach(f => names.add(f.featureName)));
    return Array.from(names).sort();
  }, [filteredBreakdown, featureFilter]);

  // Overall KPI aggregate (always from unfiltered data)
  const kpiAggregate = useMemo(() => {
    if (breakdown.length === 0) return 0;
    const total = breakdown.reduce((sum, c) => sum + c.average, 0);
    const rawAvg = total / breakdown.length;
    return rawAvg * 100;
  }, [breakdown]);

  const kpiStatus = progressToRAG(kpiAggregate);

  // Chart data from filtered breakdown
  const chartData = filteredBreakdown.map(c => ({
    name: c.customerName.length > 15 ? c.customerName.slice(0, 14) + '…' : c.customerName,
    fullName: c.customerName,
    average: Math.round(c.average * 100 * 10) / 10,
  }));

  const hasActiveFilters = customerFilter !== 'all' || featureFilter !== 'all' || ragFilter !== null;

  const clearAllFilters = () => {
    setCustomerFilter('all');
    setFeatureFilter('all');
    setRagFilter(null);
  };

  // RAG distribution counts for clickable badges
  const ragCounts = useMemo(() => {
    const counts: Record<string, number> = { green: 0, amber: 0, red: 0, 'not-set': 0 };
    breakdown.forEach(c => {
      const avgPct = Math.round(c.average * 100);
      const status = getRAGFromPct(avgPct);
      counts[status]++;
    });
    return counts;
  }, [breakdown]);

  const ragLabels: Record<string, string> = { green: 'On Track', amber: 'At Risk', red: 'Critical', 'not-set': 'Not Set' };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const p = dateToPeriod(date, periodMode);
    // If matching period exists in data, select it; otherwise set it anyway
    setSelectedPeriod(p);
    setCalendarOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{indicatorName}</span>
            <RAGBadge status={kpiStatus} size="md" showLabel />
          </DialogTitle>
          <DialogDescription>
            Derivation breakdown showing how customer scores aggregate to the KPI value.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold">{currentValue !== null ? `${currentValue}${unit || '%'}` : '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">Target Value</p>
              <p className="text-2xl font-bold">{targetValue !== null ? `${targetValue}${unit || '%'}` : '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">Calculated Aggregate</p>
              <p className="text-2xl font-bold">{Math.round(kpiAggregate * 10) / 10}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Period Selection Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">Period:</span>

          {/* Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPeriodMode(m => m === 'monthly' ? 'weekly' : 'monthly')}
            className="gap-1.5"
          >
            {periodMode === 'monthly' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
            {periodMode === 'monthly' ? 'Monthly' : 'Weekly'}
          </Button>

          {/* Period Dropdown */}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
              {periods.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No {periodMode} data</div>
              )}
            </SelectContent>
          </Select>

          {/* Calendar Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" title="Pick a date">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                onSelect={handleCalendarSelect}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {isCSM && !isAdmin && (
            <Badge variant="outline" className="text-xs">CSM View — Your customers only</Badge>
          )}
        </div>

        {/* Historical Trendline */}
        {trendlineData.length > 1 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Historical Trendline ({periodMode === 'monthly' ? 'Monthly' : 'Weekly'})
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendlineData} margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Aggregate']} />
                  {targetValue !== null && (
                    <ReferenceLine y={targetValue} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: `Target`, position: 'right', fontSize: 10 }} />
                  )}
                  <Line
                    type="monotone"
                    dataKey="aggregate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isSelected = payload.period === selectedPeriod;
                      return (
                        <circle
                          key={payload.period}
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 6 : 4}
                          fill={getBarColor(payload.aggregate)}
                          stroke={isSelected ? 'hsl(var(--foreground))' : 'none'}
                          strokeWidth={isSelected ? 2 : 0}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedPeriod(payload.period)}
                        />
                      );
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-muted-foreground text-center mt-1">
                Click a point to view that period's breakdown • {trendlineData.length} periods with data
              </p>
            </CardContent>
          </Card>
        )}

        {/* RAG Bands Reference — Clickable as filters */}
        {ragBands.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Bands:</span>
            {ragBands.map(band => {
              const bandRag = band.rag_color as RAGStatus;
              const isActive = ragFilter === bandRag;
              return (
                <Badge
                  key={band.id}
                  variant={isActive ? 'default' : 'outline'}
                  className="text-xs cursor-pointer transition-all hover:scale-105"
                  style={{
                    borderColor: band.rag_color === 'green' ? RAG_COLORS.green : band.rag_color === 'amber' ? RAG_COLORS.amber : RAG_COLORS.red,
                    color: isActive ? 'white' : band.rag_color === 'green' ? RAG_COLORS.green : band.rag_color === 'amber' ? RAG_COLORS.amber : RAG_COLORS.red,
                    backgroundColor: isActive ? (band.rag_color === 'green' ? RAG_COLORS.green : band.rag_color === 'amber' ? RAG_COLORS.amber : RAG_COLORS.red) : 'transparent',
                  }}
                  onClick={() => setRagFilter(isActive ? null : bandRag)}
                >
                  {band.band_label} ({band.rag_numeric})
                </Badge>
              );
            })}
          </div>
        )}

        {/* RAG Status Filter Badges */}
        {breakdown.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter by status:</span>
            {(['green', 'amber', 'red'] as RAGStatus[]).map(status => {
              const count = ragCounts[status];
              if (count === 0) return null;
              const isActive = ragFilter === status;
              return (
                <Badge
                  key={status}
                  variant={isActive ? 'default' : 'outline'}
                  className="text-xs cursor-pointer transition-all hover:scale-105 gap-1"
                  style={{
                    borderColor: RAG_COLORS[status],
                    color: isActive ? 'white' : RAG_COLORS[status],
                    backgroundColor: isActive ? RAG_COLORS[status] : 'transparent',
                  }}
                  onClick={() => setRagFilter(isActive ? null : status)}
                >
                  {ragLabels[status]} ({count})
                </Badge>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : breakdown.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No CSM scores found for this indicator in the selected period.</p>
          </Card>
        ) : (
          <>
            {/* Customer & Feature Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {allCustomerNames.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={featureFilter} onValueChange={setFeatureFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Features" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Features</SelectItem>
                  {allFeatureNames.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Bar Chart */}
            {filteredBreakdown.length > 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-3">Customer Average Scores</p>
                  <ResponsiveContainer width="100%" height={Math.max(200, filteredBreakdown.length * 40)}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => {
                          if (ragBands.length > 0) {
                            const bandLabel = getBandLabel(value / 100, ragBands);
                            return [bandLabel ? `${bandLabel} (${value}%)` : `${value}%`, 'Avg Score'];
                          }
                          return [`${value}%`, 'Avg Score'];
                        }}
                        labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload?.fullName || label}
                      />
                      {targetValue !== null && (
                        <ReferenceLine x={targetValue} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: `Target: ${targetValue}%`, position: 'top', fontSize: 11 }} />
                      )}
                      <Bar dataKey="average" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={getBarColor(entry.average)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground text-sm">No customers match the selected filters.</p>
              </Card>
            )}

            {/* Aggregation Summary */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <p className="text-sm font-medium mb-1">Aggregation Formula</p>
                <p className="text-xs text-muted-foreground">
                  AVG of {breakdown.length} customer averages → ({breakdown.map(c => {
                    const pct = Math.round(c.average * 100);
                    const label = getBandLabel(c.average, ragBands);
                    return label ? label : `${pct}%`;
                  }).join(' + ')}) ÷ {breakdown.length} = <span className="font-bold text-foreground">{Math.round(kpiAggregate * 10) / 10}%</span>
                </p>
                {hasActiveFilters && (
                  <p className="text-[11px] text-muted-foreground/70 mt-1 italic">
                    Note: Aggregate is calculated from all {breakdown.length} customers. Filters only affect the view below.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Detailed Breakdown Table */}
            {filteredBreakdown.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-sm font-medium mb-2">
                  Customer × Feature Breakdown
                  {hasActiveFilters && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      (Showing {filteredBreakdown.length} of {breakdown.length} customers)
                    </span>
                  )}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">Customer</TableHead>
                      {visibleFeatureNames.map(f => (
                        <TableHead key={f} className="text-center min-w-[100px] text-xs">{f}</TableHead>
                      ))}
                      <TableHead className="text-center font-bold min-w-[80px]">Avg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBreakdown.map(customer => (
                      <TableRow key={customer.customerId}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{customer.customerName}</TableCell>
                        {visibleFeatureNames.map(featureName => {
                          const score = customer.featureScores.find(f => f.featureName === featureName);
                          const val = score?.value;
                          const pctVal = val !== null && val !== undefined ? Math.round(val * 100) : null;
                          const bandLabel = val !== null && val !== undefined ? getBandLabel(val, ragBands) : null;
                          return (
                            <TableCell key={featureName} className="text-center text-sm">
                              {pctVal !== null ? (
                                <span className={
                                  ragBands.length > 0
                                    ? getBandColorClass(val!, ragBands)
                                    : pctVal >= 76 ? 'text-rag-green font-medium' :
                                      pctVal >= 51 ? 'text-rag-amber font-medium' :
                                      pctVal > 0 ? 'text-rag-red font-medium' :
                                      'text-muted-foreground'
                                }>
                                  {bandLabel ?? `${pctVal}%`}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold text-sm">
                          {(() => {
                            const avgPct = Math.round(customer.average * 100);
                            const avgBandLabel = getBandLabel(customer.average, ragBands);
                            return (
                              <span className={
                                avgPct >= 76 ? 'text-rag-green' :
                                avgPct >= 51 ? 'text-rag-amber' :
                                avgPct > 0 ? 'text-rag-red' :
                                'text-muted-foreground'
                              }>
                                {avgBandLabel ? `${avgBandLabel} (${avgPct}%)` : `${avgPct}%`}
                              </span>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
