import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RAGStatus } from '@/types/venture';

export interface HealthMetricRow {
  id: string;
  customer_id: string;
  period: string;
  bug_count: number | null;
  bug_sla_compliance: number | null;
  promises_made: number | null;
  promises_delivered: number | null;
  new_feature_requests: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthDimension {
  label: string;
  value: string;
  rag: RAGStatus;
  score: number; // 0-100
}

export interface CustomerHealthSummary {
  period: string;
  dimensions: HealthDimension[];
  compositeScore: number;
  compositeRAG: RAGStatus;
  raw: HealthMetricRow;
}

// --- RAG helpers ---

export function bugCountRAG(count: number): RAGStatus {
  if (count < 5) return 'green';
  if (count <= 10) return 'amber';
  return 'red';
}

function bugCountScore(count: number): number {
  if (count < 5) return 100;
  if (count <= 10) return 60;
  return 30;
}

export function pctRAG(pct: number): RAGStatus {
  if (pct >= 76) return 'green';
  if (pct >= 51) return 'amber';
  return 'red';
}

function pctScore(pct: number): number {
  if (pct >= 76) return 100;
  if (pct >= 51) return 60;
  return 30;
}

export function buildHealthSummary(row: HealthMetricRow): CustomerHealthSummary {
  const dimensions: HealthDimension[] = [];
  const scores: number[] = [];

  if (row.bug_count != null) {
    const s = bugCountScore(row.bug_count);
    scores.push(s);
    dimensions.push({ label: 'Bug Count', value: `${row.bug_count}`, rag: bugCountRAG(row.bug_count), score: s });
  }

  if (row.bug_sla_compliance != null) {
    const s = pctScore(row.bug_sla_compliance);
    scores.push(s);
    dimensions.push({ label: 'Bug SLA', value: `${row.bug_sla_compliance}%`, rag: pctRAG(row.bug_sla_compliance), score: s });
  }

  if (row.promises_made != null && row.promises_delivered != null && row.promises_made > 0) {
    const pct = Math.round((row.promises_delivered / row.promises_made) * 100);
    const s = pctScore(pct);
    scores.push(s);
    dimensions.push({ label: 'Promises', value: `${row.promises_delivered}/${row.promises_made} (${pct}%)`, rag: pctRAG(pct), score: s });
  }

  if (row.new_feature_requests != null) {
    const s = bugCountScore(row.new_feature_requests);
    scores.push(s);
    dimensions.push({ label: 'Feature Requests', value: `${row.new_feature_requests}`, rag: bugCountRAG(row.new_feature_requests), score: s });
  }

  const compositeScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const compositeRAG: RAGStatus = scores.length === 0 ? 'not-set' : pctRAG(compositeScore);

  return { period: row.period, dimensions, compositeScore, compositeRAG, raw: row };
}

// --- Hooks ---

export function useCustomerHealthMetrics(customerId: string) {
  return useQuery({
    queryKey: ['customer-health-metrics', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_health_metrics')
        .select('*')
        .eq('customer_id', customerId)
        .order('period', { ascending: false });
      if (error) throw error;
      return (data as HealthMetricRow[]) || [];
    },
    enabled: !!customerId,
  });
}

export function useLatestHealthSummary(customerId: string) {
  const { data: metrics, ...rest } = useCustomerHealthMetrics(customerId);
  const latest = metrics && metrics.length > 0 ? buildHealthSummary(metrics[0]) : null;
  return { data: latest, metrics, ...rest };
}

export function useUpsertHealthMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      period: string;
      bug_count?: number | null;
      bug_sla_compliance?: number | null;
      promises_made?: number | null;
      promises_delivered?: number | null;
      new_feature_requests?: number | null;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('customer_health_metrics')
        .upsert({
          ...input,
          created_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'customer_id,period' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-health-metrics', variables.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['customer-impact'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-impact'] });
    },
  });
}
