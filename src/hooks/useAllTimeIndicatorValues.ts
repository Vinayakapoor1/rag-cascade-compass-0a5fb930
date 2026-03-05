import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ScoreRow {
  indicator_id: string;
  customer_id: string;
  feature_id: string;
  value: number | null;
  period: string;
}

/**
 * Fetches all csm_customer_feature_scores and computes an "All Time" aggregate
 * value per indicator. Uses the same logic as the Indicator Derivation Dialog:
 * - Take the latest score per unique customer+feature combination
 * - Average across all customer scores per indicator
 * - Scale to percentage (value is already 0-100 from RAG bands)
 *
 * Returns a Map<indicatorId, allTimeValue> where allTimeValue is
 * intended to replace current_value when "All Time" mode is active.
 */
export function useAllTimeIndicatorValues() {
  return useQuery({
    queryKey: ['all-time-indicator-values'],
    queryFn: async () => {
      // Fetch all scores with a high limit
      const { data, error } = await supabase
        .from('csm_customer_feature_scores')
        .select('indicator_id, customer_id, feature_id, value, period')
        .order('period', { ascending: true })
        .limit(50000);

      if (error) throw error;
      if (!data || data.length === 0) return new Map<string, number>();

      // Group by indicator
      const byIndicator = new Map<string, ScoreRow[]>();
      for (const row of data) {
        if (row.value === null) continue;
        const arr = byIndicator.get(row.indicator_id) || [];
        arr.push(row as ScoreRow);
        byIndicator.set(row.indicator_id, arr);
      }

      const result = new Map<string, number>();

      for (const [indicatorId, scores] of byIndicator) {
        // Latest score per customer+feature combo (scores are sorted by period asc)
        const latestMap = new Map<string, number>();
        for (const s of scores) {
          if (s.value !== null) {
            latestMap.set(`${s.customer_id}::${s.feature_id}`, s.value);
          }
        }

        if (latestMap.size === 0) continue;

        // Average across all latest values
        const values = Array.from(latestMap.values());
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

        // The value from csm_customer_feature_scores is a RAG numeric (e.g. 0-100 scale)
        // Store as-is — it represents the aggregate score for this indicator
        result.set(indicatorId, avg);
      }

      return result;
    },
    staleTime: 30_000,
  });
}
