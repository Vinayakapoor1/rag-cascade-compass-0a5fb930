import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, Activity, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceSummaryCards, type ComplianceFilter } from '@/components/compliance/ComplianceSummaryCards';
import { ComplianceCustomerTable, type CustomerRow } from '@/components/compliance/ComplianceCustomerTable';
import type { ScoreRecord } from '@/components/compliance/ComplianceCustomerDetail';
import PptxGenJS from 'pptxgenjs';
import { toast } from 'sonner';

export default function ComplianceReport() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<string>('current');
  const [cardFilter, setCardFilter] = useState<ComplianceFilter>(null);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // --- Queries ---
  const { data: csms = [], isLoading: csmsLoading, isFetching: csmsFetching, refetch: refetchCsms } = useQuery({
    queryKey: ['compliance-report-csms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('csms').select('id, name, email, user_id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customers = [], isLoading: customersLoading, isFetching: customersFetching, refetch: refetchCustomers } = useQuery({
    queryKey: ['compliance-report-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, csm_id, managed_services')
        .not('csm_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  // Customer-feature mapping
  const { data: customerFeatures = [], isLoading: cfLoading } = useQuery({
    queryKey: ['compliance-customer-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_features')
        .select('customer_id, feature_id')
        .limit(50000);
      if (error) throw error;
      return data || [];
    },
  });

  // Feature names
  const { data: features = [] } = useQuery({
    queryKey: ['compliance-features'],
    queryFn: async () => {
      const { data, error } = await supabase.from('features').select('id, name');
      if (error) throw error;
      return data || [];
    },
  });

  // Current period scores (detailed with feature_id, indicator_id, value)
  const { data: currentScores = [], isLoading: scoresLoading, isFetching: scoresFetching, dataUpdatedAt: scoresUpdatedAt, refetch: refetchScores } = useQuery({
    queryKey: ['compliance-scores-current', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('customer_id, feature_id, indicator_id, period, created_at, value, updated_at')
        .eq('period', currentPeriod)
        .limit(50000);
      if (error) throw error;
      return (data || []) as ScoreRecord[];
    },
  });

  // All-time scores (detailed)
  const { data: allTimeScores = [], isLoading: allTimeLoading, refetch: refetchAllTime } = useQuery({
    queryKey: ['compliance-scores-alltime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('customer_id, feature_id, indicator_id, period, created_at, value, updated_at')
        .limit(50000);
      if (error) throw error;
      return (data || []) as ScoreRecord[];
    },
  });

  // Indicator-feature links
  const { data: featureLinks = [], isLoading: linksLoading } = useQuery({
    queryKey: ['compliance-feature-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicator_feature_links')
        .select('indicator_id, feature_id');
      if (error) throw error;
      return data || [];
    },
  });

  // Recent activity
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['compliance-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, entity_type, entity_name, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // CSM name map
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    csms.forEach(csm => { if (csm.user_id) map[csm.user_id] = csm.name; });
    return map;
  }, [csms]);

  // Per-customer feature mapping
  const customerFeaturesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    customerFeatures.forEach(cf => {
      const list = map.get(cf.customer_id) || [];
      list.push(cf.feature_id);
      map.set(cf.customer_id, list);
    });
    return map;
  }, [customerFeatures]);

  // Feature name map
  const featureNameMap = useMemo(() => {
    return new Map(features.map(f => [f.id, f.name]));
  }, [features]);

  // Per-customer expected count: count indicator-feature links where feature is in customer's features
  const customerExpectedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [custId, featureIds] of customerFeaturesMap.entries()) {
      const featureSet = new Set(featureIds);
      const expected = featureLinks.filter(l => featureSet.has(l.feature_id)).length;
      map.set(custId, expected);
    }
    return map;
  }, [customerFeaturesMap, featureLinks]);

  // Compute previous period string
  const previousPeriod = useMemo(() => {
    const [y, m] = currentPeriod.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }, [currentPeriod]);

  // Previous period scores for trend
  const { data: prevPeriodScores = [] } = useQuery({
    queryKey: ['compliance-scores-prev', previousPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('customer_id, feature_id, indicator_id, period, created_at, value, updated_at')
        .eq('period', previousPeriod)
        .limit(50000);
      if (error) throw error;
      return (data || []) as ScoreRecord[];
    },
  });

  // Compute per-customer average score for a given set of scores
  const computeCustomerAvgs = (scores: ScoreRecord[]): Map<string, number> => {
    const map = new Map<string, { sum: number; count: number }>();
    scores.forEach(s => {
      if (s.value == null) return;
      const existing = map.get(s.customer_id);
      if (!existing) map.set(s.customer_id, { sum: Number(s.value), count: 1 });
      else { existing.sum += Number(s.value); existing.count++; }
    });
    const result = new Map<string, number>();
    map.forEach((v, k) => result.set(k, Math.round((v.sum / v.count) * 100)));
    return result;
  };

  const currentAvgs = useMemo(() => computeCustomerAvgs(currentScores), [currentScores]);
  const prevAvgs = useMemo(() => computeCustomerAvgs(prevPeriodScores), [prevPeriodScores]);
  const allTimeAvgs = useMemo(() => computeCustomerAvgs(allTimeScores), [allTimeScores]);

  // Build customer rows with trend data
  const buildRows = (scores: ScoreRecord[], avgMap: Map<string, number>, prevAvgMap: Map<string, number>): CustomerRow[] => {
    const scoresByCustomer = new Map<string, { count: number; latest: string }>();
    scores.forEach(s => {
      const existing = scoresByCustomer.get(s.customer_id);
      if (!existing) {
        scoresByCustomer.set(s.customer_id, { count: 1, latest: s.created_at });
      } else {
        existing.count++;
        if (s.created_at > existing.latest) existing.latest = s.created_at;
      }
    });

    // Last ever submission from all-time data
    const lastEver = new Map<string, string>();
    allTimeScores.forEach(s => {
      const prev = lastEver.get(s.customer_id);
      if (!prev || s.created_at > prev) lastEver.set(s.customer_id, s.created_at);
    });

    const csmMap = new Map(csms.map(c => [c.id, c]));

    return customers.map(cust => {
      const csm = csmMap.get(cust.csm_id!);
      const scoreInfo = scoresByCustomer.get(cust.id);
      const count = scoreInfo?.count || 0;
      const totalExpected = customerExpectedMap.get(cust.id) || 0;
      let status: 'complete' | 'partial' | 'pending' = 'pending';
      if (count > 0 && count >= totalExpected) status = 'complete';
      else if (count > 0) status = 'partial';

      return {
        customerId: cust.id,
        customerName: cust.name,
        csmName: csm?.name || 'Unassigned',
        csmEmail: csm?.email || null,
        scoresThisPeriod: count,
        totalExpected,
        lastEverSubmission: lastEver.get(cust.id) || null,
        status,
        currentAvg: avgMap.get(cust.id) ?? null,
        previousAvg: prevAvgMap.get(cust.id) ?? null,
        isManagedServices: cust.managed_services ?? false,
      };
    });
  };

  const currentRows = useMemo(() => buildRows(currentScores, currentAvgs, prevAvgs), [currentScores, allTimeScores, customers, csms, customerExpectedMap, currentAvgs, prevAvgs]);
  const allTimeRows = useMemo(() => buildRows(allTimeScores, allTimeAvgs, prevAvgs), [allTimeScores, customers, csms, customerExpectedMap, allTimeAvgs, prevAvgs]);

  const computeStats = (rows: CustomerRow[]) => {
    const completed = rows.filter(r => r.status !== 'pending').length;
    const pending = rows.filter(r => r.status === 'pending').length;
    const csmWithSubmissions = new Set(rows.filter(r => r.status !== 'pending').map(r => r.csmName));
    const csmWithCustomers = new Set(rows.map(r => r.csmName));
    const pendingCsmCount = [...csmWithCustomers].filter(n => !csmWithSubmissions.has(n)).length;
    const pct = rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0;
    return {
      totalCsms: csmWithCustomers.size,
      compliantCount: csmWithSubmissions.size,
      pendingCsmCount,
      completionPct: pct,
      totalCustomers: rows.length,
      completedCustomers: completed,
      pendingCustomers: pending,
      submittedCsmNames: [...csmWithSubmissions],
      pendingCsmNames: [...csmWithCustomers].filter(n => !csmWithSubmissions.has(n)),
    };
  };

  const currentStats = useMemo(() => computeStats(currentRows), [currentRows]);
  const allTimeStats = useMemo(() => computeStats(allTimeRows), [allTimeRows]);

  const isLoading = csmsLoading || scoresLoading || customersLoading || authLoading || linksLoading || allTimeLoading || cfLoading;
  const isFetching = csmsFetching || scoresFetching || customersFetching;

  const handleRefresh = () => { refetchCsms(); refetchScores(); refetchCustomers(); refetchAllTime(); };

  const handleDownload = async () => {
    try {
      const rows = tab === 'current' ? currentRows : allTimeRows;
      const scores = tab === 'current' ? currentScores : allTimeScores;
      const periodLabel = tab === 'current' ? currentPeriod : 'All Time';
      const stats = tab === 'current' ? currentStats : allTimeStats;

      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'Klarity Compliance';
      pptx.title = `CSM Compliance Report — ${periodLabel}`;

      const COLORS = {
        bg: '1A1F2C',
        card: '222738',
        text: 'FFFFFF',
        muted: '9CA3AF',
        green: '22C55E',
        amber: 'F59E0B',
        red: 'EF4444',
        primary: '8B5CF6',
        border: '374151',
      };

      // --- Slide 1: Title ---
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: COLORS.bg };
      titleSlide.addText('📋 CSM Compliance Report', {
        x: 0.8, y: 1.5, w: 11, h: 1.2,
        fontSize: 36, fontFace: 'Arial', color: COLORS.text, bold: true,
      });
      titleSlide.addText(`Period: ${periodLabel}`, {
        x: 0.8, y: 2.8, w: 11, h: 0.5,
        fontSize: 18, fontFace: 'Arial', color: COLORS.muted,
      });
      titleSlide.addText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: 0.8, y: 3.4, w: 11, h: 0.5,
        fontSize: 14, fontFace: 'Arial', color: COLORS.muted,
      });
      titleSlide.addText(
        `${stats.totalCsms} CSMs • ${stats.totalCustomers} Customers • ${stats.completionPct}% Overall Completion`,
        { x: 0.8, y: 4.2, w: 11, h: 0.5, fontSize: 14, fontFace: 'Arial', color: COLORS.primary }
      );

      // --- Group rows by CSM ---
      const csmGrouped = new Map<string, CustomerRow[]>();
      rows.forEach(r => {
        const list = csmGrouped.get(r.csmName) || [];
        list.push(r);
        csmGrouped.set(r.csmName, list);
      });

      // Build CSM summary data sorted by completion % ascending (worst first)
      const csmSummaries = [...csmGrouped.entries()].map(([csmName, csmRows]) => {
        const email = csmRows[0]?.csmEmail || '';
        const totalCustomers = csmRows.length;
        const filledTotal = csmRows.reduce((s, r) => s + r.scoresThisPeriod, 0);
        const expectedTotal = csmRows.reduce((s, r) => s + r.totalExpected, 0);
        const completionPct = expectedTotal > 0 ? Math.round((filledTotal / expectedTotal) * 100) : 0;
        const submitted = csmRows.filter(r => r.status !== 'pending').length;
        const pending = csmRows.filter(r => r.status === 'pending').length;
        const status = pending === 0 ? 'Complete' : submitted === 0 ? 'Pending' : 'Partial';
        return { csmName, email, totalCustomers, filledTotal, expectedTotal, completionPct, submitted, pending, status, csmRows };
      }).sort((a, b) => a.completionPct - b.completionPct);

      // --- Slide 2: CSM Leaderboard ---
      const leaderSlide = pptx.addSlide();
      leaderSlide.background = { color: COLORS.bg };
      leaderSlide.addText('📊 CSM Leaderboard', {
        x: 0.5, y: 0.3, w: 12, h: 0.6,
        fontSize: 28, fontFace: 'Arial', color: COLORS.text, bold: true,
      });
      leaderSlide.addText(`Ranked by completion % (lowest first) — ${csmSummaries.length} CSMs`, {
        x: 0.5, y: 0.85, w: 12, h: 0.3,
        fontSize: 11, fontFace: 'Arial', color: COLORS.muted,
      });

      const lbHeader = [
        { text: 'CSM Name', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10 } },
        { text: 'Email', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10 } },
        { text: 'Customers', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
        { text: 'Filled / Expected', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
        { text: 'Completion %', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
        { text: 'Status', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
      ];

      const LB_PAGE = 14;
      for (let page = 0; page < Math.ceil(csmSummaries.length / LB_PAGE); page++) {
        const slide = page === 0 ? leaderSlide : pptx.addSlide();
        if (page > 0) {
          slide.background = { color: COLORS.bg };
          slide.addText(`📊 CSM Leaderboard (${page + 1})`, {
            x: 0.5, y: 0.3, w: 12, h: 0.6,
            fontSize: 28, fontFace: 'Arial', color: COLORS.text, bold: true,
          });
        }
        const pageSummaries = csmSummaries.slice(page * LB_PAGE, (page + 1) * LB_PAGE);
        const lbRows: any[][] = [lbHeader];
        pageSummaries.forEach(csm => {
          const pctColor = csm.completionPct >= 80 ? COLORS.green : csm.completionPct >= 50 ? COLORS.amber : COLORS.red;
          const statusColor = csm.status === 'Complete' ? COLORS.green : csm.status === 'Partial' ? COLORS.amber : COLORS.red;
          lbRows.push([
            { text: csm.csmName, options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, bold: true } },
            { text: csm.email || '—', options: { fontSize: 9, color: COLORS.muted, fill: { color: COLORS.bg } } },
            { text: String(csm.totalCustomers), options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
            { text: `${csm.filledTotal} / ${csm.expectedTotal}`, options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
            { text: `${csm.completionPct}%`, options: { fontSize: 9, color: pctColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
            { text: csm.status, options: { fontSize: 9, color: statusColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
          ]);
        });
        slide.addTable(lbRows, {
          x: 0.3, y: page === 0 ? 1.3 : 1.0, w: 12.5,
          border: { type: 'solid', color: COLORS.border, pt: 0.5 },
          colW: [2.5, 3, 1.3, 1.8, 1.8, 1.5],
          rowH: 0.33,
        });
      }

      // --- Slides 3+: Per-CSM Detail ---
      const CSM_PAGE = 10;
      csmSummaries.forEach(csm => {
        const { csmName, email, csmRows: cRows, totalCustomers, submitted, pending, completionPct } = csm;
        const pctColor = completionPct >= 80 ? COLORS.green : completionPct >= 50 ? COLORS.amber : COLORS.red;

        // Paginate customers
        const totalPages = Math.ceil(cRows.length / CSM_PAGE);
        for (let page = 0; page < totalPages; page++) {
          const csmSlide = pptx.addSlide();
          csmSlide.background = { color: COLORS.bg };

          const pageLabel = totalPages > 1 ? ` (${page + 1}/${totalPages})` : '';
          csmSlide.addText(`👤 ${csmName}${pageLabel}`, {
            x: 0.5, y: 0.2, w: 10, h: 0.5,
            fontSize: 26, fontFace: 'Arial', color: COLORS.text, bold: true,
          });
          if (email) {
            csmSlide.addText(email, {
              x: 0.5, y: 0.65, w: 10, h: 0.3,
              fontSize: 11, fontFace: 'Arial', color: COLORS.muted,
            });
          }

          // Stats row (only on first page)
          if (page === 0) {
            const csmStatItems = [
              { label: 'Customers', value: String(totalCustomers), color: COLORS.text },
              { label: 'Submitted', value: String(submitted), color: COLORS.green },
              { label: 'Pending', value: String(pending), color: COLORS.red },
              { label: 'Completion', value: `${completionPct}%`, color: pctColor },
            ];
            csmStatItems.forEach((item, i) => {
              const x = 0.5 + i * 3.1;
              csmSlide.addShape(pptx.ShapeType.roundRect, {
                x, y: 1.0, w: 2.8, h: 0.85,
                fill: { color: COLORS.card },
                line: { color: COLORS.border, width: 1 },
                rectRadius: 0.08,
              });
              csmSlide.addText(item.value, {
                x, y: 1.0, w: 2.8, h: 0.48,
                fontSize: 22, fontFace: 'Arial', color: item.color, bold: true, align: 'center',
              });
              csmSlide.addText(item.label, {
                x, y: 1.45, w: 2.8, h: 0.3,
                fontSize: 10, fontFace: 'Arial', color: COLORS.muted, align: 'center',
              });
            });
          }

          const tableY = page === 0 ? 2.05 : 1.1;
          const pageRows = cRows.slice(page * CSM_PAGE, (page + 1) * CSM_PAGE);

          // Customer table
          const csmTableHeader = [
            { text: 'Customer', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10 } },
            { text: 'Inclusion', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
            { text: 'Filled / Expected', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
            { text: 'Completion %', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
            { text: 'Status', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          ];
          const csmTableRows: any[][] = [csmTableHeader];
          pageRows.forEach(r => {
            const custPct = r.totalExpected > 0 ? Math.round((r.scoresThisPeriod / r.totalExpected) * 100) : 0;
            const statusColor = r.status === 'complete' ? COLORS.green : r.status === 'partial' ? COLORS.amber : COLORS.red;
            const statusLabel = r.status === 'complete' ? 'Submitted' : r.status === 'partial' ? 'Partial' : 'Pending';
            csmTableRows.push([
              { text: r.customerName, options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg } } },
              { text: r.isManagedServices ? 'Content Management' : 'CSM', options: { fontSize: 9, color: COLORS.muted, fill: { color: COLORS.bg }, align: 'center' } },
              { text: `${r.scoresThisPeriod} / ${r.totalExpected}`, options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
              { text: `${custPct}%`, options: { fontSize: 9, color: statusColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
              { text: statusLabel, options: { fontSize: 9, color: statusColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
            ]);
          });
          csmSlide.addTable(csmTableRows, {
            x: 0.3, y: tableY, w: 12.5,
            border: { type: 'solid', color: COLORS.border, pt: 0.5 },
            colW: [3, 2, 2.5, 2.5, 2],
            rowH: 0.32,
          });

          // "Not Filled" section — only on last page
          if (page === totalPages - 1) {
            const missingCustomers = cRows.filter(r => r.status !== 'complete');
            if (missingCustomers.length > 0) {
              const missingY = tableY + (pageRows.length + 1) * 0.32 + 0.3;
              csmSlide.addText('⚠️ Not Filled:', {
                x: 0.5, y: missingY, w: 12, h: 0.35,
                fontSize: 12, fontFace: 'Arial', color: COLORS.amber, bold: true,
              });
              const missingLines = missingCustomers.map(r => {
                const gap = r.totalExpected - r.scoresThisPeriod;
                return `• ${r.customerName} — ${r.scoresThisPeriod}/${r.totalExpected} filled, missing ${gap} indicator${gap !== 1 ? 's' : ''}`;
              });
              csmSlide.addText(missingLines.join('\n'), {
                x: 0.5, y: missingY + 0.35, w: 12, h: Math.min(missingLines.length * 0.22 + 0.2, 2.5),
                fontSize: 9, fontFace: 'Arial', color: COLORS.muted, valign: 'top',
              });
            }
          }
        }
      });

      await pptx.writeFile({ fileName: `CSM_Compliance_Report_${periodLabel.replace(/\s/g, '_')}.pptx` });
      toast.success('PowerPoint report downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    }
  };

  const lastUpdatedLabel = useMemo(() => {
    if (!scoresUpdatedAt) return null;
    return formatDistanceToNow(new Date(scoresUpdatedAt), { addSuffix: true });
  }, [scoresUpdatedAt]);

  const deadlineLabel = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = (5 - day + 7) % 7;
    if (diff === 0) return 'Today (Friday) 11:30 PM';
    if (diff === 1) return 'Tomorrow 11:30 PM';
    return `Friday 11:30 PM (in ${diff} days)`;
  }, []);

  if (!authLoading && (!user || !isAdmin)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">📋 Compliance Report</h1>
          <p className="text-sm text-muted-foreground">
            Period: {currentPeriod} • Deadline: {deadlineLabel}
            {lastUpdatedLabel && ` • Updated ${lastUpdatedLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={handleDownload} disabled={isLoading} title="Download Excel report">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="current">Current Period</TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6 mt-4">
            <ComplianceSummaryCards
              totalCsms={currentStats.totalCsms}
              compliantCount={currentStats.compliantCount}
              pendingCount={currentStats.pendingCsmCount}
              completionPct={currentStats.completionPct}
              totalCustomers={currentStats.totalCustomers}
              completedCustomers={currentStats.completedCustomers}
              pendingCustomers={currentStats.pendingCustomers}
              activeFilter={cardFilter}
              onFilterChange={setCardFilter}
              csmNames={{ submitted: currentStats.submittedCsmNames, pending: currentStats.pendingCsmNames }}
            />
            <ComplianceCustomerTable
              rows={currentRows}
              periodLabel={currentPeriod}
              customerFeaturesMap={customerFeaturesMap}
              featureNameMap={featureNameMap}
              indicatorFeatureLinks={featureLinks}
              detailedScores={currentScores}
              period={currentPeriod}
              externalFilter={cardFilter}
            />
          </TabsContent>

          <TabsContent value="alltime" className="space-y-6 mt-4">
            <ComplianceSummaryCards
              totalCsms={allTimeStats.totalCsms}
              compliantCount={allTimeStats.compliantCount}
              pendingCount={allTimeStats.pendingCsmCount}
              completionPct={allTimeStats.completionPct}
              totalCustomers={allTimeStats.totalCustomers}
              completedCustomers={allTimeStats.completedCustomers}
              pendingCustomers={allTimeStats.pendingCustomers}
              activeFilter={cardFilter}
              onFilterChange={setCardFilter}
              csmNames={{ submitted: allTimeStats.submittedCsmNames, pending: allTimeStats.pendingCsmNames }}
            />
            <ComplianceCustomerTable
              rows={allTimeRows}
              periodLabel="All Time"
              customerFeaturesMap={customerFeaturesMap}
              featureNameMap={featureNameMap}
              indicatorFeatureLinks={featureLinks}
              detailedScores={allTimeScores}
              period="all"
              externalFilter={cardFilter}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="font-medium text-sm">
                      {a.user_id && userNameMap[a.user_id] ? userNameMap[a.user_id] : 'Unknown user'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium capitalize">{a.action}</span> {a.entity_type}
                      {a.entity_name && `: ${a.entity_name}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-3">
                    {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
