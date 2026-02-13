import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Loader2, Info, ChevronDown, ChevronRight, Search, Download, Upload, CopyCheck, X, ClipboardCheck, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CustomerAttachments } from './CustomerAttachments';
import { generateMatrixTemplate, parseMatrixExcel } from '@/lib/matrixExcelHelper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============= Types =============

interface CSMDataEntryMatrixProps {
  departmentId: string;
  period: string;
}

interface IndicatorInfo {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  kr_name: string;
  fo_name: string;
}

interface KPIBand {
  band_label: string;
  rag_color: string;
  rag_numeric: number;
  sort_order: number;
}

interface CustomerSection {
  id: string;
  name: string;
  features: { id: string; name: string; description?: string | null; category?: string | null }[];
  indicators: IndicatorInfo[];
  indicatorFeatureMap: Record<string, Set<string>>;
}

// ============= Constants & Helpers =============

// Fallback bands when KPI has no specific bands defined
const DEFAULT_BANDS: KPIBand[] = [
  { band_label: 'Green', rag_color: 'green', rag_numeric: 1, sort_order: 1 },
  { band_label: 'Amber', rag_color: 'amber', rag_numeric: 0.5, sort_order: 2 },
  { band_label: 'Red', rag_color: 'red', rag_numeric: 0, sort_order: 3 },
];

const RAG_DOT_CLASS: Record<string, string> = {
  green: 'bg-rag-green',
  amber: 'bg-rag-amber',
  red: 'bg-rag-red',
};

function cellKey(indicatorId: string, customerId: string, featureId: string) {
  return `${indicatorId}::${customerId}::${featureId}`;
}

function percentToRAG(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 76) return 'green';
  if (pct >= 51) return 'amber';
  return 'red';
}

function weightToRAGColor(val: number): string {
  if (val >= 1) return 'green';
  if (val >= 0.5) return 'amber';
  return 'red';
}

const RAG_CELL_BG: Record<string, string> = {
  green: 'bg-rag-green/20 border-rag-green/40',
  amber: 'bg-rag-amber/20 border-rag-amber/40',
  red: 'bg-rag-red/20 border-rag-red/40',
};

const RAG_BADGE_STYLES: Record<string, string> = {
  green: 'bg-rag-green text-rag-green-foreground',
  amber: 'bg-rag-amber text-rag-amber-foreground',
  red: 'bg-rag-red text-rag-red-foreground',
  gray: 'bg-muted text-muted-foreground',
};

type ScoreMap = Record<string, number | null>;
type BandMap = Record<string, KPIBand[]>; // indicator_id -> bands

export function CSMDataEntryMatrix({ departmentId, period }: CSMDataEntryMatrixProps) {
  const { user, isAdmin, isDepartmentHead } = useAuth();
  const { logActivity } = useActivityLog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState<ScoreMap>({});
  const [originalScores, setOriginalScores] = useState<ScoreMap>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [skipReasonDialogOpen, setSkipReasonDialogOpen] = useState(false);
  const [skipReasons, setSkipReasons] = useState<Record<string, string>>({});
  const [pendingSaveAction, setPendingSaveAction] = useState<'update' | 'no_update' | null>(null);
  const scoresInitializedRef = useRef(false);

  const { data: matrixData, isLoading: loading } = useQuery({
    queryKey: ['csm-matrix', departmentId, period, user?.id, isAdmin],
    queryFn: async () => {
      if (!departmentId || !user) return null;

      let csmId: string | null = null;
      if (!isAdmin && !isDepartmentHead) {
        const { data: csmRow } = await supabase
          .from('csms')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (csmRow) csmId = csmRow.id;
      }

      const { data: fos } = await supabase
        .from('functional_objectives')
        .select('id, name')
        .eq('department_id', departmentId);
      if (!fos?.length) return { sections: [], indicators: [], bands: {}, scores: {} };

      const { data: krs } = await supabase
        .from('key_results')
        .select('id, name, functional_objective_id')
        .in('functional_objective_id', fos.map(f => f.id));
      if (!krs?.length) return { sections: [], indicators: [], bands: {}, scores: {} };

      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, name, current_value, target_value, key_result_id')
        .in('key_result_id', krs.map(k => k.id));
      if (!indicators?.length) return { sections: [], indicators: [], bands: {}, scores: {} };

      const indIds = indicators.map(i => i.id);
      const krMap = new Map(krs.map(k => [k.id, k]));
      const foMap = new Map(fos.map(f => [f.id, f]));

      const indicatorInfos: IndicatorInfo[] = indicators.map(ind => {
        const kr = krMap.get(ind.key_result_id!);
        const fo = kr ? foMap.get(kr.functional_objective_id!) : undefined;
        return {
          id: ind.id,
          name: ind.name,
          current_value: ind.current_value != null ? Number(ind.current_value) : null,
          target_value: ind.target_value != null ? Number(ind.target_value) : null,
          kr_name: kr?.name || '',
          fo_name: fo?.name || '',
        };
      });

      const { data: bandsData } = await supabase
        .from('kpi_rag_bands')
        .select('indicator_id, band_label, rag_color, rag_numeric, sort_order')
        .in('indicator_id', indIds)
        .order('sort_order');

      const bandsMap: BandMap = {};
      (bandsData || []).forEach((b: any) => {
        if (!bandsMap[b.indicator_id]) bandsMap[b.indicator_id] = [];
        bandsMap[b.indicator_id].push({
          band_label: b.band_label,
          rag_color: b.rag_color,
          rag_numeric: Number(b.rag_numeric),
          sort_order: b.sort_order,
        });
      });

      const { data: featureLinks } = await supabase
        .from('indicator_feature_links')
        .select('indicator_id, feature_id, features(id, name, description, category)')
        .in('indicator_id', indIds);

      const indFeatureMap: Record<string, Set<string>> = {};
      const featureNameMap = new Map<string, string>();
      const featureMetaMap = new Map<string, { description?: string | null; category?: string | null }>();
      (featureLinks || []).forEach((fl: any) => {
        if (!fl.features) return;
        if (!indFeatureMap[fl.indicator_id]) indFeatureMap[fl.indicator_id] = new Set();
        indFeatureMap[fl.indicator_id].add(fl.features.id);
        featureNameMap.set(fl.features.id, fl.features.name);
        featureMetaMap.set(fl.features.id, { description: fl.features.description, category: fl.features.category });
      });

      const allLinkedFeatureIds = new Set<string>();
      Object.values(indFeatureMap).forEach(s => s.forEach(id => allLinkedFeatureIds.add(id)));
      if (allLinkedFeatureIds.size === 0) return { sections: [], indicators: indicatorInfos, bands: bandsMap, scores: {} };

      const { data: customerFeatures } = await supabase
        .from('customer_features')
        .select('customer_id, feature_id, customers(id, name, csm_id)')
        .in('feature_id', Array.from(allLinkedFeatureIds));

      const custFeatureMap = new Map<string, Set<string>>();
      const custNameMap = new Map<string, string>();
      (customerFeatures || []).forEach((cf: any) => {
        if (!cf.customers) return;
        if (csmId && cf.customers.csm_id !== csmId) return;
        custNameMap.set(cf.customer_id, cf.customers.name);
        if (!custFeatureMap.has(cf.customer_id)) custFeatureMap.set(cf.customer_id, new Set());
        custFeatureMap.get(cf.customer_id)!.add(cf.feature_id);
      });

      const { data: existingScores } = await supabase
        .from('csm_customer_feature_scores' as any)
        .select('*')
        .in('indicator_id', indIds)
        .eq('period', period);

      const sections: CustomerSection[] = [];
      for (const [custId, custFeatures] of custFeatureMap) {
        const relevantFeatureIds = [...custFeatures].filter(fid => allLinkedFeatureIds.has(fid));
        if (relevantFeatureIds.length === 0) continue;

        const features = relevantFeatureIds
          .map(fid => {
            const meta = featureMetaMap.get(fid);
            return { id: fid, name: featureNameMap.get(fid) || 'Unknown', description: meta?.description, category: meta?.category };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        const relevantIndicators: IndicatorInfo[] = [];
        const indicatorFeatureMapForCust: Record<string, Set<string>> = {};
        for (const ind of indicatorInfos) {
          const indFeats = indFeatureMap[ind.id];
          if (!indFeats) continue;
          const intersection = new Set([...indFeats].filter(fid => custFeatures.has(fid)));
          if (intersection.size > 0) {
            relevantIndicators.push(ind);
            indicatorFeatureMapForCust[ind.id] = intersection;
          }
        }

        if (relevantIndicators.length === 0) continue;

        sections.push({
          id: custId,
          name: custNameMap.get(custId) || 'Unknown',
          features,
          indicators: relevantIndicators,
          indicatorFeatureMap: indicatorFeatureMapForCust,
        });
      }

      sections.sort((a, b) => a.name.localeCompare(b.name));

      const scoreMap: ScoreMap = {};
      (existingScores || []).forEach((s: any) => {
        scoreMap[cellKey(s.indicator_id, s.customer_id, s.feature_id)] = s.value != null ? Number(s.value) : null;
      });

      return { sections, indicators: indicatorInfos, bands: bandsMap, scores: scoreMap };
    },
    enabled: !!departmentId && !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const customerSections = matrixData?.sections ?? [];
  const allIndicators = matrixData?.indicators ?? [];
  const kpiBands = matrixData?.bands ?? {};

  // Initialize scores from query data only once per query result
  useEffect(() => {
    if (matrixData?.scores && !scoresInitializedRef.current) {
      setScores({ ...matrixData.scores });
      setOriginalScores({ ...matrixData.scores });
      scoresInitializedRef.current = true;
    }
  }, [matrixData?.scores]);

  // Reset initialization flag when department/period changes
  useEffect(() => {
    scoresInitializedRef.current = false;
  }, [departmentId, period]);

  const handleCellChange = (indicatorId: string, customerId: string, featureId: string, bandValue: string) => {
    const key = cellKey(indicatorId, customerId, featureId);
    if (bandValue === '' || bandValue === 'unset') {
      setScores(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    // bandValue is the rag_numeric as string
    const weight = parseFloat(bandValue);
    if (!isNaN(weight)) {
      setScores(prev => ({ ...prev, [key]: weight }));
    }
  };

  const clearRow = (custId: string, featureId: string, indicators: IndicatorInfo[], indFeatMap: Record<string, Set<string>>) => {
    setScores(prev => {
      const next = { ...prev };
      for (const ind of indicators) {
        if (indFeatMap[ind.id]?.has(featureId)) {
          delete next[cellKey(ind.id, custId, featureId)];
        }
      }
      return next;
    });
  };

  const clearColumn = (custId: string, indId: string, features: { id: string }[], indFeatMap: Record<string, Set<string>>) => {
    setScores(prev => {
      const next = { ...prev };
      for (const feat of features) {
        if (indFeatMap[indId]?.has(feat.id)) {
          delete next[cellKey(indId, custId, feat.id)];
        }
      }
      return next;
    });
  };

  const applyToRow = (custId: string, featureId: string, value: number, indicators: IndicatorInfo[], indFeatMap: Record<string, Set<string>>) => {
    setScores(prev => {
      const next = { ...prev };
      for (const ind of indicators) {
        if (indFeatMap[ind.id]?.has(featureId)) {
          next[cellKey(ind.id, custId, featureId)] = value;
        }
      }
      return next;
    });
  };

  const applyToColumn = (custId: string, indId: string, value: number, features: { id: string }[], indFeatMap: Record<string, Set<string>>) => {
    setScores(prev => {
      const next = { ...prev };
      for (const feat of features) {
        if (indFeatMap[indId]?.has(feat.id)) {
          next[cellKey(indId, custId, feat.id)] = value;
        }
      }
      return next;
    });
  };

  // Averages: AVG of vector weights × 100
  const getCustomerOverallAvg = (section: CustomerSection): number | null => {
    const allVals: number[] = [];
    for (const ind of section.indicators) {
      const feats = section.indicatorFeatureMap[ind.id];
      if (!feats) continue;
      for (const fid of feats) {
        const v = scores[cellKey(ind.id, section.id, fid)];
        if (v != null) allVals.push(v);
      }
    }
    if (allVals.length === 0) return null;
    return (allVals.reduce((a, b) => a + b, 0) / allVals.length) * 100;
  };

  const getFeatureRowAvg = (custId: string, featureId: string, indicators: IndicatorInfo[], indFeatMap: Record<string, Set<string>>): number | null => {
    const values: number[] = [];
    for (const ind of indicators) {
      if (!indFeatMap[ind.id]?.has(featureId)) continue;
      const v = scores[cellKey(ind.id, custId, featureId)];
      if (v != null) values.push(v);
    }
    if (values.length === 0) return null;
    return (values.reduce((a, b) => a + b, 0) / values.length) * 100;
  };

  const hasChanges = useMemo(() => {
    const allKeys = new Set([...Object.keys(scores), ...Object.keys(originalScores)]);
    for (const k of allKeys) {
      if (scores[k] !== originalScores[k]) return true;
    }
    return false;
  }, [scores, originalScores]);

  // Detect customers with zero scores filled
  const getEmptyCustomers = useCallback((): CustomerSection[] => {
    return customerSections.filter(section => {
      const hasAnyScore = section.indicators.some(ind => {
        const feats = section.indicatorFeatureMap[ind.id];
        if (!feats) return false;
        return [...feats].some(fid => scores[cellKey(ind.id, section.id, fid)] != null);
      });
      return !hasAnyScore;
    });
  }, [customerSections, scores]);

  const initiateCheckIn = (action: 'update' | 'no_update') => {
    const empty = getEmptyCustomers();
    if (empty.length > 0) {
      // Initialize reasons for empty customers
      setSkipReasons(prev => {
        const next = { ...prev };
        empty.forEach(c => { if (!next[c.id]) next[c.id] = ''; });
        return next;
      });
      setPendingSaveAction(action);
      setSkipReasonDialogOpen(true);
    } else {
      if (action === 'update') doSaveAll();
      else doNoUpdateCheckIn();
    }
  };

  const confirmSkipAndSave = () => {
    const empty = getEmptyCustomers();
    const missingReasons = empty.filter(c => !skipReasons[c.id]?.trim());
    if (missingReasons.length > 0) {
      toast.error(`Please provide a reason for all customers without scores`);
      return;
    }
    setSkipReasonDialogOpen(false);
    if (pendingSaveAction === 'update') doSaveAll();
    else doNoUpdateCheckIn();
  };

  const doSaveAll = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const upserts: any[] = [];
      const deletes: { indicator_id: string; customer_id: string; feature_id: string }[] = [];
      
      for (const section of customerSections) {
        for (const feat of section.features) {
          for (const ind of section.indicators) {
            const feats = section.indicatorFeatureMap[ind.id];
            if (!feats?.has(feat.id)) continue;
            const key = cellKey(ind.id, section.id, feat.id);
            const val = scores[key];
            const origVal = originalScores[key];
            
            if (val != null) {
              upserts.push({
                indicator_id: ind.id,
                customer_id: section.id,
                feature_id: feat.id,
                value: val,
                period,
                created_by: user.id,
              });
            } else if (origVal != null && val === undefined) {
              // Was set before, now cleared → delete from DB
              deletes.push({ indicator_id: ind.id, customer_id: section.id, feature_id: feat.id });
            }
          }
        }
      }

      // Delete cleared scores
      for (const del of deletes) {
        await supabase
          .from('csm_customer_feature_scores' as any)
          .delete()
          .eq('indicator_id', del.indicator_id)
          .eq('customer_id', del.customer_id)
          .eq('feature_id', del.feature_id)
          .eq('period', period);
      }

      if (upserts.length > 0) {
        for (let i = 0; i < upserts.length; i += 500) {
          const chunk = upserts.slice(i, i + 500);
          const { error } = await supabase
            .from('csm_customer_feature_scores' as any)
            .upsert(chunk, { onConflict: 'indicator_id,customer_id,feature_id,period' });
          if (error) throw error;
        }
      }

      // Aggregate: AVG of vector weights × 100 = percentage
      const indicatorAggregates = new Map<string, number[]>();
      for (const section of customerSections) {
        for (const ind of section.indicators) {
          const feats = section.indicatorFeatureMap[ind.id];
          if (!feats) continue;
          for (const fid of feats) {
            const v = scores[cellKey(ind.id, section.id, fid)];
            if (v != null) {
              if (!indicatorAggregates.has(ind.id)) indicatorAggregates.set(ind.id, []);
              indicatorAggregates.get(ind.id)!.push(v);
            }
          }
        }
      }

      for (const ind of allIndicators) {
        const vals = indicatorAggregates.get(ind.id);
        if (!vals?.length) continue;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const aggPercentage = Math.round(avg * 100 * 100) / 100;
        const ragStatus = percentToRAG(aggPercentage);

        await supabase
          .from('indicators')
          .update({ current_value: aggPercentage, target_value: 100, rag_status: ragStatus })
          .eq('id', ind.id);

        await supabase
          .from('indicator_history')
          .insert({
            indicator_id: ind.id,
            value: aggPercentage,
            period,
            notes: 'Updated via Customer x Feature Matrix (vector weights)',
            created_by: user.id,
          });

        await logActivity({
          action: 'update',
          entityType: 'indicator',
          entityId: ind.id,
          entityName: ind.name,
          oldValue: { current_value: ind.current_value },
          newValue: { current_value: aggPercentage },
          metadata: {
            department_id: departmentId,
            period,
            source: 'customer_feature_matrix',
            aggregate_percentage: aggPercentage,
            rag_status: ragStatus,
          },
        });
      }

      // Log skip reasons for empty customers
      const emptyCustomers = getEmptyCustomers();
      for (const ec of emptyCustomers) {
        const reason = skipReasons[ec.id]?.trim();
        if (reason) {
          await logActivity({
            action: 'update',
            entityType: 'department',
            entityId: departmentId,
            entityName: `Skip reason: ${ec.name}`,
            metadata: {
              department_id: departmentId,
              period,
              source: 'customer_feature_matrix',
              skip_reason: reason,
            },
          });
        }
      }

      toast.success(`Saved ${upserts.length} score(s) and updated KPI values`);
      setOriginalScores({ ...scores });
      setSkipReasons({});
      queryClient.invalidateQueries({ queryKey: ['csm-matrix', departmentId, period] });
    } catch (err) {
      console.error('Error saving matrix:', err);
      toast.error('Failed to save matrix data');
    } finally {
      setSaving(false);
    }
  };

  const doNoUpdateCheckIn = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Re-upsert all existing scores for the period so compliance system sees entries
      const existingUpserts: any[] = [];
      for (const section of customerSections) {
        for (const ind of section.indicators) {
          const feats = section.indicatorFeatureMap[ind.id];
          if (!feats) continue;
          for (const fid of feats) {
            const val = scores[cellKey(ind.id, section.id, fid)];
            if (val != null) {
              existingUpserts.push({
                indicator_id: ind.id,
                customer_id: section.id,
                feature_id: fid,
                value: val,
                period,
                created_by: user.id,
              });
            }
          }
        }
      }

      // Upsert existing scores to touch updated_at timestamps
      if (existingUpserts.length > 0) {
        for (let i = 0; i < existingUpserts.length; i += 500) {
          const chunk = existingUpserts.slice(i, i + 500);
          await supabase
            .from('csm_customer_feature_scores' as any)
            .upsert(chunk, { onConflict: 'indicator_id,customer_id,feature_id,period' });
        }
      }

      // Log the no-update check-in
      await logActivity({
        action: 'update',
        entityType: 'department',
        entityId: departmentId,
        entityName: `No-update check-in`,
        metadata: {
          department_id: departmentId,
          period,
          source: 'customer_feature_matrix',
          check_in_type: 'no_update',
          existing_scores_touched: existingUpserts.length,
        },
      });

      // Log skip reasons for empty customers
      const emptyCustomers = getEmptyCustomers();
      for (const ec of emptyCustomers) {
        const reason = skipReasons[ec.id]?.trim();
        if (reason) {
          await logActivity({
            action: 'update',
            entityType: 'department',
            entityId: departmentId,
            entityName: `Skip reason: ${ec.name}`,
            metadata: {
              department_id: departmentId,
              period,
              source: 'customer_feature_matrix',
              skip_reason: reason,
            },
          });
        }
      }

      toast.success('Checked in — no updates for this period.');
      setSkipReasons({});
    } catch (err) {
      console.error('Error during no-update check-in:', err);
      toast.error('Failed to check in');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await generateMatrixTemplate(customerSections, period, scores, kpiBands);
      toast.success('Template downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate template');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseMatrixExcel(file, customerSections, kpiBands);
      if (!result || result.count === 0) {
        toast.warning('No valid scores found in uploaded file');
        return;
      }
      setScores(prev => ({ ...prev, ...result.scores }));
      toast.success(`Imported ${result.count} score(s) from Excel`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse uploaded file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customerSections;
    const lower = searchTerm.toLowerCase();
    return customerSections.filter(c => c.name.toLowerCase().includes(lower));
  }, [customerSections, searchTerm]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (customerSections.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">No Feature-Linked Indicators</h3>
          <p className="text-muted-foreground text-sm">
            This department has no indicators linked to features via the indicator-feature mapping,
            or no customers are mapped to those features. Link features to indicators and customers in the admin panel.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
          </p>
          {customerSections.length > 5 && (
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Template
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download Excel template with current data</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload filled Excel to populate scores</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="destructive" onClick={() => initiateCheckIn('no_update')} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            No Update & Check In
          </Button>
          <Button onClick={() => initiateCheckIn('update')} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Update & Check In
          </Button>
        </div>
      </div>

      {/* Customer sections */}
      {filteredCustomers.map(section => (
        <CustomerSectionCard
          key={section.id}
          section={section}
          isOpen={openSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          scores={scores}
          kpiBands={kpiBands}
          onCellChange={handleCellChange}
          applyToRow={applyToRow}
          applyToColumn={applyToColumn}
          clearRow={clearRow}
          clearColumn={clearColumn}
          getFeatureRowAvg={getFeatureRowAvg}
          getCustomerOverallAvg={getCustomerOverallAvg}
          departmentId={departmentId}
          period={period}
        />
      ))}

      {/* Skip Reason Dialog */}
      <Dialog open={skipReasonDialogOpen} onOpenChange={setSkipReasonDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rag-amber" />
              Reason Required for Empty Customers
            </DialogTitle>
            <DialogDescription>
              The following customers have no scores entered. Please provide a reason for each before checking in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {getEmptyCustomers().map(c => (
              <div key={c.id} className="space-y-1.5">
                <label className="text-sm font-medium">{c.name}</label>
                <Textarea
                  placeholder="e.g. Customer on hold, No meeting this week, Data not available..."
                  value={skipReasons[c.id] || ''}
                  onChange={e => setSkipReasons(prev => ({ ...prev, [c.id]: e.target.value }))}
                  className="min-h-[60px] text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipReasonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSkipAndSave}>
              Confirm & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= Band Dropdown Cell Component =============

function BandDropdown({
  value,
  bands,
  onChange,
  compact = false,
}: {
  value: number | null;
  bands: KPIBand[];
  onChange: (weight: string) => void;
  compact?: boolean;
}) {
  // Find the matching band for the current value
  const currentBand = value !== null && value !== undefined
    ? bands.find(b => b.rag_numeric === value)
    : undefined;

  return (
    <Select
      value={currentBand ? String(currentBand.rag_numeric) : 'unset'}
      onValueChange={onChange}
    >
      <SelectTrigger className={cn(
        'border-0 bg-transparent shadow-none focus:ring-1 text-xs mx-auto',
        compact ? 'h-6 w-full max-w-[120px] px-1' : 'h-7 w-full max-w-[140px] px-1.5',
      )}>
        <SelectValue placeholder="—">
          {currentBand ? (
            <span className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full shrink-0', RAG_DOT_CLASS[currentBand.rag_color] || 'bg-muted')} />
              <span className="truncate">{currentBand.band_label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover">
        <SelectItem value="unset">
          <span className="text-muted-foreground">Clear</span>
        </SelectItem>
        {bands.map(b => (
          <SelectItem key={`${b.rag_color}-${b.sort_order}`} value={String(b.rag_numeric)}>
            <span className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', RAG_DOT_CLASS[b.rag_color] || 'bg-muted')} />
              {b.band_label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============= Customer Section Card =============

interface CustomerSectionCardProps {
  section: CustomerSection;
  isOpen: boolean;
  onToggle: () => void;
  scores: ScoreMap;
  kpiBands: BandMap;
  onCellChange: (indicatorId: string, customerId: string, featureId: string, value: string) => void;
  applyToRow: (custId: string, featureId: string, value: number, indicators: IndicatorInfo[], indFeatMap: Record<string, Set<string>>) => void;
  applyToColumn: (custId: string, indId: string, value: number, features: { id: string }[], indFeatMap: Record<string, Set<string>>) => void;
  clearRow: (custId: string, featureId: string, indicators: IndicatorInfo[], indFeatMap: Record<string, Set<string>>) => void;
  clearColumn: (custId: string, indId: string, features: { id: string }[], indFeatMap: Record<string, Set<string>>) => void;
  getFeatureRowAvg: (custId: string, featureId: string, indicators: IndicatorInfo[], indFeatMap: Record<string, Set<string>>) => number | null;
  getCustomerOverallAvg: (section: CustomerSection) => number | null;
  departmentId: string;
  period: string;
}

function CustomerSectionCard({
  section, isOpen, onToggle, scores, kpiBands, onCellChange,
  applyToRow, applyToColumn, clearRow, clearColumn, getFeatureRowAvg, getCustomerOverallAvg,
  departmentId, period,
}: CustomerSectionCardProps) {
  const custAvg = getCustomerOverallAvg(section);
  const custRag = custAvg != null ? percentToRAG(Math.round(custAvg)) : null;

  const [applyRowBand, setApplyRowBand] = useState<Record<string, string>>({});
  const [applyColBand, setApplyColBand] = useState<Record<string, string>>({});

  const getBandsForIndicator = (indId: string): KPIBand[] => {
    return kpiBands[indId] || DEFAULT_BANDS;
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div>
                  <CardTitle className="text-base">{section.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {section.features.length} feature{section.features.length !== 1 ? 's' : ''} × {section.indicators.length} KPI{section.indicators.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {custAvg != null && custRag ? (
                  <Badge className={cn(RAG_BADGE_STYLES[custRag], 'text-xs')}>
                    {Math.round(custAvg)}%
                  </Badge>
                ) : (
                  <Badge className={RAG_BADGE_STYLES.gray}>No data</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold min-w-[160px] border-r">
                      Feature
                    </th>
                    {section.indicators.map(ind => (
                      <th key={ind.id} className="px-2 py-2 text-center font-medium min-w-[140px] border-r" title={`${ind.fo_name} → ${ind.kr_name}`}>
                        <span className="block mx-auto text-xs whitespace-normal leading-tight">{ind.name}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold min-w-[70px] bg-muted/30">
                      Avg
                    </th>
                    <th className="px-2 py-2 text-center font-medium min-w-[150px] bg-muted/30 border-l">
                      <span className="text-xs text-muted-foreground">Apply to Row</span>
                    </th>
                  </tr>
                  <tr className="bg-muted/20 border-t">
                    <td className="sticky left-0 z-10 bg-muted/20 px-3 py-1 text-xs text-muted-foreground font-medium border-r">
                      Apply to Column ↓
                    </td>
                    {section.indicators.map(ind => {
                      const bands = getBandsForIndicator(ind.id);
                      return (
                        <td key={ind.id} className="px-1 py-1 text-center border-r">
                          <div className="flex items-center gap-0.5 justify-center">
                            <Select
                              value={applyColBand[ind.id] || 'unset'}
                              onValueChange={(val) => setApplyColBand(prev => ({ ...prev, [ind.id]: val === 'unset' ? '' : val }))}
                            >
                              <SelectTrigger className="h-6 w-full max-w-[100px] px-1 text-xs border-muted">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                <SelectItem value="unset"><span className="text-muted-foreground">—</span></SelectItem>
                                {bands.map(b => (
                                  <SelectItem key={`${b.rag_color}-${b.sort_order}`} value={String(b.rag_numeric)}>
                                    <span className="flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', RAG_DOT_CLASS[b.rag_color] || 'bg-muted')} />{b.band_label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    disabled={!applyColBand[ind.id]}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const weight = parseFloat(applyColBand[ind.id]);
                                      if (isNaN(weight)) return;
                                      applyToColumn(section.id, ind.id, weight, section.features, section.indicatorFeatureMap);
                                      const band = bands.find(b => b.rag_numeric === weight);
                                      toast.success(`Applied "${band?.band_label || weight}" to all ${ind.name} cells`);
                                    }}
                                  >
                                    <CopyCheck className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Apply selected band to all customers for this KPI</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                              title="Clear column"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearColumn(section.id, ind.id, section.features, section.indicatorFeatureMap);
                                toast.success(`Cleared all ${ind.name} cells`);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      );
                    })}
                    <td className="bg-muted/10" />
                    <td className="bg-muted/10 border-l" />
                  </tr>
                </thead>
                <tbody>
                  {section.features.map(feat => {
                    const rowAvg = getFeatureRowAvg(section.id, feat.id, section.indicators, section.indicatorFeatureMap);
                    const rowRag = rowAvg != null ? percentToRAG(Math.round(rowAvg)) : null;

                    return (
                      <tr key={feat.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium text-xs border-r">
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <span className="cursor-help border-b border-dotted border-muted-foreground/40">
                                {feat.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-semibold text-sm">{feat.name}</p>
                              {feat.category && <p className="text-xs text-muted-foreground mt-0.5">Category: {feat.category}</p>}
                              <p className="text-xs mt-1">{feat.description || 'No description available'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        {section.indicators.map(ind => {
                          const canEdit = section.indicatorFeatureMap[ind.id]?.has(feat.id) ?? false;
                          const key = cellKey(ind.id, section.id, feat.id);
                          const val = scores[key];

                          if (!canEdit) {
                            return (
                              <td key={ind.id} className="px-2 py-1.5 text-center border-r">
                                <span className="text-muted-foreground/30 text-xs">—</span>
                              </td>
                            );
                          }

                          const ragColor = val != null ? weightToRAGColor(val) : '';
                          const cellBg = ragColor ? RAG_CELL_BG[ragColor] : '';

                          return (
                            <td key={ind.id} className={cn('px-1 py-1 text-center border-r', cellBg)}>
                              <BandDropdown
                                value={val ?? null}
                                bands={getBandsForIndicator(ind.id)}
                                onChange={(b) => onCellChange(ind.id, section.id, feat.id, b)}
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-center bg-muted/10">
                          {rowAvg != null && rowRag ? (
                            <Badge className={cn(RAG_BADGE_STYLES[rowRag], 'text-[10px] px-1.5 py-0.5')}>
                              {Math.round(rowAvg)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-1 py-1 text-center border-l">
                          <div className="flex items-center gap-0.5 justify-center">
                            {/* Apply to Row uses the first indicator's bands as representative */}
                            <Select
                              value={applyRowBand[feat.id] || 'unset'}
                              onValueChange={(val) => setApplyRowBand(prev => ({ ...prev, [feat.id]: val === 'unset' ? '' : val }))}
                            >
                              <SelectTrigger className="h-6 w-full max-w-[100px] px-1 text-xs border-muted">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                <SelectItem value="unset"><span className="text-muted-foreground">—</span></SelectItem>
                                {/* Generic weight options for row apply since KPIs may differ */}
                                <SelectItem value="1">
                                  <span className="flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', RAG_DOT_CLASS.green)} />Green (1)</span>
                                </SelectItem>
                                <SelectItem value="0.5">
                                  <span className="flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', RAG_DOT_CLASS.amber)} />Amber (0.5)</span>
                                </SelectItem>
                                <SelectItem value="0">
                                  <span className="flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', RAG_DOT_CLASS.red)} />Red (0)</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    disabled={!applyRowBand[feat.id]}
                                    onClick={() => {
                                      const weight = parseFloat(applyRowBand[feat.id]);
                                      if (isNaN(weight)) return;
                                      applyToRow(section.id, feat.id, weight, section.indicators, section.indicatorFeatureMap);
                                      const label = weight === 1 ? 'Green' : weight === 0.5 ? 'Amber' : 'Red';
                                      toast.success(`Applied ${label} to all KPIs for ${feat.name}`);
                                    }}
                                  >
                                    <CopyCheck className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Apply selected band to all KPIs for this feature</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                              title="Clear row"
                              onClick={() => {
                                clearRow(section.id, feat.id, section.indicators, section.indicatorFeatureMap);
                                toast.success(`Cleared all KPIs for ${feat.name}`);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <CustomerAttachments
              customerId={section.id}
              departmentId={departmentId}
              period={period}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
