import { useLatestHealthSummary } from '@/hooks/useCustomerHealthMetrics';
import { RAGBadge } from '@/components/RAGBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, Shield, Handshake, FileCheck, Loader2 } from 'lucide-react';

const DIMENSION_ICONS: Record<string, React.ReactNode> = {
  'Bug Count': <Bug className="h-4 w-4" />,
  'Bug SLA': <Shield className="h-4 w-4" />,
  'Promises': <Handshake className="h-4 w-4" />,
  'NFR Compliance': <FileCheck className="h-4 w-4" />,
};

interface Props {
  customerId: string;
}

export function CustomerHealthMetricsCard({ customerId }: Props) {
  const { data: summary, isLoading } = useLatestHealthSummary(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.dimensions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Operational Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No operational health data recorded yet. Add bug, promise, and NFR metrics to see health scores.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Operational Health
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{summary.period}</Badge>
            <RAGBadge status={summary.compositeRAG} size="md" showLabel />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summary.dimensions.map((dim) => (
            <div
              key={dim.label}
              className="flex flex-col gap-1.5 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                {DIMENSION_ICONS[dim.label] ?? <Shield className="h-4 w-4" />}
                <span className="text-xs font-medium">{dim.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <RAGBadge status={dim.rag} size="sm" />
                <span className="text-sm font-semibold">{dim.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
