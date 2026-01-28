import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge } from 'lucide-react';

interface RAGMatrixCardProps {
  compact?: boolean;
}

export function RAGMatrixCard({ compact = false }: RAGMatrixCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">Universal RAG:</span>
        <Badge className="bg-rag-red-muted text-rag-red">1-50% Red</Badge>
        <Badge className="bg-rag-amber-muted text-rag-amber">51-75% Amber</Badge>
        <Badge className="bg-rag-green-muted text-rag-green">76-100% Green</Badge>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Universal RAG Calculation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-rag-red/10 border border-rag-red/30">
            <div className="text-2xl font-bold text-rag-red">1 - 50%</div>
            <div className="text-sm font-medium text-rag-red mt-1">RED</div>
            <div className="text-xs text-muted-foreground mt-1">Critical</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-rag-amber/10 border border-rag-amber/30">
            <div className="text-2xl font-bold text-rag-amber">51 - 75%</div>
            <div className="text-sm font-medium text-rag-amber mt-1">AMBER</div>
            <div className="text-xs text-muted-foreground mt-1">At Risk</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-rag-green/10 border border-rag-green/30">
            <div className="text-2xl font-bold text-rag-green">76 - 100%</div>
            <div className="text-sm font-medium text-rag-green mt-1">GREEN</div>
            <div className="text-xs text-muted-foreground mt-1">On Track</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Formula: (Current Value / Target Value) × 100 — Applied to all indicators
        </p>
      </CardContent>
    </Card>
  );
}
