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

      // --- Slide 2: Summary Stats ---
      const summarySlide = pptx.addSlide();
      summarySlide.background = { color: COLORS.bg };
      summarySlide.addText('Summary', {
        x: 0.5, y: 0.3, w: 12, h: 0.6,
        fontSize: 28, fontFace: 'Arial', color: COLORS.text, bold: true,
      });

      const statItems = [
        { label: 'Total CSMs', value: String(stats.totalCsms), color: COLORS.text },
        { label: 'CSMs Submitted', value: String(stats.compliantCount), color: COLORS.green },
        { label: 'CSMs Pending', value: String(stats.pendingCsmCount), color: COLORS.red },
        { label: 'Completion', value: `${stats.completionPct}%`, color: COLORS.primary },
        { label: 'Customers', value: String(stats.totalCustomers), color: COLORS.text },
        { label: 'Completed', value: String(stats.completedCustomers), color: COLORS.green },
        { label: 'Pending', value: String(stats.pendingCustomers), color: COLORS.red },
      ];
      statItems.forEach((item, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 0.5 + col * 3.1;
        const y = 1.2 + row * 1.8;
        summarySlide.addShape(pptx.ShapeType.roundRect, {
          x, y, w: 2.8, h: 1.4,
          fill: { color: COLORS.card },
          line: { color: COLORS.border, width: 1 },
          rectRadius: 0.1,
        });
        summarySlide.addText(item.value, {
          x, y: y + 0.15, w: 2.8, h: 0.7,
          fontSize: 32, fontFace: 'Arial', color: item.color, bold: true, align: 'center',
        });
        summarySlide.addText(item.label, {
          x, y: y + 0.8, w: 2.8, h: 0.4,
          fontSize: 12, fontFace: 'Arial', color: COLORS.muted, align: 'center',
        });
      });

      // --- Slide 3: Customer Overview Table ---
      const overviewSlide = pptx.addSlide();
      overviewSlide.background = { color: COLORS.bg };
      overviewSlide.addText('Customer Overview', {
        x: 0.5, y: 0.3, w: 12, h: 0.6,
        fontSize: 24, fontFace: 'Arial', color: COLORS.text, bold: true,
      });

      const tableHeader = [
        { text: 'Customer', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10 } },
        { text: 'CSM', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10 } },
        { text: 'Filled', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
        { text: 'Expected', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
        { text: 'Rate', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
        { text: 'Last Check-in', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10 } },
        { text: 'Status', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
      ];

      // Split into pages of 12 rows
      const PAGE_SIZE = 12;
      for (let page = 0; page < Math.ceil(rows.length / PAGE_SIZE); page++) {
        const slide = page === 0 ? overviewSlide : pptx.addSlide();
        if (page > 0) {
          slide.background = { color: COLORS.bg };
          slide.addText(`Customer Overview (${page + 1})`, {
            x: 0.5, y: 0.3, w: 12, h: 0.6,
            fontSize: 24, fontFace: 'Arial', color: COLORS.text, bold: true,
          });
        }
        const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        const tableRows: any[][] = [tableHeader];
        pageRows.forEach(r => {
          const rate = r.totalExpected > 0 ? Math.round((r.scoresThisPeriod / r.totalExpected) * 100) : 0;
          const statusColor = r.status === 'complete' ? COLORS.green : r.status === 'partial' ? COLORS.amber : COLORS.red;
          const statusLabel = r.status === 'complete' ? 'Submitted' : r.status === 'partial' ? 'Partial' : 'Pending';
          tableRows.push([
            { text: r.customerName, options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg } } },
            { text: r.csmName, options: { fontSize: 9, color: COLORS.muted, fill: { color: COLORS.bg } } },
            { text: String(r.scoresThisPeriod), options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
            { text: String(r.totalExpected), options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
            { text: `${rate}%`, options: { fontSize: 9, color: statusColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
            { text: r.lastEverSubmission ? new Date(r.lastEverSubmission).toLocaleDateString() : 'Never', options: { fontSize: 9, color: COLORS.muted, fill: { color: COLORS.bg } } },
            { text: statusLabel, options: { fontSize: 9, color: statusColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
          ]);
        });
        slide.addTable(tableRows, {
          x: 0.3, y: 1.0, w: 12.5,
          border: { type: 'solid', color: COLORS.border, pt: 0.5 },
          colW: [2.5, 2, 1.2, 1.2, 1, 2.2, 1.2],
          rowH: 0.35,
        });
      }

      // --- Per-CSM Breakdown Slides ---
      const csmGrouped = new Map<string, CustomerRow[]>();
      rows.forEach(r => {
        const list = csmGrouped.get(r.csmName) || [];
        list.push(r);
        csmGrouped.set(r.csmName, list);
      });

      csmGrouped.forEach((csmRows, csmName) => {
        const csmSlide = pptx.addSlide();
        csmSlide.background = { color: COLORS.bg };

        const csmEmail = csmRows[0]?.csmEmail || '';
        const csmCompleted = csmRows.filter(r => r.status !== 'pending').length;
        const csmPending = csmRows.filter(r => r.status === 'pending').length;
        const csmPct = csmRows.length > 0 ? Math.round((csmCompleted / csmRows.length) * 100) : 0;
        const csmPctColor = csmPct >= 80 ? COLORS.green : csmPct >= 50 ? COLORS.amber : COLORS.red;

        csmSlide.addText(`👤 ${csmName}`, {
          x: 0.5, y: 0.2, w: 10, h: 0.5,
          fontSize: 26, fontFace: 'Arial', color: COLORS.text, bold: true,
        });
        if (csmEmail) {
          csmSlide.addText(csmEmail, {
            x: 0.5, y: 0.7, w: 10, h: 0.3,
            fontSize: 11, fontFace: 'Arial', color: COLORS.muted,
          });
        }

        // CSM stats
        const csmStatItems = [
          { label: 'Customers', value: String(csmRows.length), color: COLORS.text },
          { label: 'Submitted', value: String(csmCompleted), color: COLORS.green },
          { label: 'Pending', value: String(csmPending), color: COLORS.red },
          { label: 'Completion', value: `${csmPct}%`, color: csmPctColor },
        ];
        csmStatItems.forEach((item, i) => {
          const x = 0.5 + i * 3.1;
          csmSlide.addShape(pptx.ShapeType.roundRect, {
            x, y: 1.1, w: 2.8, h: 0.9,
            fill: { color: COLORS.card },
            line: { color: COLORS.border, width: 1 },
            rectRadius: 0.08,
          });
          csmSlide.addText(item.value, {
            x, y: 1.1, w: 2.8, h: 0.5,
            fontSize: 22, fontFace: 'Arial', color: item.color, bold: true, align: 'center',
          });
          csmSlide.addText(item.label, {
            x, y: 1.55, w: 2.8, h: 0.35,
            fontSize: 10, fontFace: 'Arial', color: COLORS.muted, align: 'center',
          });
        });

        // Customer table for this CSM
        const csmTableHeader = [
          { text: 'Customer', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10 } },
          { text: 'Type', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Filled', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Expected', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Prev %', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Current %', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Trend', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Status', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
        ];
        const csmTableRows: any[][] = [csmTableHeader];
        csmRows.forEach(r => {
          const statusColor = r.status === 'complete' ? COLORS.green : r.status === 'partial' ? COLORS.amber : COLORS.red;
          const statusLabel = r.status === 'complete' ? 'Submitted' : r.status === 'partial' ? 'Partial' : 'Pending';
          const prevStr = r.previousAvg != null ? `${r.previousAvg}%` : '—';
          const currStr = r.currentAvg != null ? `${r.currentAvg}%` : '—';
          let trendStr = '—';
          let trendColor = COLORS.muted;
          if (r.previousAvg != null && r.currentAvg != null) {
            const diff = r.currentAvg - r.previousAvg;
            trendStr = diff > 0 ? `▲ +${diff}` : diff < 0 ? `▼ ${diff}` : '— 0';
            trendColor = diff > 0 ? COLORS.green : diff < 0 ? COLORS.red : COLORS.muted;
          }
          csmTableRows.push([
            { text: r.customerName, options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg } } },
            { text: r.isManagedServices ? 'CM' : 'CSM', options: { fontSize: 9, color: COLORS.muted, fill: { color: COLORS.bg }, align: 'center' } },
            { text: String(r.scoresThisPeriod), options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
            { text: String(r.totalExpected), options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
            { text: prevStr, options: { fontSize: 9, color: COLORS.muted, fill: { color: COLORS.bg }, align: 'center' } },
            { text: currStr, options: { fontSize: 9, color: statusColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
            { text: trendStr, options: { fontSize: 9, color: trendColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
            { text: statusLabel, options: { fontSize: 9, color: statusColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
          ]);
        });
        csmSlide.addTable(csmTableRows, {
          x: 0.3, y: 2.2, w: 12.5,
          border: { type: 'solid', color: COLORS.border, pt: 0.5 },
          colW: [3, 0.8, 1, 1, 1.3, 1.3, 1.3, 1.3],
          rowH: 0.32,
        });
      });

      // --- Per-Customer Detail Slides ---
      rows.forEach(r => {
        const custFeatureIds = customerFeaturesMap.get(r.customerId) || [];
        if (custFeatureIds.length === 0) return;

        const slide = pptx.addSlide();
        slide.background = { color: COLORS.bg };

        const rate = r.totalExpected > 0 ? Math.round((r.scoresThisPeriod / r.totalExpected) * 100) : 0;
        const statusColor = r.status === 'complete' ? COLORS.green : r.status === 'partial' ? COLORS.amber : COLORS.red;
        const statusLabel = r.status === 'complete' ? 'Submitted' : r.status === 'partial' ? 'Partial' : 'Pending';

        slide.addText(r.customerName, {
          x: 0.5, y: 0.25, w: 8, h: 0.5,
          fontSize: 24, fontFace: 'Arial', color: COLORS.text, bold: true,
        });
        slide.addText(`CSM: ${r.csmName}${r.csmEmail ? ` (${r.csmEmail})` : ''}`, {
          x: 0.5, y: 0.75, w: 8, h: 0.35,
          fontSize: 12, fontFace: 'Arial', color: COLORS.muted,
        });

        const custStats = [
          { label: 'Completion', value: `${rate}%`, color: statusColor },
          { label: 'Filled', value: `${r.scoresThisPeriod}/${r.totalExpected}`, color: COLORS.text },
          { label: 'Status', value: statusLabel, color: statusColor },
          { label: 'Trend', value: r.previousAvg != null && r.currentAvg != null ? `${r.previousAvg}% → ${r.currentAvg}%` : r.currentAvg != null ? `${r.currentAvg}%` : '—', color: r.currentAvg != null && r.previousAvg != null && r.currentAvg > r.previousAvg ? COLORS.green : r.currentAvg != null && r.previousAvg != null && r.currentAvg < r.previousAvg ? COLORS.red : COLORS.muted },
        ];
        custStats.forEach((s, i) => {
          const x = 0.5 + i * 3.1;
          slide.addShape(pptx.ShapeType.roundRect, {
            x, y: 1.2, w: 2.8, h: 0.9,
            fill: { color: COLORS.card },
            line: { color: COLORS.border, width: 1 },
            rectRadius: 0.08,
          });
          slide.addText(s.value, {
            x, y: 1.2, w: 2.8, h: 0.5,
            fontSize: 18, fontFace: 'Arial', color: s.color, bold: true, align: 'center',
          });
          slide.addText(s.label, {
            x, y: 1.65, w: 2.8, h: 0.35,
            fontSize: 10, fontFace: 'Arial', color: COLORS.muted, align: 'center',
          });
        });

        const featureHeader = [
          { text: 'Feature', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10 } },
          { text: 'Filled', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Expected', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Rate', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
          { text: 'Status', options: { bold: true, color: COLORS.text, fill: { color: COLORS.card }, fontSize: 10, align: 'center' as const } },
        ];

        const featureRows: any[][] = [featureHeader];
        custFeatureIds.forEach(fid => {
          const fname = featureNameMap.get(fid) || 'Unknown';
          const expectedIndicators = featureLinks.filter(l => l.feature_id === fid).map(l => l.indicator_id);
          const filledSet = new Set(
            scores
              .filter(s => s.customer_id === r.customerId && s.feature_id === fid)
              .map(s => s.indicator_id)
          );
          const filledCount = expectedIndicators.filter(id => filledSet.has(id)).length;
          const fRate = expectedIndicators.length > 0 ? Math.round((filledCount / expectedIndicators.length) * 100) : 0;
          const fStatus = filledCount >= expectedIndicators.length && expectedIndicators.length > 0
            ? 'Filled' : filledCount > 0 ? 'Partial' : 'Pending';
          const fColor = fStatus === 'Filled' ? COLORS.green : fStatus === 'Partial' ? COLORS.amber : COLORS.red;

          featureRows.push([
            { text: fname, options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg } } },
            { text: String(filledCount), options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
            { text: String(expectedIndicators.length), options: { fontSize: 9, color: COLORS.text, fill: { color: COLORS.bg }, align: 'center' } },
            { text: `${fRate}%`, options: { fontSize: 9, color: fColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
            { text: fStatus, options: { fontSize: 9, color: fColor, fill: { color: COLORS.bg }, align: 'center', bold: true } },
          ]);
        });

        slide.addTable(featureRows, {
          x: 0.3, y: 2.3, w: 12.5,
          border: { type: 'solid', color: COLORS.border, pt: 0.5 },
          colW: [5, 1.8, 1.8, 1.8, 1.8],
          rowH: 0.32,
        });
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
