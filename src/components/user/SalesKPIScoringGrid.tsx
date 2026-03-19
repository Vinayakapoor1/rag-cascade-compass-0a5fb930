import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Save, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalesKPIScoringGridProps {
  departmentId: string;
  period: string;
}

interface SalesIndicator {
  id: string;
  name: string;
  current_value: number | null;
  rag_status: string | null;
  target_value: number | null;
  unit: string | null;
  kr_id: string;
  kr_name: string;
  fo_id: string;
  fo_name: string;
}

interface RAGBand {
  id: string;
  indicator_id: string;
  band_label: string;
  rag_color: string;
  rag_numeric: number;
  sort_order: number;
}

export function SalesKPIScoringGrid({ departmentId, period }: SalesKPIScoringGridProps) {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [indicators, setIndicators] = useState<SalesIndicator[]>([]);
  const [bands, setBands] = useState<Record<string, RAGBand[]>>({});
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [originalSelections, setOriginalSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedFOs, setExpandedFOs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [departmentId, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get FOs for this department
      const { data: fos } = await supabase
        .from('functional_objectives')
        .select('id, name')
        .eq('department_id', departmentId)
        .order('name');

      const allIndicators: SalesIndicator[] = [];
      const indicatorIds: string[] = [];

      for (const fo of fos || []) {
        const { data: krs } = await supabase
          .from('key_results')
          .select('id, name')
          .eq('functional_objective_id', fo.id)
          .order('name');

        for (const kr of krs || []) {
          const { data: inds } = await supabase
            .from('indicators')
            .select('id, name, current_value, rag_status, target_value, unit')
            .eq('key_result_id', kr.id)
            .order('name');

          for (const ind of inds || []) {
            allIndicators.push({
              ...ind,
              kr_id: kr.id,
              kr_name: kr.name,
              fo_id: fo.id,
              fo_name: fo.name,
            });
            indicatorIds.push(ind.id);
          }
        }
      }

      setIndicators(allIndicators);
      setExpandedFOs(new Set(fos?.map(f => f.id) || []));

      // Fetch RAG bands for all indicators
      if (indicatorIds.length > 0) {
        const { data: ragBands } = await supabase
          .from('kpi_rag_bands')
          .select('*')
          .in('indicator_id', indicatorIds)
          .order('sort_order');

        const bandsMap: Record<string, RAGBand[]> = {};
        for (const band of ragBands || []) {
          if (!bandsMap[band.indicator_id]) bandsMap[band.indicator_id] = [];
          bandsMap[band.indicator_id].push(band);
        }
        setBands(bandsMap);
      }

      // Load existing history for this period to pre-select bands
      if (indicatorIds.length > 0) {
        const { data: history } = await supabase
          .from('indicator_history')
          .select('indicator_id, value')
          .in('indicator_id', indicatorIds)
          .eq('period', period)
          .order('created_at', { ascending: false });

        // Use the latest entry per indicator for this period
        const preSelections: Record<string, string> = {};
        const seen = new Set<string>();
        for (const h of history || []) {
          if (!seen.has(h.indicator_id!)) {
            seen.add(h.indicator_id!);
            preSelections[h.indicator_id!] = String(h.value);
          }
        }
        setSelections(preSelections);
        setOriginalSelections({ ...preSelections });
      }
    } catch (error) {
      console.error('Error loading Sales KPI data:', error);
      toast.error('Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  const handleBandSelect = (indicatorId: string, ragNumeric: string) => {
    setSelections(prev => ({ ...prev, [indicatorId]: ragNumeric }));
  };

  const hasChanges = Object.keys(selections).length > 0;

  const handleSaveAll = async () => {
    if (!hasChanges || !user) return;

    setSaving(true);
    let savedCount = 0;

    try {
      for (const [indicatorId, ragNumericStr] of Object.entries(selections)) {
        const ragNumeric = parseFloat(ragNumericStr);
        if (isNaN(ragNumeric)) continue;

        const indicator = indicators.find(i => i.id === indicatorId);
        if (!indicator) continue;

        const indicatorBands = bands[indicatorId] || [];
        const selectedBand = indicatorBands.find(b => b.rag_numeric === ragNumeric);
        if (!selectedBand) continue;

        // Insert history record
        const { error: historyError } = await supabase
          .from('indicator_history')
          .insert({
            indicator_id: indicatorId,
            value: ragNumeric,
            period,
            created_by: user.id,
            notes: `Band: ${selectedBand.band_label}`,
          });

        if (historyError) {
          console.error('History insert failed:', historyError);
          continue;
        }

        // Update indicator
        const { error } = await supabase
          .from('indicators')
          .update({
            current_value: ragNumeric,
            rag_status: selectedBand.rag_color,
          })
          .eq('id', indicatorId);

        if (error) {
          console.error('Indicator update failed:', error);
          continue;
        }

        savedCount++;

        await logActivity({
          action: 'update',
          entityType: 'indicator',
          entityId: indicatorId,
          entityName: indicator.name,
          oldValue: { current_value: indicator.current_value, rag_status: indicator.rag_status },
          newValue: { current_value: ragNumeric, rag_status: selectedBand.rag_color },
          metadata: {
            department_id: departmentId,
            period,
            band_label: selectedBand.band_label,
            scoring_method: 'sales_kpi_grid',
          },
        });
      }

      toast.success(`Saved ${savedCount} KPI score${savedCount > 1 ? 's' : ''}`);
      fetchData(); // Refresh
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const toggleFO = (foId: string) => {
    setExpandedFOs(prev => {
      const next = new Set(prev);
      if (next.has(foId)) next.delete(foId);
      else next.add(foId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Group by FO
  const foGroups = indicators.reduce<Record<string, { fo_name: string; indicators: SalesIndicator[] }>>((acc, ind) => {
    if (!acc[ind.fo_id]) acc[ind.fo_id] = { fo_name: ind.fo_name, indicators: [] };
    acc[ind.fo_id].indicators.push(ind);
    return acc;
  }, {});

  const ragColorStyles: Record<string, string> = {
    green: 'bg-rag-green text-white',
    amber: 'bg-rag-amber text-white',
    red: 'bg-rag-red text-white',
  };

  return (
    <div className="space-y-4">
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveAll} disabled={saving || !hasChanges}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save All Scores
        </Button>
      </div>

      {Object.entries(foGroups).map(([foId, group]) => (
        <Card key={foId}>
          <CardHeader
            className="cursor-pointer py-3 px-4"
            onClick={() => toggleFO(foId)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              {expandedFOs.has(foId) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {group.fo_name}
              <Badge variant="secondary" className="ml-auto text-xs">
                {group.indicators.length} KPI{group.indicators.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>

          {expandedFOs.has(foId) && (
            <CardContent className="pt-0 px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">KPI</TableHead>
                    <TableHead className="w-[20%]">Key Result</TableHead>
                    <TableHead className="w-[15%] text-center">Current Status</TableHead>
                    <TableHead className="w-[35%]">Select Band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.indicators.map(ind => {
                    const indicatorBands = bands[ind.id] || [];
                    const currentSelection = selections[ind.id];
                    const currentBand = currentSelection
                      ? indicatorBands.find(b => b.rag_numeric === parseFloat(currentSelection))
                      : null;
                    const displayStatus = currentBand?.rag_color || ind.rag_status || 'not-set';

                    return (
                      <TableRow key={ind.id}>
                        <TableCell className="font-medium text-sm">{ind.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ind.kr_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            'text-xs',
                            ragColorStyles[displayStatus] || 'bg-muted text-muted-foreground'
                          )}>
                            {currentBand?.band_label || (ind.current_value !== null ? `${ind.current_value}` : 'Not Set')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {indicatorBands.length > 0 ? (
                            <Select
                              value={currentSelection || ''}
                              onValueChange={(val) => handleBandSelect(ind.id, val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select a band…" />
                              </SelectTrigger>
                              <SelectContent>
                                {indicatorBands.map(band => (
                                  <SelectItem key={band.id} value={String(band.rag_numeric)}>
                                    <div className="flex items-center gap-2">
                                      <div className={cn('h-2.5 w-2.5 rounded-full', ragColorStyles[band.rag_color] || 'bg-muted')} />
                                      {band.band_label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">No bands configured</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      ))}

      {indicators.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No KPIs found for this department.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
