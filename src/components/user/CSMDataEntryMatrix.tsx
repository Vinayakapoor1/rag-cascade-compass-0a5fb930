import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Loader2, Info, ChevronDown, ChevronRight, Search, Download, Upload, CopyCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { generateMatrixTemplate, parseMatrixExcel } from '@/lib/matrixExcelHelper';
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

// ============= Vector Weight Constants =============
const VECTOR_WEIGHTS = { green: 1, amber: 0.5, red: 0 } as const;
type BandKey = keyof typeof VECTOR_WEIGHTS;

const BAND_OPTIONS: { value: BandKey; label: string; dotClass: string }[] = [
  { value: 'green', label: 'Green', dotClass: 'bg-rag-green' },
  { value: 'amber', label: 'Amber', dotClass: 'bg-rag-amber' },
  { value: 'red', label: 'Red', dotClass: 'bg-rag-red' },
];

function vectorToBand(val: number | null): BandKey | undefined {
  if (val === null || val === undefined) return undefined;
  if (val >= 1) return 'green';
  if (val >= 0.5) return 'amber';
  return 'red';
}

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

interface CustomerSection {
  id: string;
  name: string;
  features: { id: string; name: string }[];
  indicators: IndicatorInfo[];
  indicatorFeatureMap: Record<string, Set<string>>;
}

function cellKey(indicatorId: string, customerId: string, featureId: string) {
  return `${indicatorId}::${customerId}::${featureId}`;
}

function percentToRAG(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 76) return 'green';
  if (pct >= 51) return 'amber';
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

export function CSMDataEntryMatrix({ departmentId, period }: CSMDataEntryMatrixProps) {
  const { user, isAdmin } = useAuth();
  const { logActivity } = useActivityLog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerSections, setCustomerSections] = useState<CustomerSection[]>([]);
  const [allIndicators, setAllIndicators] = useState<IndicatorInfo[]>([]);
  const [scores, setScores] = useState<ScoreMap>({});
  const [originalScores, setOriginalScores] = useState<ScoreMap>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    if (!departmentId || !user) return;
    setLoading(true);

    try {
      let csmId: string | null = null;
      if (!isAdmin) {
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
      if (!fos?.length) { setCustomerSections([]); setLoading(false); return; }

      const { data: krs } = await supabase
        .from('key_results')
        .select('id, name, functional_objective_id')
        .in('functional_objective_id', fos.map(f => f.id));
      if (!krs?.length) { setCustomerSections([]); setLoading(false); return; }

      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, name, current_value, target_value, key_result_id')
        .in('key_result_id', krs.map(k => k.id));
      if (!indicators?.length) { setCustomerSections([]); setLoading(false); return; }

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
      setAllIndicators(indicatorInfos);

      const { data: featureLinks } = await supabase
        .from('indicator_feature_links')
        .select('indicator_id, feature_id, features(id, name)')
        .in('indicator_id', indIds);

      const indFeatureMap: Record<string, Set<string>> = {};
      const featureNameMap = new Map<string, string>();
      (featureLinks || []).forEach((fl: any) => {
        if (!fl.features) return;
        if (!indFeatureMap[fl.indicator_id]) indFeatureMap[fl.indicator_id] = new Set();
        indFeatureMap[fl.indicator_id].add(fl.features.id);
        featureNameMap.set(fl.features.id, fl.features.name);
      });

      const allLinkedFeatureIds = new Set<string>();
      Object.values(indFeatureMap).forEach(s => s.forEach(id => allLinkedFeatureIds.add(id)));
      if (allLinkedFeatureIds.size === 0) { setCustomerSections([]); setLoading(false); return; }

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
          .map(fid => ({ id: fid, name: featureNameMap.get(fid) || 'Unknown' }))
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
      setCustomerSections(sections);
      setOpenSections(new Set());

      const scoreMap: ScoreMap = {};
      (existingScores || []).forEach((s: any) => {
        scoreMap[cellKey(s.indicator_id, s.customer_id, s.feature_id)] = s.value != null ? Number(s.value) : null;
      });
      setScores({ ...scoreMap });
      setOriginalScores({ ...scoreMap });
    } catch (err) {
      console.error('Error loading matrix data:', err);
      toast.error('Failed to load matrix data');
    } finally {
      setLoading(false);
    }
  }, [departmentId, period, user, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCellChange = (indicatorId: string, customerId: string, featureId: string, band: string) => {
    const key = cellKey(indicatorId, customerId, featureId);
    if (band === '' || band === 'unset') {
      setScores(prev => ({ ...prev, [key]: null }));
      return;
    }
    const weight = VECTOR_WEIGHTS[band as BandKey];
    if (weight !== undefined) {
      setScores(prev => ({ ...prev, [key]: weight }));
    }
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

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const upserts: any[] = [];
      for (const section of customerSections) {
        for (const feat of section.features) {
          for (const ind of section.indicators) {
            const feats = section.indicatorFeatureMap[ind.id];
            if (!feats?.has(feat.id)) continue;
            const key = cellKey(ind.id, section.id, feat.id);
            const val = scores[key];
            if (val != null) {
              upserts.push({
                indicator_id: ind.id,
                customer_id: section.id,
                feature_id: feat.id,
                value: val,
                period,
                created_by: user.id,
              });
            }
          }
        }
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
        const aggPercentage = Math.round(avg * 100 * 100) / 100; // vector avg * 100
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

      toast.success(`Saved ${upserts.length} score(s) and updated KPI values`);
      setOriginalScores({ ...scores });
      fetchData();
    } catch (err) {
      console.error('Error saving matrix:', err);
      toast.error('Failed to save matrix data');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await generateMatrixTemplate(customerSections, period, scores);
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
      const result = await parseMatrixExcel(file, customerSections);
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
          {/* Band legend */}
          <div className="flex items-center gap-3 mr-2 text-xs text-muted-foreground">
            {BAND_OPTIONS.map(b => (
              <span key={b.value} className="flex items-center gap-1">
                <span className={cn('h-2 w-2 rounded-full', b.dotClass)} />
                {b.label} = {VECTOR_WEIGHTS[b.value]}
              </span>
            ))}
          </div>
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
          <Button onClick={handleSaveAll} disabled={saving || !hasChanges} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All
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
          onCellChange={handleCellChange}
          applyToRow={applyToRow}
          applyToColumn={applyToColumn}
          getFeatureRowAvg={getFeatureRowAvg}
          getCustomerOverallAvg={getCustomerOverallAvg}
        />
      ))}
    </div>
  );
}

function BandDropdown({
  value,
  onChange,
  compact = false,
}: {
  value: number | null;
  onChange: (band: string) => void;
  compact?: boolean;
}) {
  const band = vectorToBand(value);

  return (
    <Select value={band || 'unset'} onValueChange={onChange}>
      <SelectTrigger className={cn(
        'border-0 bg-transparent shadow-none focus:ring-1 text-xs mx-auto',
        compact ? 'h-6 w-[80px] px-1' : 'h-7 w-[90px] px-1.5',
      )}>
        <SelectValue placeholder="—">
          {band ? (
            <span className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full shrink-0', BAND_OPTIONS.find(b => b.value === band)?.dotClass)} />
              <span>{BAND_OPTIONS.find(b => b.value === band)?.label}</span>
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
        {BAND_OPTIONS.map(b => (
          <SelectItem key={b.value} value={b.value}>
            <span className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', b.dotClass)} />
              {b.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface CustomerSectionCardProps {
  section: CustomerSection;
  isOpen: boolean;
  onToggle: () => void;
  scores: ScoreMap;
  onCellChange: (indicatorId: string, customerId: string, featureId: string, value: string) => void;
  applyToRow: (custId: string, featureId: string, value: number, indicators: IndicatorInfo[], indFeatMap: Record<string, Set<string>>) => void;
  applyToColumn: (custId: string, indId: string, value: number, features: { id: string }[], indFeatMap: Record<string, Set<string>>) => void;
  getFeatureRowAvg: (custId: string, featureId: string, indicators: IndicatorInfo[], indFeatMap: Record<string, Set<string>>) => number | null;
  getCustomerOverallAvg: (section: CustomerSection) => number | null;
}

function CustomerSectionCard({
  section, isOpen, onToggle, scores, onCellChange,
  applyToRow, applyToColumn, getFeatureRowAvg, getCustomerOverallAvg,
}: CustomerSectionCardProps) {
  const custAvg = getCustomerOverallAvg(section);
  const custRag = custAvg != null ? percentToRAG(Math.round(custAvg)) : null;

  const [applyRowBand, setApplyRowBand] = useState<Record<string, BandKey | ''>>({});
  const [applyColBand, setApplyColBand] = useState<Record<string, BandKey | ''>>({});

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
                      <th key={ind.id} className="px-2 py-2 text-center font-medium min-w-[110px] border-r" title={`${ind.fo_name} → ${ind.kr_name}`}>
                        <span className="block mx-auto text-xs whitespace-normal leading-tight">{ind.name}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold min-w-[70px] bg-muted/30">
                      Avg
                    </th>
                    <th className="px-2 py-2 text-center font-medium min-w-[120px] bg-muted/30 border-l">
                      <span className="text-xs text-muted-foreground">Apply to Row</span>
                    </th>
                  </tr>
                  <tr className="bg-muted/20 border-t">
                    <td className="sticky left-0 z-10 bg-muted/20 px-3 py-1 text-xs text-muted-foreground font-medium border-r">
                      Apply to Column ↓
                    </td>
                    {section.indicators.map(ind => (
                      <td key={ind.id} className="px-1 py-1 text-center border-r">
                        <div className="flex items-center gap-0.5 justify-center">
                          <Select
                            value={applyColBand[ind.id] || 'unset'}
                            onValueChange={(val) => setApplyColBand(prev => ({ ...prev, [ind.id]: val === 'unset' ? '' : val as BandKey }))}
                          >
                            <SelectTrigger className="h-6 w-[70px] px-1 text-xs border-muted">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              <SelectItem value="unset"><span className="text-muted-foreground">—</span></SelectItem>
                              {BAND_OPTIONS.map(b => (
                                <SelectItem key={b.value} value={b.value}>
                                  <span className="flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', b.dotClass)} />{b.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            disabled={!applyColBand[ind.id]}
                            onClick={(e) => {
                              e.stopPropagation();
                              const band = applyColBand[ind.id] as BandKey;
                              if (!band) return;
                              const weight = VECTOR_WEIGHTS[band];
                              applyToColumn(section.id, ind.id, weight, section.features, section.indicatorFeatureMap);
                              toast.success(`Applied ${band} to all ${ind.name} cells`);
                            }}
                          >
                            <CopyCheck className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    ))}
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
                          {feat.name}
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

                          const band = vectorToBand(val);
                          const ragColor = band ? RAG_CELL_BG[band] : '';

                          return (
                            <td key={ind.id} className={cn('px-1 py-1 text-center border-r', ragColor)}>
                              <BandDropdown
                                value={val ?? null}
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
                            <Select
                              value={applyRowBand[feat.id] || 'unset'}
                              onValueChange={(val) => setApplyRowBand(prev => ({ ...prev, [feat.id]: val === 'unset' ? '' : val as BandKey }))}
                            >
                              <SelectTrigger className="h-6 w-[70px] px-1 text-xs border-muted">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                <SelectItem value="unset"><span className="text-muted-foreground">—</span></SelectItem>
                                {BAND_OPTIONS.map(b => (
                                  <SelectItem key={b.value} value={b.value}>
                                    <span className="flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', b.dotClass)} />{b.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              disabled={!applyRowBand[feat.id]}
                              onClick={() => {
                                const band = applyRowBand[feat.id] as BandKey;
                                if (!band) return;
                                const weight = VECTOR_WEIGHTS[band];
                                applyToRow(section.id, feat.id, weight, section.indicators, section.indicatorFeatureMap);
                                toast.success(`Applied ${band} to all KPIs for ${feat.name}`);
                              }}
                            >
                              <CopyCheck className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
