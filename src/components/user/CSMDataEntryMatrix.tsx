import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Loader2, Info, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CSMDataEntryMatrixProps {
  departmentId: string;
  period: string;
}

interface KPISection {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  kr_name: string;
  fo_name: string;
  features: { id: string; name: string }[];
  customers: { id: string; name: string; featureIds: Set<string> }[];
}

// Cell key: indicator_id::customer_id::feature_id
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kpiSections, setKpiSections] = useState<KPISection[]>([]);
  const [scores, setScores] = useState<ScoreMap>({});
  const [originalScores, setOriginalScores] = useState<ScoreMap>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!departmentId || !user) return;
    setLoading(true);

    try {
      // 0. Determine if current user is a CSM — filter customers accordingly
      let csmId: string | null = null;
      if (!isAdmin) {
        const { data: csmRow } = await supabase
          .from('csms')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (csmRow) csmId = csmRow.id;
      }

      // 1. Get FOs for dept
      const { data: fos } = await supabase
        .from('functional_objectives')
        .select('id, name')
        .eq('department_id', departmentId);

      if (!fos?.length) { setKpiSections([]); setLoading(false); return; }

      // 2. Get KRs
      const { data: krs } = await supabase
        .from('key_results')
        .select('id, name, functional_objective_id')
        .in('functional_objective_id', fos.map(f => f.id));

      if (!krs?.length) { setKpiSections([]); setLoading(false); return; }

      // 3. Get indicators
      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, name, current_value, target_value, key_result_id')
        .in('key_result_id', krs.map(k => k.id));

      if (!indicators?.length) { setKpiSections([]); setLoading(false); return; }

      const indIds = indicators.map(i => i.id);

      // 4. Get feature links for all indicators
      const { data: featureLinks } = await supabase
        .from('indicator_feature_links')
        .select('indicator_id, feature_id, features(id, name)')
        .in('indicator_id', indIds);

      // 5. Collect all feature IDs that are linked to any indicator
      const allLinkedFeatureIds = new Set<string>();
      (featureLinks || []).forEach((fl: any) => {
        if (fl.features) allLinkedFeatureIds.add(fl.features.id);
      });

      if (allLinkedFeatureIds.size === 0) { setKpiSections([]); setLoading(false); return; }

      // 6. Get customer_features for those features, filtered by CSM if applicable
      let customerFeaturesQuery = supabase
        .from('customer_features')
        .select('customer_id, feature_id, customers(id, name, csm_id)')
        .in('feature_id', Array.from(allLinkedFeatureIds));

      if (csmId) {
        // We'll filter after fetching since we need to join through customers
      }

      const { data: customerFeatures } = await customerFeaturesQuery;

      // 7. Load existing scores
      const { data: existingScores } = await supabase
        .from('csm_customer_feature_scores' as any)
        .select('*')
        .in('indicator_id', indIds)
        .eq('period', period);

      // Build lookup maps
      const krMap = new Map(krs.map(k => [k.id, k]));
      const foMap = new Map(fos.map(f => [f.id, f]));

      // Features per indicator
      const featuresByInd: Record<string, { id: string; name: string }[]> = {};
      (featureLinks || []).forEach((fl: any) => {
        if (!fl.features) return;
        if (!featuresByInd[fl.indicator_id]) featuresByInd[fl.indicator_id] = [];
        featuresByInd[fl.indicator_id].push({ id: fl.features.id, name: fl.features.name });
      });

      // Customer -> features mapping (filtered by CSM if applicable)
      const customerFeatureMap = new Map<string, Set<string>>();
      const customerNameMap = new Map<string, string>();
      (customerFeatures || []).forEach((cf: any) => {
        if (!cf.customers) return;
        // Filter by CSM: skip customers not assigned to the logged-in CSM
        if (csmId && cf.customers.csm_id !== csmId) return;
        customerNameMap.set(cf.customer_id, cf.customers.name);
        if (!customerFeatureMap.has(cf.customer_id)) customerFeatureMap.set(cf.customer_id, new Set());
        customerFeatureMap.get(cf.customer_id)!.add(cf.feature_id);
      });

      // Build KPI sections
      const sections: KPISection[] = [];
      for (const ind of indicators) {
        const features = featuresByInd[ind.id];
        if (!features?.length) continue;

        const featureIdSet = new Set(features.map(f => f.id));

        // Find customers who use at least one of this KPI's linked features
        const relevantCustomers: KPISection['customers'] = [];
        for (const [custId, custFeatures] of customerFeatureMap) {
          const intersection = new Set([...custFeatures].filter(fid => featureIdSet.has(fid)));
          if (intersection.size > 0) {
            relevantCustomers.push({
              id: custId,
              name: customerNameMap.get(custId) || 'Unknown',
              featureIds: intersection,
            });
          }
        }

        // Sort customers alphabetically
        relevantCustomers.sort((a, b) => a.name.localeCompare(b.name));

        const kr = krMap.get(ind.key_result_id!);
        const fo = kr ? foMap.get(kr.functional_objective_id!) : undefined;

        sections.push({
          id: ind.id,
          name: ind.name,
          current_value: ind.current_value != null ? Number(ind.current_value) : null,
          target_value: ind.target_value != null ? Number(ind.target_value) : null,
          kr_name: kr?.name || '',
          fo_name: fo?.name || '',
          features,
          customers: relevantCustomers,
        });
      }

      setKpiSections(sections);
      setOpenSections(new Set(sections.map(s => s.id))); // All expanded by default

      // Build scores map
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

  const handleCellChange = (indicatorId: string, customerId: string, featureId: string, rawValue: string) => {
    const key = cellKey(indicatorId, customerId, featureId);
    if (rawValue === '') {
      setScores(prev => ({ ...prev, [key]: null }));
      return;
    }
    const num = parseFloat(rawValue);
    if (isNaN(num)) return;
    const clamped = Math.min(100, Math.max(0, num));
    setScores(prev => ({ ...prev, [key]: clamped }));
  };

  const getCustomerAggregate = (indicatorId: string, customer: KPISection['customers'][0]): number | null => {
    const values: number[] = [];
    for (const fid of customer.featureIds) {
      const v = scores[cellKey(indicatorId, customer.id, fid)];
      if (v != null) values.push(v);
    }
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const getKPIAggregate = (section: KPISection): number | null => {
    const custAvgs: number[] = [];
    for (const cust of section.customers) {
      const avg = getCustomerAggregate(section.id, cust);
      if (avg != null) custAvgs.push(avg);
    }
    if (custAvgs.length === 0) return null;
    return custAvgs.reduce((a, b) => a + b, 0) / custAvgs.length;
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
      // Collect all cells with values
      const upserts: any[] = [];
      for (const section of kpiSections) {
        for (const cust of section.customers) {
          for (const feat of section.features) {
            if (!cust.featureIds.has(feat.id)) continue;
            const key = cellKey(section.id, cust.id, feat.id);
            const val = scores[key];
            if (val != null) {
              upserts.push({
                indicator_id: section.id,
                customer_id: cust.id,
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
        // Batch upsert in chunks of 500
        for (let i = 0; i < upserts.length; i += 500) {
          const chunk = upserts.slice(i, i + 500);
          const { error } = await supabase
            .from('csm_customer_feature_scores' as any)
            .upsert(chunk, { onConflict: 'indicator_id,customer_id,feature_id,period' });
          if (error) throw error;
        }
      }

      // Update each KPI's current_value with aggregate
      for (const section of kpiSections) {
        const agg = getKPIAggregate(section);
        if (agg === null) continue;

        const aggRounded = Math.round(agg * 100) / 100;
        const ragStatus = percentToRAG(aggRounded);

        await supabase
          .from('indicators')
          .update({ current_value: aggRounded, target_value: 100, rag_status: ragStatus })
          .eq('id', section.id);

        await supabase
          .from('indicator_history')
          .insert({
            indicator_id: section.id,
            value: aggRounded,
            period,
            notes: 'Updated via Customer x Feature Matrix',
            created_by: user.id,
          });

        await logActivity({
          action: 'update',
          entityType: 'indicator',
          entityId: section.id,
          entityName: section.name,
          oldValue: { current_value: section.current_value },
          newValue: { current_value: aggRounded },
          metadata: {
            department_id: departmentId,
            period,
            source: 'customer_feature_matrix',
            aggregate_percentage: aggRounded,
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

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (kpiSections.length === 0) {
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
    <div className="space-y-4">
      {/* Save bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {kpiSections.length} KPI{kpiSections.length !== 1 ? 's' : ''} with customer-feature grids
        </p>
        <Button onClick={handleSaveAll} disabled={saving || !hasChanges} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All
        </Button>
      </div>

      {/* KPI sections */}
      {kpiSections.map(section => (
        <KPISectionCard
          key={section.id}
          section={section}
          isOpen={openSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          scores={scores}
          onCellChange={handleCellChange}
          getCustomerAggregate={getCustomerAggregate}
          getKPIAggregate={getKPIAggregate}
          searchTerm={searchTerms[section.id] || ''}
          onSearchChange={(term) => setSearchTerms(prev => ({ ...prev, [section.id]: term }))}
        />
      ))}
    </div>
  );
}

// --- KPI Section Card ---
interface KPISectionCardProps {
  section: KPISection;
  isOpen: boolean;
  onToggle: () => void;
  scores: ScoreMap;
  onCellChange: (indicatorId: string, customerId: string, featureId: string, value: string) => void;
  getCustomerAggregate: (indicatorId: string, customer: KPISection['customers'][0]) => number | null;
  getKPIAggregate: (section: KPISection) => number | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

function KPISectionCard({
  section, isOpen, onToggle, scores, onCellChange,
  getCustomerAggregate, getKPIAggregate, searchTerm, onSearchChange,
}: KPISectionCardProps) {
  const kpiAgg = getKPIAggregate(section);
  const aggRag = kpiAgg != null ? percentToRAG(Math.round(kpiAgg)) : null;

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return section.customers;
    const lower = searchTerm.toLowerCase();
    return section.customers.filter(c => c.name.toLowerCase().includes(lower));
  }, [section.customers, searchTerm]);

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
                    {section.fo_name} → {section.kr_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {section.customers.length} customer{section.customers.length !== 1 ? 's' : ''} × {section.features.length} feature{section.features.length !== 1 ? 's' : ''}
                </span>
                {kpiAgg != null && aggRag ? (
                  <Badge className={cn(RAG_BADGE_STYLES[aggRag], 'text-xs')}>
                    {Math.round(kpiAgg)}%
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
            {/* Search filter */}
            {section.customers.length > 10 && (
              <div className="relative mb-3 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={e => onSearchChange(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            )}

            {/* Matrix table */}
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold min-w-[180px] border-r">
                      Customer
                    </th>
                    {section.features.map(f => (
                      <th key={f.id} className="px-2 py-2 text-center font-medium min-w-[100px] border-r">
                        <span className="truncate block max-w-[90px] mx-auto text-xs">{f.name}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold min-w-[80px] bg-muted/30">
                      Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={section.features.length + 2} className="text-center py-6 text-muted-foreground">
                        {searchTerm ? 'No customers match the search' : 'No customers linked to these features'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => {
                      const custAgg = getCustomerAggregate(section.id, cust);
                      const custRag = custAgg != null ? percentToRAG(Math.round(custAgg)) : null;

                      return (
                        <tr key={cust.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium text-xs border-r">
                            {cust.name}
                          </td>
                          {section.features.map(feat => {
                            const canEdit = cust.featureIds.has(feat.id);
                            const key = cellKey(section.id, cust.id, feat.id);
                            const val = scores[key];

                            if (!canEdit) {
                              return (
                                <td key={feat.id} className="px-2 py-1.5 text-center border-r">
                                  <span className="text-muted-foreground/30 text-xs">—</span>
                                </td>
                              );
                            }

                            const ragColor = val != null ? RAG_CELL_BG[percentToRAG(val)] : '';

                            return (
                              <td key={feat.id} className={cn('px-1 py-1 text-center border-r', ragColor)}>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={val ?? ''}
                                  onChange={e => onCellChange(section.id, cust.id, feat.id, e.target.value)}
                                  className="h-7 w-16 mx-auto text-center text-xs border-0 bg-transparent shadow-none focus-visible:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="—"
                                />
                              </td>
                            );
                          })}
                          {/* Customer aggregate */}
                          <td className="px-3 py-1.5 text-center bg-muted/10">
                            {custAgg != null && custRag ? (
                              <Badge className={cn(RAG_BADGE_STYLES[custRag], 'text-[10px] px-1.5 py-0.5')}>
                                {Math.round(custAgg)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
