import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ScoreRecord {
  customer_id: string;
  feature_id: string;
  indicator_id: string;
  created_at: string;
  period: string;
  value?: number | null;
  updated_at?: string;
}

interface FeatureLink {
  indicator_id: string;
  feature_id: string;
}

interface FeatureInfo {
  id: string;
  name: string;
}

interface ComplianceCustomerDetailProps {
  customerId: string;
  customerFeatureIds: string[];
  featureMap: Map<string, string>; // feature_id -> feature_name
  indicatorFeatureLinks: FeatureLink[];
  scores: ScoreRecord[];
  period: string;
}

export function ComplianceCustomerDetail({
  customerId,
  customerFeatureIds,
  featureMap,
  indicatorFeatureLinks,
  scores,
  period,
}: ComplianceCustomerDetailProps) {
  const featureBreakdown = useMemo(() => {
    return customerFeatureIds.map(featureId => {
      const featureName = featureMap.get(featureId) || 'Unknown Feature';
      
      // Expected: indicators linked to this feature
      const expectedIndicators = indicatorFeatureLinks
        .filter(l => l.feature_id === featureId)
        .map(l => l.indicator_id);
      
      // Filled: scores for this customer + feature + period
      const filledScores = scores.filter(
        s => s.customer_id === customerId && s.feature_id === featureId
      );
      const filledIndicatorIds = new Set(filledScores.map(s => s.indicator_id));
      
      const filledCount = expectedIndicators.filter(id => filledIndicatorIds.has(id)).length;
      const expectedCount = expectedIndicators.length;
      
      // Last submission for this feature
      const featureScores = filledScores.filter(s => expectedIndicators.includes(s.indicator_id));
      const lastSubmission = featureScores.length > 0
        ? featureScores.reduce((latest, s) => s.created_at > latest ? s.created_at : latest, featureScores[0].created_at)
        : null;
      
      const status = filledCount >= expectedCount && expectedCount > 0
        ? 'complete'
        : filledCount > 0
          ? 'partial'
          : 'pending';
      
      return {
        featureId,
        featureName,
        expectedCount,
        filledCount,
        lastSubmission,
        status,
      };
    }).sort((a, b) => {
      const order = { pending: 0, partial: 1, complete: 2 };
      return order[a.status] - order[b.status];
    });
  }, [customerId, customerFeatureIds, featureMap, indicatorFeatureLinks, scores]);

  if (featureBreakdown.length === 0) {
    return (
      <div className="px-6 py-3 text-sm text-muted-foreground italic">
        No features mapped for this customer.
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <div className="rounded-md border border-border/50 bg-muted/20">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs h-8">Feature</TableHead>
              <TableHead className="text-xs h-8 text-center">Indicators Filled</TableHead>
              <TableHead className="text-xs h-8">Last Submission</TableHead>
              <TableHead className="text-xs h-8 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureBreakdown.map(f => (
              <TableRow key={f.featureId} className="hover:bg-muted/30">
                <TableCell className="text-xs py-2 font-medium">{f.featureName}</TableCell>
                <TableCell className="text-xs py-2 text-center font-mono">
                  {f.filledCount}/{f.expectedCount}
                </TableCell>
                <TableCell className="text-xs py-2 text-muted-foreground">
                  {f.lastSubmission
                    ? formatDistanceToNow(new Date(f.lastSubmission), { addSuffix: true })
                    : 'Never'}
                </TableCell>
                <TableCell className="text-xs py-2 text-center">
                  {f.status === 'complete' && (
                    <Badge className="bg-rag-green/15 text-rag-green border-rag-green/30 text-[9px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Filled
                    </Badge>
                  )}
                  {f.status === 'partial' && (
                    <Badge className="bg-rag-amber/15 text-rag-amber border-rag-amber/30 text-[9px] gap-1">
                      <Clock className="h-3 w-3" /> Partial
                    </Badge>
                  )}
                  {f.status === 'pending' && (
                    <Badge variant="destructive" className="text-[9px] gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
