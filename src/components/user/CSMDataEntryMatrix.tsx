import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface CSMDataEntryMatrixProps {
  departmentId: string;
  period: string;
}

interface MatrixIndicator {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  kr_name: string;
  fo_name: string;
  features: { id: string; name: string }[];
}

interface RAGBand {
  band_label: string;
  rag_color: string;
  rag_numeric: number;
  sort_order: number;
}

const DEFAULT_BANDS: RAGBand[] = [
  { band_label: '76-100%', rag_color: 'green', rag_numeric: 1, sort_order: 1 },
  { band_label: '51-75%', rag_color: 'amber', rag_numeric: 0.5, sort_order: 2 },
  { band_label: '1-50%', rag_color: 'red', rag_numeric: 0, sort_order: 3 },
];

type ScoreMap = Record<string, { score_band: string; rag_value: number }>;

const RAG_BG: Record<string, string> = {
  green: 'bg-rag-green/20 border-rag-green/40',
  amber: 'bg-rag-amber/20 border-rag-amber/40',
  red: 'bg-rag-red/20 border-rag-red/40',
};

const RAG_BADGE: Record<string, string> = {
  green: 'bg-rag-green text-rag-green-foreground',
  amber: 'bg-rag-amber text-rag-amber-foreground',
  red: 'bg-rag-red text-rag-red-foreground',
  gray: 'bg-muted text-muted-foreground',
};

function cellKey(indicatorId: string, featureId: string) {
  return `${indicatorId}::${featureId}`;
}

function percentToRAG(pct: number): string {
  if (pct >= 76) return 'green';
  if (pct >= 51) return 'amber';
  return 'red';
}

export function CSMDataEntryMatrix({ departmentId, period }: CSMDataEntryMatrixProps) {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matrixIndicators, setMatrixIndicators] = useState<MatrixIndicator[]>([]);
  const [bandsByIndicator, setBandsByIndicator] = useState<Record<string, RAGBand[]>>({});
  const [scores, setScores] = useState<ScoreMap>({});
  const [originalScores, setOriginalScores] = useState<ScoreMap>({});

  // All unique features across all indicators
  const allFeatures = useMemo(() => {
    const map = new Map<string, string>();
    matrixIndicators.forEach(ind =>
      ind.features.forEach(f => map.set(f.id, f.name))
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [matrixIndicators]);

  const fetchData = useCallback(async () => {
    if (!departmentId || !user) return;
    setLoading(true);

    try {
      // 1. Get indicators for department (FO -> KR -> Indicators)
      const { data: fos } = await supabase
        .from('functional_objectives')
        .select('id, name')
        .eq('department_id', departmentId);

      if (!fos?.length) {
        setMatrixIndicators([]);
        setLoading(false);
        return;
      }

      const foIds = fos.map(f => f.id);
      const { data: krs } = await supabase
        .from('key_results')
        .select('id, name, functional_objective_id')
        .in('functional_objective_id', foIds);

      if (!krs?.length) {
        setMatrixIndicators([]);
        setLoading(false);
        return;
      }

      const krIds = krs.map(k => k.id);
      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, name, current_value, target_value, key_result_id')
        .in('key_result_id', krIds);

      if (!indicators?.length) {
        setMatrixIndicators([]);
        setLoading(false);
        return;
      }

      const indIds = indicators.map(i => i.id);

      // 2. Get feature links
      const { data: links } = await supabase
        .from('indicator_feature_links')
        .select('indicator_id, feature_id, features(id, name)')
        .in('indicator_id', indIds);

      // 3. Get custom RAG bands
      const { data: customBands } = await supabase
        .from('kpi_rag_bands' as any)
        .select('*')
        .in('indicator_id', indIds)
        .order('sort_order');

      // 4. Get existing scores for period
      const { data: existingScores } = await supabase
        .from('csm_feature_scores' as any)
        .select('*')
        .in('indicator_id', indIds)
        .eq('period', period);

      // Build lookup maps
      const krMap = new Map(krs.map(k => [k.id, k]));
      const foMap = new Map(fos.map(f => [f.id, f]));
      const featuresByIndicator: Record<string, { id: string; name: string }[]> = {};

      (links || []).forEach((link: any) => {
        const indId = link.indicator_id;
        if (!featuresByIndicator[indId]) featuresByIndicator[indId] = [];
        if (link.features) {
          featuresByIndicator[indId].push({ id: link.features.id, name: link.features.name });
        }
      });

      // Build bands map
      const bandsMap: Record<string, RAGBand[]> = {};
      (customBands || []).forEach((b: any) => {
        if (!bandsMap[b.indicator_id]) bandsMap[b.indicator_id] = [];
        bandsMap[b.indicator_id].push({
          band_label: b.band_label,
          rag_color: b.rag_color,
          rag_numeric: Number(b.rag_numeric),
          sort_order: b.sort_order,
        });
      });
      setBandsByIndicator(bandsMap);

      // Build scores map
      const scoreMap: ScoreMap = {};
      (existingScores || []).forEach((s: any) => {
        scoreMap[cellKey(s.indicator_id, s.feature_id)] = {
          score_band: s.score_band,
          rag_value: Number(s.rag_value),
        };
      });
      setScores({ ...scoreMap });
      setOriginalScores({ ...scoreMap });

      // Build matrix indicators
      const result: MatrixIndicator[] = indicators.map(ind => {
        const kr = krMap.get(ind.key_result_id!);
        const fo = kr ? foMap.get(kr.functional_objective_id!) : undefined;
        return {
          id: ind.id,
          name: ind.name,
          current_value: ind.current_value != null ? Number(ind.current_value) : null,
          target_value: ind.target_value != null ? Number(ind.target_value) : null,
          kr_name: kr?.name || '',
          fo_name: fo?.name || '',
          features: featuresByIndicator[ind.id] || [],
        };
      });

      // Only show indicators that have linked features
      setMatrixIndicators(result.filter(i => i.features.length > 0));
    } catch (err) {
      console.error('Error loading matrix data:', err);
      toast.error('Failed to load matrix data');
    } finally {
      setLoading(false);
    }
  }, [departmentId, period, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getBands = (indicatorId: string): RAGBand[] => {
    return bandsByIndicator[indicatorId]?.length ? bandsByIndicator[indicatorId] : DEFAULT_BANDS;
  };

  const handleCellChange = (indicatorId: string, featureId: string, bandLabel: string) => {
    const bands = getBands(indicatorId);
    const band = bands.find(b => b.band_label === bandLabel);
    if (!band) return;

    setScores(prev => ({
      ...prev,
      [cellKey(indicatorId, featureId)]: {
        score_band: bandLabel,
        rag_value: band.rag_numeric,
      },
    }));
  };

  const getAggregate = (indicator: MatrixIndicator): { percentage: number; rag: string } | null => {
    const featureIds = indicator.features.map(f => f.id);
    const scored = featureIds.filter(fid => scores[cellKey(indicator.id, fid)]);
    if (scored.length === 0) return null;

    const total = scored.reduce((sum, fid) => sum + (scores[cellKey(indicator.id, fid)]?.rag_value ?? 0), 0);
    const pct = (total / featureIds.length) * 100;
    return { percentage: Math.round(pct), rag: percentToRAG(pct) };
  };

  const hasChanges = useMemo(() => {
    const keys = new Set([...Object.keys(scores), ...Object.keys(originalScores)]);
    for (const k of keys) {
      const a = scores[k];
      const b = originalScores[k];
      if (!a && !b) continue;
      if (!a || !b) return true;
      if (a.score_band !== b.score_band) return true;
    }
    return false;
  }, [scores, originalScores]);

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Collect all cells to upsert
      const upserts: any[] = [];
      for (const ind of matrixIndicators) {
        for (const feat of ind.features) {
          const key = cellKey(ind.id, feat.id);
          const score = scores[key];
          if (score) {
            upserts.push({
              indicator_id: ind.id,
              feature_id: feat.id,
              score_band: score.score_band,
              rag_value: score.rag_value,
              period,
              created_by: user.id,
            });
          }
        }
      }

      if (upserts.length > 0) {
        const { error } = await supabase
          .from('csm_feature_scores' as any)
          .upsert(upserts, { onConflict: 'indicator_id,feature_id,period' });

        if (error) throw error;
      }

      // Update each indicator's current_value with aggregate
      for (const ind of matrixIndicators) {
        const agg = getAggregate(ind);
        if (agg === null) continue;

        // Update indicator
        await supabase
          .from('indicators')
          .update({
            current_value: agg.percentage,
            target_value: 100, // Matrix-based indicators use 100 as target
            rag_status: agg.rag,
          })
          .eq('id', ind.id);

        // Create history entry
        await supabase
          .from('indicator_history')
          .insert({
            indicator_id: ind.id,
            value: agg.percentage,
            period,
            notes: 'Updated via Feature Matrix',
            created_by: user.id,
          });

        // Log activity
        await logActivity({
          action: 'update',
          entityType: 'indicator',
          entityId: ind.id,
          entityName: ind.name,
          oldValue: { current_value: ind.current_value },
          newValue: { current_value: agg.percentage },
          metadata: {
            department_id: departmentId,
            period,
            source: 'feature_matrix',
            aggregate_percentage: agg.percentage,
            rag_status: agg.rag,
          },
        });
      }

      toast.success(`Saved ${upserts.length} score(s) and updated indicator values`);
      setOriginalScores({ ...scores });
      fetchData();
    } catch (err) {
      console.error('Error saving matrix:', err);
      toast.error('Failed to save matrix data');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (matrixIndicators.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">No Feature-Linked Indicators</h3>
          <p className="text-muted-foreground text-sm">
            This department has no indicators linked to features via the indicator-feature mapping.
            Link features to indicators in the admin panel to enable the matrix view.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {/* Save bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {matrixIndicators.length} KPI{matrixIndicators.length !== 1 ? 's' : ''} × {allFeatures.length} Feature{allFeatures.length !== 1 ? 's' : ''}
          </p>
          <Button
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All
          </Button>
        </div>

        {/* Matrix table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-semibold min-w-[220px]">
                      KPI
                    </th>
                    {allFeatures.map(f => (
                      <th key={f.id} className="px-3 py-3 text-center font-medium min-w-[130px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block max-w-[120px]">{f.name}</span>
                          </TooltipTrigger>
                          <TooltipContent>{f.name}</TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-semibold min-w-[100px] bg-muted/30">
                      Aggregate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrixIndicators.map(ind => {
                    const linkedFeatureIds = new Set(ind.features.map(f => f.id));
                    const agg = getAggregate(ind);

                    return (
                      <tr key={ind.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                          <div>
                            <span>{ind.name}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ind.fo_name} → {ind.kr_name}
                            </p>
                          </div>
                        </td>

                        {allFeatures.map(f => {
                          const isLinked = linkedFeatureIds.has(f.id);
                          const key = cellKey(ind.id, f.id);
                          const currentScore = scores[key];
                          const bands = getBands(ind.id);
                          const selectedBand = currentScore
                            ? bands.find(b => b.band_label === currentScore.score_band)
                            : undefined;

                          if (!isLinked) {
                            return (
                              <td key={f.id} className="px-3 py-3 text-center">
                                <span className="text-muted-foreground/30">—</span>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={f.id}
                              className={cn(
                                'px-2 py-2 text-center border',
                                selectedBand ? RAG_BG[selectedBand.rag_color] : 'border-transparent'
                              )}
                            >
                              <Select
                                value={currentScore?.score_band || ''}
                                onValueChange={(val) => handleCellChange(ind.id, f.id, val)}
                              >
                                <SelectTrigger className="h-8 text-xs w-full border-0 bg-transparent shadow-none focus:ring-0">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {bands.map(b => (
                                    <SelectItem key={b.band_label} value={b.band_label}>
                                      <span className="flex items-center gap-2">
                                        <span
                                          className={cn(
                                            'h-2 w-2 rounded-full inline-block',
                                            b.rag_color === 'green' && 'bg-rag-green',
                                            b.rag_color === 'amber' && 'bg-rag-amber',
                                            b.rag_color === 'red' && 'bg-rag-red'
                                          )}
                                        />
                                        {b.band_label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          );
                        })}

                        {/* Aggregate column */}
                        <td className="px-4 py-3 text-center bg-muted/10">
                          {agg ? (
                            <div className="flex items-center justify-center gap-2">
                              <Badge className={cn(RAG_BADGE[agg.rag], 'text-xs')}>
                                {agg.percentage}%
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Legend:</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rag-green" /> Green (1.0)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rag-amber" /> Amber (0.5)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rag-red" /> Red (0.0)
          </span>
          <span className="ml-2">Aggregate = (Sum of scores / Total features) × 100</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
