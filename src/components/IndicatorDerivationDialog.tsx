import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { RAGBadge } from '@/components/RAGBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { progressToRAG } from '@/lib/formulaCalculations';
import { RAGStatus } from '@/types/venture';

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
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  // Fetch distinct periods for this indicator
  const { data: periods = [] } = useQuery({
    queryKey: ['derivation-periods', indicatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('period')
        .eq('indicator_id', indicatorId);
      if (error) throw error;
      const unique = [...new Set((data || []).map(d => d.period))].sort().reverse();
      return unique;
    },
    enabled: open,
  });

  // Auto-select latest period
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0]);
    }
  }, [periods, selectedPeriod]);

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

  // Fetch scores for the selected period
  const { data: scores = [], isLoading } = useQuery({
    queryKey: ['derivation-scores', indicatorId, selectedPeriod, assignedCustomerIds],
    queryFn: async () => {
      let query = supabase
        .from('csm_customer_feature_scores')
        .select('id, customer_id, feature_id, value, period, customers(name), features(name)')
        .eq('indicator_id', indicatorId)
        .eq('period', selectedPeriod);

      // RBAC: CSMs only see their assigned customers
      if (isCSM && !isAdmin && assignedCustomerIds) {
        query = query.in('customer_id', assignedCustomerIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ScoreRow[];
    },
    enabled: open && !!selectedPeriod,
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

  // Group scores by customer
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
        average, // This is a vector weight average (0-1 scale)
      };
    }).sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [scores]);

  // All unique feature names across customers
  const featureNames = useMemo(() => {
    const names = new Set<string>();
    breakdown.forEach(c => c.featureScores.forEach(f => names.add(f.featureName)));
    return Array.from(names).sort();
  }, [breakdown]);

  // Overall KPI aggregate
  // Overall KPI aggregate: average of customer vector-weight averages, then × 100 for percentage
  const kpiAggregate = useMemo(() => {
    if (breakdown.length === 0) return 0;
    const total = breakdown.reduce((sum, c) => sum + c.average, 0);
    const rawAvg = total / breakdown.length;
    return rawAvg * 100; // Convert vector weight (0-1) to percentage (0-100)
  }, [breakdown]);

  const kpiStatus = progressToRAG(kpiAggregate);

  // Chart data - customer averages converted to percentage
  const chartData = breakdown.map(c => ({
    name: c.customerName.length > 15 ? c.customerName.slice(0, 14) + '…' : c.customerName,
    fullName: c.customerName,
    average: Math.round(c.average * 100 * 10) / 10, // vector weight → percentage
  }));

  const percentage = currentValue !== null && targetValue !== null && targetValue > 0
    ? (currentValue / targetValue) * 100
    : 0;

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

        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Period:</span>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCSM && !isAdmin && (
            <Badge variant="outline" className="text-xs">CSM View — Showing your assigned customers only</Badge>
          )}
        </div>

        {/* RAG Bands Reference */}
        {ragBands.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Bands:</span>
            {ragBands.map(band => (
              <Badge
                key={band.id}
                variant="outline"
                className="text-xs"
                style={{ borderColor: band.rag_color, color: band.rag_color }}
              >
                {band.band_label} ({band.rag_numeric})
              </Badge>
            ))}
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
            {/* Bar Chart */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3">Customer Average Scores</p>
                <ResponsiveContainer width="100%" height={Math.max(200, breakdown.length * 40)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Avg Score']}
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

            {/* Aggregation Summary */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <p className="text-sm font-medium mb-1">Aggregation Formula</p>
                <p className="text-xs text-muted-foreground">
                  AVG of {breakdown.length} customer averages → ({breakdown.map(c => `${Math.round(c.average * 100)}%`).join(' + ')}) ÷ {breakdown.length} = <span className="font-bold text-foreground">{Math.round(kpiAggregate * 10) / 10}%</span>
                </p>
              </CardContent>
            </Card>

            {/* Detailed Breakdown Table */}
            <div className="overflow-x-auto">
              <p className="text-sm font-medium mb-2">Customer × Feature Breakdown</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">Customer</TableHead>
                    {featureNames.map(f => (
                      <TableHead key={f} className="text-center min-w-[100px] text-xs">{f}</TableHead>
                    ))}
                    <TableHead className="text-center font-bold min-w-[80px]">Avg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map(customer => (
                    <TableRow key={customer.customerId}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{customer.customerName}</TableCell>
                      {featureNames.map(featureName => {
                        const score = customer.featureScores.find(f => f.featureName === featureName);
                        const val = score?.value;
                        const pctVal = val !== null && val !== undefined ? Math.round(val * 100) : null;
                        return (
                          <TableCell key={featureName} className="text-center text-sm">
                            {pctVal !== null ? (
                              <span className={
                                pctVal >= 76 ? 'text-rag-green font-medium' :
                                pctVal >= 51 ? 'text-rag-amber font-medium' :
                                pctVal > 0 ? 'text-rag-red font-medium' :
                                'text-muted-foreground'
                              }>
                                {pctVal}%
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
                          return (
                            <span className={
                              avgPct >= 76 ? 'text-rag-green' :
                              avgPct >= 51 ? 'text-rag-amber' :
                              avgPct > 0 ? 'text-rag-red' :
                              'text-muted-foreground'
                            }>
                              {avgPct}%
                            </span>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
