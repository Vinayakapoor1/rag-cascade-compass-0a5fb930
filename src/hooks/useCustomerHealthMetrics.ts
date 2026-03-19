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

// --- RAG helpers (all weight-based: 1=green, 0.5=amber, 0=red) ---

function weightToRAGStatus(w: number): RAGStatus {
  if (w >= 1) return 'green';
  if (w >= 0.5) return 'amber';
  return 'red';
}

function weightToScore(w: number): number {
  if (w >= 1) return 100;
  if (w >= 0.5) return 60;
  return 30;
}

function bugCountLabel(w: number): string {
  if (w >= 1) return '< 5';
  if (w >= 0.5) return '5 – 10';
  return '> 10';
}

function pctLabel(w: number): string {
  if (w >= 1) return '76 – 100%';
  if (w >= 0.5) return '51 – 75%';
  return '0 – 50%';
}

// Keep exported for backward compat
export function bugCountRAG(w: number): RAGStatus {
  return weightToRAGStatus(w);
}

export function pctRAG(pct: number): RAGStatus {
  if (pct >= 76) return 'green';
  if (pct >= 51) return 'amber';
  return 'red';
}

export function buildHealthSummary(row: HealthMetricRow): CustomerHealthSummary {
  const dimensions: HealthDimension[] = [];
  const scores: number[] = [];

  if (row.bug_count != null) {
    const s = weightToScore(row.bug_count);
    scores.push(s);
    dimensions.push({ label: 'Bug Count', value: bugCountLabel(row.bug_count), rag: weightToRAGStatus(row.bug_count), score: s });
  }

  if (row.bug_sla_compliance != null) {
    const s = weightToScore(row.bug_sla_compliance);
    scores.push(s);
    dimensions.push({ label: 'Bug SLA', value: pctLabel(row.bug_sla_compliance), rag: weightToRAGStatus(row.bug_sla_compliance), score: s });
  }

  if (row.promises_made != null) {
    const s = weightToScore(row.promises_made);
    scores.push(s);
    dimensions.push({ label: 'Promises Made vs Kept', value: pctLabel(row.promises_made), rag: weightToRAGStatus(row.promises_made), score: s });
  }

  if (row.new_feature_requests != null) {
    const s = weightToScore(row.new_feature_requests);
    scores.push(s);
    dimensions.push({ label: 'NFR SLA', value: pctLabel(row.new_feature_requests), rag: weightToRAGStatus(row.new_feature_requests), score: s });
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
      return (data as unknown as HealthMetricRow[]) || [];
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
