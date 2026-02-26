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
import { Save, Loader2, Info, ChevronDown, ChevronRight, Search, Download, Upload, CopyCheck, X, ClipboardCheck, Check, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CustomerAttachments } from './CustomerAttachments';
import { generateMatrixTemplate, parseMatrixExcel } from '@/lib/matrixExcelHelper';
import { notifyAdminsOfCompletion } from '@/lib/notifyAdmins';
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
  managedServicesOnly?: boolean;
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

export function CSMDataEntryMatrix({ departmentId, period, managedServicesOnly }: CSMDataEntryMatrixProps) {
  const { user, isAdmin, isDepartmentHead } = useAuth();
  const { logActivity } = useActivityLog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [savingCustomerId, setSavingCustomerId] = useState<string | null>(null);
  const [savedCustomers, setSavedCustomers] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<ScoreMap>({});
  const [originalScores, setOriginalScores] = useState<ScoreMap>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [skipReasonDialogOpen, setSkipReasonDialogOpen] = useState(false);
  const [generalSkipReason, setGeneralSkipReason] = useState('');
  const [pendingSaveAction, setPendingSaveAction] = useState<'update' | 'no_update' | null>(null);
  const scoresInitializedRef = useRef(false);

  const { data: matrixData, isLoading: loading } = useQuery({
    queryKey: ['csm-matrix', departmentId, period, user?.id, isAdmin, managedServicesOnly],
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

      // Fetch Content Management department ID (for CM sub-section)
      let cmDeptId: string | null = null;
      {
        const { data: cmDept } = await supabase
          .from('departments')
          .select('id')
          .eq('name', 'Content Management')
          .maybeSingle();
        if (cmDept) cmDeptId = cmDept.id;
      }
      const isCMDepartment = cmDeptId === departmentId;

      const { data: fos } = await supabase
        .from('functional_objectives')
        .select('id, name')
        .eq('department_id', departmentId);
      if (!fos?.length) return { sections: [], indicators: [], bands: {}, scores: {}, cmIndicators: [] as IndicatorInfo[], cmBands: {} as BandMap, cmDepartmentId: null };

      const { data: krs } = await supabase
        .from('key_results')
        .select('id, name, functional_objective_id')
        .in('functional_objective_id', fos.map(f => f.id));
      if (!krs?.length) return { sections: [], indicators: [], bands: {}, scores: {}, cmIndicators: [] as IndicatorInfo[], cmBands: {} as BandMap, cmDepartmentId: null };

      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, name, current_value, target_value, key_result_id')
        .in('key_result_id', krs.map(k => k.id));
      if (!indicators?.length) return { sections: [], indicators: [], bands: {}, scores: {}, cmIndicators: [] as IndicatorInfo[], cmBands: {} as BandMap, cmDepartmentId: null };

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

      // === CM direct mode: no feature links, show all managed services customers with all indicators ===
      if (managedServicesOnly && allLinkedFeatureIds.size === 0) {
        const { data: managedCusts } = await supabase
          .from('customers')
          .select('id, name')
          .eq('managed_services', true)
          .order('name');

        // Use a deterministic UUID placeholder so the matrix grid works and DB accepts it
        const placeholderFeatureId = '00000000-0000-0000-0000-000000000000';
        const placeholderFeature = { id: placeholderFeatureId, name: 'Score', description: null, category: null };

        const { data: existingScoresDirect } = await supabase
          .from('csm_customer_feature_scores' as any)
          .select('*')
          .in('indicator_id', indIds)
          .eq('period', period);

        const directSections: CustomerSection[] = (managedCusts || []).map(c => ({
          id: c.id,
          name: c.name,
          features: [placeholderFeature],
          indicators: indicatorInfos,
          indicatorFeatureMap: Object.fromEntries(indicatorInfos.map(ind => [ind.id, new Set([placeholderFeatureId])])),
        }));

        const directScoreMap: ScoreMap = {};
        (existingScoresDirect || []).forEach((s: any) => {
          directScoreMap[cellKey(s.indicator_id, s.customer_id, s.feature_id)] = s.value != null ? Number(s.value) : null;
        });

        return { sections: directSections, indicators: indicatorInfos, bands: bandsMap, scores: directScoreMap, cmIndicators: [] as IndicatorInfo[], cmBands: {} as BandMap, cmDepartmentId: null };
      }

      if (allLinkedFeatureIds.size === 0) return { sections: [], indicators: indicatorInfos, bands: bandsMap, scores: {}, cmIndicators: [] as IndicatorInfo[], cmBands: {} as BandMap, cmDepartmentId: null };

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

      // Filter to managed services customers only if requested
      if (managedServicesOnly) {
        const { data: managedCusts } = await supabase
          .from('customers')
          .select('id')
          .eq('managed_services', true);
        const managedIds = new Set(managedCusts?.map(c => c.id));
        for (const custId of custFeatureMap.keys()) {
          if (!managedIds.has(custId)) {
            custFeatureMap.delete(custId);
            custNameMap.delete(custId);
          }
        }
      }

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

      // Fetch CM department data for sub-section (skip if current dept IS CM or managedServicesOnly)
      let cmIndicatorInfos: IndicatorInfo[] = [];
      let cmBandsMap: BandMap = {};

      if (cmDeptId && !isCMDepartment && !managedServicesOnly) {
        const { data: cmFos } = await supabase
          .from('functional_objectives')
          .select('id, name')
          .eq('department_id', cmDeptId);

        if (cmFos?.length) {
          const { data: cmKrs } = await supabase
            .from('key_results')
            .select('id, name, functional_objective_id')
            .in('functional_objective_id', cmFos.map(f => f.id));

          if (cmKrs?.length) {
            const cmKrMap = new Map(cmKrs.map(k => [k.id, k]));
            const cmFoMap = new Map(cmFos.map(f => [f.id, f]));

            const { data: cmInds } = await supabase
              .from('indicators')
              .select('id, name, current_value, target_value, key_result_id')
              .in('key_result_id', cmKrs.map(k => k.id));

            if (cmInds?.length) {
              cmIndicatorInfos = cmInds.map(ind => {
                const kr = cmKrMap.get(ind.key_result_id!);
                const fo = kr ? cmFoMap.get(kr.functional_objective_id!) : undefined;
                return {
                  id: ind.id,
                  name: ind.name,
                  current_value: ind.current_value != null ? Number(ind.current_value) : null,
                  target_value: ind.target_value != null ? Number(ind.target_value) : null,
                  kr_name: kr?.name || '',
                  fo_name: fo?.name || '',
                };
              });

              const cmIndIds = cmInds.map(i => i.id);

              const { data: cmBandsData } = await supabase
                .from('kpi_rag_bands')
                .select('indicator_id, band_label, rag_color, rag_numeric, sort_order')
                .in('indicator_id', cmIndIds)
                .order('sort_order');

              (cmBandsData || []).forEach((b: any) => {
                if (!cmBandsMap[b.indicator_id]) cmBandsMap[b.indicator_id] = [];
                cmBandsMap[b.indicator_id].push({
                  band_label: b.band_label,
                  rag_color: b.rag_color,
                  rag_numeric: Number(b.rag_numeric),
                  sort_order: b.sort_order,
                });
              });

              // Fetch existing CM scores for customers in this matrix
              const custIds = sections.map(s => s.id);
              if (custIds.length > 0) {
                const { data: cmScores } = await supabase
                  .from('csm_customer_feature_scores' as any)
                  .select('*')
                  .in('indicator_id', cmIndIds)
                  .in('customer_id', custIds)
                  .eq('period', period);

                (cmScores || []).forEach((s: any) => {
                  scoreMap[cellKey(s.indicator_id, s.customer_id, s.feature_id)] = s.value != null ? Number(s.value) : null;
                });
              }
            }
          }
        }
      }

      return {
        sections,
        indicators: indicatorInfos,
        bands: bandsMap,
        scores: scoreMap,
        cmIndicators: cmIndicatorInfos,
        cmBands: cmBandsMap,
        cmDepartmentId: cmDeptId && !isCMDepartment && !managedServicesOnly ? cmDeptId : null,
      };
    },
    enabled: !!departmentId && !!user,
    staleTime: 30 * 1000,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: false,
  });

  const customerSections = matrixData?.sections ?? [];
  const allIndicators = matrixData?.indicators ?? [];
  const kpiBands = matrixData?.bands ?? {};
  const cmIndicators = matrixData?.cmIndicators ?? [];
  const cmBands = matrixData?.cmBands ?? {};
  const cmDepartmentId = matrixData?.cmDepartmentId ?? null;

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

  // Detect customers with zero scores filled AND not individually saved
  const getEmptyCustomers = useCallback((): CustomerSection[] => {
    return customerSections.filter(section => {
      if (savedCustomers.has(section.id)) return false; // individually saved = not empty
      const hasAnyScore = section.indicators.some(ind => {
        const feats = section.indicatorFeatureMap[ind.id];
        if (!feats) return false;
        return [...feats].some(fid => scores[cellKey(ind.id, section.id, fid)] != null);
      });
      return !hasAnyScore;
    });
  }, [customerSections, scores, savedCustomers]);

  // Per-customer save: upserts only that customer's scores, no indicator aggregation
  const doSaveCustomer = async (customerId: string) => {
    if (!user) return;
    const section = customerSections.find(s => s.id === customerId);
    if (!section) return;

    setSavingCustomerId(customerId);
    try {
      const upserts: any[] = [];
      const deletes: { indicator_id: string; customer_id: string; feature_id: string }[] = [];

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
            deletes.push({ indicator_id: ind.id, customer_id: section.id, feature_id: feat.id });
          }
        }
      }

      // Also collect CM indicator scores
      if (cmIndicators.length > 0) {
        const placeholderFeatureId = CM_DIRECT_FEATURE_ID;
        for (const ind of cmIndicators) {
          const key = cellKey(ind.id, section.id, placeholderFeatureId);
          const val = scores[key];
          const origVal = originalScores[key];
          if (val != null) {
            upserts.push({
              indicator_id: ind.id,
              customer_id: section.id,
              feature_id: placeholderFeatureId,
              value: val,
              period,
              created_by: user.id,
            });
          } else if (origVal != null && val === undefined) {
            deletes.push({ indicator_id: ind.id, customer_id: section.id, feature_id: placeholderFeatureId });
          }
        }
      }

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

      // Update original scores for this customer so hasChanges recalculates
      setOriginalScores(prev => {
        const next = { ...prev };
        for (const feat of section.features) {
          for (const ind of section.indicators) {
            const feats = section.indicatorFeatureMap[ind.id];
            if (!feats?.has(feat.id)) continue;
            const key = cellKey(ind.id, section.id, feat.id);
            if (scores[key] != null) next[key] = scores[key];
            else delete next[key];
          }
        }
        // Also update CM original scores
        if (cmIndicators.length > 0) {
          const placeholderFeatureId = CM_DIRECT_FEATURE_ID;
          for (const ind of cmIndicators) {
            const key = cellKey(ind.id, section.id, placeholderFeatureId);
            if (scores[key] != null) next[key] = scores[key];
            else delete next[key];
          }
        }
        return next;
      });

      setSavedCustomers(prev => new Set(prev).add(customerId));
      toast.success(`Saved scores for ${section.name}`);
    } catch (err) {
      console.error('Error saving customer scores:', err);
      toast.error(`Failed to save scores for ${section.name}`);
    } finally {
      setSavingCustomerId(null);
    }
  };

  const initiateCheckIn = (action: 'update' | 'no_update') => {
    const empty = getEmptyCustomers();
    if (empty.length > 0) {
      setGeneralSkipReason('');
      setPendingSaveAction(action);
      setSkipReasonDialogOpen(true);
    } else {
      if (action === 'update') doSaveAll();
      else doNoUpdateCheckIn();
    }
  };

  const confirmSkipAndSave = () => {
    const empty = getEmptyCustomers();
    if (empty.length > 0 && !generalSkipReason.trim()) {
      toast.error('Please provide a reason for customers without scores');
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
              deletes.push({ indicator_id: ind.id, customer_id: section.id, feature_id: feat.id });
            }
          }
        }
        // Also collect CM indicator scores for this customer
        if (cmIndicators.length > 0) {
          const placeholderFeatureId = CM_DIRECT_FEATURE_ID;
          for (const ind of cmIndicators) {
            const key = cellKey(ind.id, section.id, placeholderFeatureId);
            const val = scores[key];
            const origVal = originalScores[key];
            if (val != null) {
              upserts.push({
                indicator_id: ind.id,
                customer_id: section.id,
                feature_id: placeholderFeatureId,
                value: val,
                period,
                created_by: user.id,
              });
            } else if (origVal != null && val === undefined) {
              deletes.push({ indicator_id: ind.id, customer_id: section.id, feature_id: placeholderFeatureId });
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
        // Also aggregate CM indicator scores
        if (cmIndicators.length > 0) {
          const placeholderFeatureId = CM_DIRECT_FEATURE_ID;
          for (const ind of cmIndicators) {
            const v = scores[cellKey(ind.id, section.id, placeholderFeatureId)];
            if (v != null) {
              if (!indicatorAggregates.has(ind.id)) indicatorAggregates.set(ind.id, []);
              indicatorAggregates.get(ind.id)!.push(v);
            }
          }
        }
      }

      // Update main department indicators
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

      // Update CM indicators
      for (const ind of cmIndicators) {
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
            notes: 'Updated via CSM Matrix — Content Management sub-section',
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
            department_id: cmDepartmentId,
            period,
            source: 'customer_feature_matrix_cm_subsection',
            aggregate_percentage: aggPercentage,
            rag_status: ragStatus,
          },
        });
      }

      // Log general skip reason for empty customers
      const emptyCustomers = getEmptyCustomers();
      if (emptyCustomers.length > 0 && generalSkipReason.trim()) {
        const customerNames = emptyCustomers.map(c => c.name).join(', ');
        await logActivity({
          action: 'update',
          entityType: 'department',
          entityId: departmentId,
          entityName: `Skip reason for: ${customerNames}`,
          metadata: {
            department_id: departmentId,
            period,
            source: 'customer_feature_matrix',
            skip_reason: generalSkipReason.trim(),
            skipped_customers: emptyCustomers.map(c => ({ id: c.id, name: c.name })),
          },
        });
      }

      toast.success(`Saved ${upserts.length} score(s) and updated KPI values`);
      setOriginalScores({ ...scores });
      setSavedCustomers(new Set());
      setGeneralSkipReason('');
      queryClient.invalidateQueries({ queryKey: ['csm-matrix', departmentId, period] });

      // Notify admins of completion
      const { data: deptInfo } = await supabase.from('departments').select('name').eq('id', departmentId).single();
      notifyAdminsOfCompletion({
        departmentName: deptInfo?.name || 'Unknown',
        userName: user.email || 'Unknown user',
        period,
        indicatorCount: upserts.length,
        source: 'customer_feature_matrix',
      });
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
        // Also include CM indicator scores
        if (cmIndicators.length > 0) {
          const placeholderFeatureId = CM_DIRECT_FEATURE_ID;
          for (const ind of cmIndicators) {
            const val = scores[cellKey(ind.id, section.id, placeholderFeatureId)];
            if (val != null) {
              existingUpserts.push({
                indicator_id: ind.id,
                customer_id: section.id,
                feature_id: placeholderFeatureId,
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

      // Log general skip reason for empty customers
      const emptyCustomers = getEmptyCustomers();
      if (emptyCustomers.length > 0 && generalSkipReason.trim()) {
        const customerNames = emptyCustomers.map(c => c.name).join(', ');
        await logActivity({
          action: 'update',
          entityType: 'department',
          entityId: departmentId,
          entityName: `Skip reason for: ${customerNames}`,
          metadata: {
            department_id: departmentId,
            period,
            source: 'customer_feature_matrix',
            skip_reason: generalSkipReason.trim(),
            skipped_customers: emptyCustomers.map(c => ({ id: c.id, name: c.name })),
          },
        });
      }

      toast.success('Checked in — no updates for this period.');
      setGeneralSkipReason('');
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

  // Detect if a specific customer has unsaved changes
  const customerHasUnsavedChanges = useCallback((section: CustomerSection): boolean => {
    for (const feat of section.features) {
      for (const ind of section.indicators) {
        const feats = section.indicatorFeatureMap[ind.id];
        if (!feats?.has(feat.id)) continue;
        const key = cellKey(ind.id, section.id, feat.id);
        if (scores[key] !== originalScores[key]) return true;
      }
    }
    // Also check CM indicator keys
    if (cmIndicators.length > 0) {
      const placeholderFeatureId = CM_DIRECT_FEATURE_ID;
      for (const ind of cmIndicators) {
        const key = cellKey(ind.id, section.id, placeholderFeatureId);
        if (scores[key] !== originalScores[key]) return true;
      }
    }
    return false;
  }, [scores, originalScores, cmIndicators]);

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
          <Button
            onClick={() => initiateCheckIn('update')}
            disabled={saving}
            className={cn(
              "gap-2",
              (hasChanges || savedCustomers.size > 0) && !saving && "animate-save-pulse ring-2 ring-primary/50"
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Update & Check In
          </Button>
        </div>
      </div>

      {/* Compact Warning Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 dark:bg-destructive/20 px-3 py-2 flex items-center gap-2.5">
          <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-foreground">
            <strong className="text-destructive">Legit reasons required</strong> — All check-ins are audited. Vague or incorrect reasons will be flagged &amp; escalated.
          </p>
        </div>
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 px-3 py-2 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-foreground">
            <strong className="text-amber-700 dark:text-amber-300">Save ≠ Check-In</strong> — Saving stores progress only. You must click <strong>"Update &amp; Check In"</strong> to submit.
          </p>
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
          isSaved={savedCustomers.has(section.id)}
          isSaving={savingCustomerId === section.id}
          onSaveCustomer={doSaveCustomer}
          hasUnsavedChanges={customerHasUnsavedChanges(section)}
          cmIndicators={cmIndicators}
          cmBands={cmBands}
        />
      ))}

      {/* Skip Reason Dialog — single general reason for all empty customers */}
      <Dialog open={skipReasonDialogOpen} onOpenChange={setSkipReasonDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Mandatory: Provide a Legitimate Reason
            </DialogTitle>
            <DialogDescription>
              {getEmptyCustomers().length} customer{getEmptyCustomers().length !== 1 ? 's have' : ' has'} no scores entered.
              Provide a genuine, specific reason that applies to all of them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                This reason is logged and audited
              </p>
              <p className="text-xs text-destructive/80 mt-1">
                Inaccurate or placeholder reasons will be flagged and escalated to your manager.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getEmptyCustomers().map(c => (
                <Badge key={c.id} variant="outline" className="text-xs">{c.name}</Badge>
              ))}
            </div>
            <div className="space-y-1">
              <Textarea
                placeholder="Provide a specific, verifiable reason (minimum 10 characters)..."
                value={generalSkipReason}
                onChange={e => setGeneralSkipReason(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <p className={cn(
                "text-xs text-right",
                generalSkipReason.trim().length < 10 ? "text-destructive" : "text-muted-foreground"
              )}>
                {generalSkipReason.trim().length}/10 characters minimum
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipReasonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSkipAndSave} disabled={generalSkipReason.trim().length < 10}>
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
  isSaved: boolean;
  isSaving: boolean;
  onSaveCustomer: (customerId: string) => Promise<void>;
  hasUnsavedChanges: boolean;
  cmIndicators: IndicatorInfo[];
  cmBands: BandMap;
}

// Check if this is CM direct mode (no real features, just placeholder)
const CM_DIRECT_FEATURE_ID = '00000000-0000-0000-0000-000000000000';
const isCMDirectMode = (section: CustomerSection) =>
  section.features.length === 1 && section.features[0].id === CM_DIRECT_FEATURE_ID;

function CustomerSectionCard({
  section, isOpen, onToggle, scores, kpiBands, onCellChange,
  applyToRow, applyToColumn, clearRow, clearColumn, getFeatureRowAvg, getCustomerOverallAvg,
  departmentId, period, isSaved, isSaving, onSaveCustomer, hasUnsavedChanges,
  cmIndicators, cmBands,
}: CustomerSectionCardProps) {
  const custAvg = getCustomerOverallAvg(section);
  const custRag = custAvg != null ? percentToRAG(Math.round(custAvg)) : null;

  const [applyRowBand, setApplyRowBand] = useState<Record<string, string>>({});
  const [applyColBand, setApplyColBand] = useState<Record<string, string>>({});

  const getBandsForIndicator = (indId: string): KPIBand[] => {
    return kpiBands[indId] || DEFAULT_BANDS;
  };

  const directMode = isCMDirectMode(section);
  const placeholderFeatId = CM_DIRECT_FEATURE_ID;

  // For CM direct mode: compute score total (count greens, ambers, reds)
  const getScoreSummary = () => {
    let greens = 0, ambers = 0, reds = 0, total = 0;
    for (const ind of section.indicators) {
      const key = cellKey(ind.id, section.id, placeholderFeatId);
      const val = scores[key];
      if (val != null) {
        total++;
        if (val === 1) greens++;
        else if (val === 0.5) ambers++;
        else if (val === 0) reds++;
      }
    }
    return { greens, ambers, reds, total };
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
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    {cmIndicators.length > 0 && (
                      <Badge variant="outline" className="text-xs border-primary/40 bg-primary/10 text-primary">CM</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {directMode
                      ? `${section.indicators.length} KPI${section.indicators.length !== 1 ? 's' : ''}`
                      : `${section.features.length} feature${section.features.length !== 1 ? 's' : ''} × ${section.indicators.length} KPI${section.indicators.length !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSaved && (
                  <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                    <Check className="h-3 w-3" />
                    Saved
                  </Badge>
                )}
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
            {directMode ? (
              /* ===== CM Direct Mode: Simple KPI list with dropdowns and score total ===== */
              <div className="space-y-4">
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left font-semibold min-w-[200px] border-r">KPI</th>
                        <th className="px-3 py-2 text-center font-semibold min-w-[180px] border-r">Score</th>
                        <th className="px-3 py-2 text-center font-semibold min-w-[100px]">RAG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.indicators.map(ind => {
                        const key = cellKey(ind.id, section.id, placeholderFeatId);
                        const val = scores[key] ?? null;
                        const ragColor = val != null ? weightToRAGColor(val) : '';
                        const cellBg = ragColor ? RAG_CELL_BG[ragColor] : '';

                        return (
                          <tr key={ind.id} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 font-medium text-xs border-r">
                              <TooltipProvider>
                                <Tooltip delayDuration={0}>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help border-b border-dotted border-muted-foreground/40">
                                      {ind.name}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <p className="font-semibold text-sm">{ind.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{ind.fo_name} → {ind.kr_name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            <td className={cn('px-2 py-1.5 text-center border-r', cellBg)}>
                              <BandDropdown
                                value={val}
                                bands={getBandsForIndicator(ind.id)}
                                onChange={(b) => onCellChange(ind.id, section.id, placeholderFeatId, b)}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {val != null ? (
                                <span className={cn('inline-flex h-3 w-3 rounded-full', RAG_DOT_CLASS[ragColor] || 'bg-muted')} />
                              ) : (
                                <span className="text-muted-foreground/40 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30 font-semibold">
                        <td className="px-3 py-2 text-sm border-r">Score Total</td>
                        <td className="px-3 py-2 text-center text-xs border-r" colSpan={2}>
                          {(() => {
                            const { greens, ambers, reds, total } = getScoreSummary();
                            if (total === 0) return <span className="text-muted-foreground">No scores entered</span>;
                            const score = ((greens * 1 + ambers * 0.5 + reds * 0) / section.indicators.length) * 100;
                            return (
                              <div className="flex items-center justify-center gap-3">
                                <span className="flex items-center gap-1">
                                  <span className={cn('h-2.5 w-2.5 rounded-full', RAG_DOT_CLASS.green)} />
                                  {greens}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className={cn('h-2.5 w-2.5 rounded-full', RAG_DOT_CLASS.amber)} />
                                  {ambers}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className={cn('h-2.5 w-2.5 rounded-full', RAG_DOT_CLASS.red)} />
                                  {reds}
                                </span>
                                <Badge className={cn(RAG_BADGE_STYLES[percentToRAG(Math.round(score))], 'text-[10px] ml-2')}>
                                  {Math.round(score)}%
                                </Badge>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {/* Apply All row for CM direct mode */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">Apply to all KPIs:</span>
                  {[
                    { label: 'Green', value: 1, color: 'green' },
                    { label: 'Amber', value: 0.5, color: 'amber' },
                    { label: 'Red', value: 0, color: 'red' },
                  ].map(opt => (
                    <Button
                      key={opt.label}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() => {
                        applyToRow(section.id, placeholderFeatId, opt.value, section.indicators, section.indicatorFeatureMap);
                        toast.success(`Applied ${opt.label} to all KPIs`);
                      }}
                    >
                      <span className={cn('h-2 w-2 rounded-full', RAG_DOT_CLASS[opt.color])} />
                      {opt.label}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      clearRow(section.id, placeholderFeatId, section.indicators, section.indicatorFeatureMap);
                      toast.success('Cleared all KPIs');
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
                {/* Per-customer Save button */}
                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant={hasUnsavedChanges && !isSaved ? "default" : "outline"}
                    className={cn(
                      "gap-2",
                      hasUnsavedChanges && !isSaved && !isSaving && "animate-save-pulse ring-2 ring-primary/50"
                    )}
                    disabled={isSaving}
                    onClick={() => onSaveCustomer(section.id)}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save {section.name}
                  </Button>
                </div>
                <CustomerAttachments
                  customerId={section.id}
                  departmentId={departmentId}
                  period={period}
                />
              </div>
            ) : (
              /* ===== Standard Feature × KPI Matrix ===== */
              <div>
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

                {/* ===== Content Management Indicators Sub-Section ===== */}
                {cmIndicators.length > 0 && (
                  <CMSubSectionBlock
                    customerId={section.id}
                    cmIndicators={cmIndicators}
                    cmBands={cmBands}
                    scores={scores}
                    onCellChange={onCellChange}
                  />
                )}

                {/* Per-customer Save button */}
                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant={hasUnsavedChanges && !isSaved ? "default" : "outline"}
                    className={cn(
                      "gap-2",
                      hasUnsavedChanges && !isSaved && !isSaving && "animate-save-pulse ring-2 ring-primary/50"
                    )}
                    disabled={isSaving}
                    onClick={() => onSaveCustomer(section.id)}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save {section.name}
                  </Button>
                </div>
                <CustomerAttachments
                  customerId={section.id}
                  departmentId={departmentId}
                  period={period}
                />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============= CM Sub-Section Block =============

interface CMSubSectionBlockProps {
  customerId: string;
  cmIndicators: IndicatorInfo[];
  cmBands: BandMap;
  scores: ScoreMap;
  onCellChange: (indicatorId: string, customerId: string, featureId: string, value: string) => void;
}

function CMSubSectionBlock({ customerId, cmIndicators, cmBands, scores, onCellChange }: CMSubSectionBlockProps) {
  const [cmOpen, setCmOpen] = useState(true);
  const placeholderFeatId = CM_DIRECT_FEATURE_ID;

  const getBandsForIndicator = (indId: string): KPIBand[] => {
    return cmBands[indId] || DEFAULT_BANDS;
  };

  const getScoreSummary = () => {
    let greens = 0, ambers = 0, reds = 0, total = 0;
    for (const ind of cmIndicators) {
      const key = cellKey(ind.id, customerId, placeholderFeatId);
      const val = scores[key];
      if (val != null) {
        total++;
        if (val === 1) greens++;
        else if (val === 0.5) ambers++;
        else if (val === 0) reds++;
      }
    }
    return { greens, ambers, reds, total };
  };

  const { total } = getScoreSummary();

  return (
    <Collapsible open={cmOpen} onOpenChange={setCmOpen} className="mt-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-2 text-sm font-semibold border-l-4 border-l-primary bg-primary/5 hover:bg-primary/10">
          <span className="flex items-center gap-2">
            {cmOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Content Management Indicators
          </span>
          <Badge variant="secondary" className="text-xs">
            {total}/{cmIndicators.length} scored
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="space-y-3">
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left font-semibold min-w-[200px] border-r">KPI</th>
                  <th className="px-3 py-2 text-center font-semibold min-w-[180px] border-r">Score</th>
                  <th className="px-3 py-2 text-center font-semibold min-w-[100px]">RAG</th>
                </tr>
              </thead>
              <tbody>
                {cmIndicators.map(ind => {
                  const key = cellKey(ind.id, customerId, placeholderFeatId);
                  const val = scores[key] ?? null;
                  const ragColor = val != null ? weightToRAGColor(val) : '';
                  const cellBg = ragColor ? RAG_CELL_BG[ragColor] : '';

                  return (
                    <tr key={ind.id} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-medium text-xs border-r">
                        <TooltipProvider>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <span className="cursor-help border-b border-dotted border-muted-foreground/40">
                                {ind.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-semibold text-sm">{ind.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{ind.fo_name} → {ind.kr_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className={cn('px-2 py-1.5 text-center border-r', cellBg)}>
                        <BandDropdown
                          value={val}
                          bands={getBandsForIndicator(ind.id)}
                          onChange={(b) => onCellChange(ind.id, customerId, placeholderFeatId, b)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {val != null ? (
                          <span className={cn('inline-flex h-3 w-3 rounded-full', RAG_DOT_CLASS[ragColor] || 'bg-muted')} />
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-3 py-2 text-sm border-r">Score Total</td>
                  <td className="px-3 py-2 text-center text-xs border-r" colSpan={2}>
                    {(() => {
                      const { greens, ambers, reds, total } = getScoreSummary();
                      if (total === 0) return <span className="text-muted-foreground">No scores entered</span>;
                      const score = ((greens * 1 + ambers * 0.5 + reds * 0) / cmIndicators.length) * 100;
                      return (
                        <div className="flex items-center justify-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className={cn('h-2.5 w-2.5 rounded-full', RAG_DOT_CLASS.green)} />
                            {greens}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className={cn('h-2.5 w-2.5 rounded-full', RAG_DOT_CLASS.amber)} />
                            {ambers}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className={cn('h-2.5 w-2.5 rounded-full', RAG_DOT_CLASS.red)} />
                            {reds}
                          </span>
                          <Badge className={cn(RAG_BADGE_STYLES[percentToRAG(Math.round(score))], 'text-[10px] ml-2')}>
                            {Math.round(score)}%
                          </Badge>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Apply All row for CM sub-section */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Apply to all CM KPIs:</span>
            {[
              { label: 'Green', value: 1, color: 'green' },
              { label: 'Amber', value: 0.5, color: 'amber' },
              { label: 'Red', value: 0, color: 'red' },
            ].map(opt => (
              <Button
                key={opt.label}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => {
                  for (const ind of cmIndicators) {
                    onCellChange(ind.id, customerId, placeholderFeatId, String(opt.value));
                  }
                  toast.success(`Applied ${opt.label} to all CM KPIs`);
                }}
              >
                <span className={cn('h-2 w-2 rounded-full', RAG_DOT_CLASS[opt.color])} />
                {opt.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                for (const ind of cmIndicators) {
                  onCellChange(ind.id, customerId, placeholderFeatId, 'unset');
                }
                toast.success('Cleared all CM KPIs');
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
