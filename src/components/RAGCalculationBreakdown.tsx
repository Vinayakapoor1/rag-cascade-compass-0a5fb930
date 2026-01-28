import { cn } from '@/lib/utils';
import { getRAGColor, getRAGBorderColor, scoreToRAG, getRAGLabel } from '@/lib/ragUtils';
import { RAGStatus } from '@/types/venture';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Calculator } from 'lucide-react';

interface BreakdownItem {
  name: string;
  score: number;
  weight?: number;
}

interface RAGCalculationBreakdownProps {
  title: string;
  items: BreakdownItem[];
  finalScore: number;
  finalStatus: RAGStatus;
  showWeights?: boolean;
}

export function RAGCalculationBreakdown({
  title,
  items,
  finalScore,
  finalStatus,
  showWeights = false
}: RAGCalculationBreakdownProps) {
  return (
    <Card className={cn('border-l-4', getRAGBorderColor(finalStatus))}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Individual components */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const itemStatus = scoreToRAG(item.score);
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name}
                    {showWeights && item.weight && (
                      <span className="text-xs ml-1">({item.weight}%)</span>
                    )}
                  </span>
                  <span className="font-medium flex items-center gap-2">
                    {item.score}%
                    <div className={cn('w-3 h-3 rounded-full', getRAGColor(itemStatus))} />
                  </span>
                </div>
                <Progress value={item.score} className="h-2" />
              </div>
            );
          })}
        </div>

        {/* Divider and result */}
        <div className="border-t border-dashed pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Weighted Average</span>
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold">{Math.round(finalScore)}%</span>
              <div className={cn(
                'px-2 py-1 rounded-full text-xs font-medium text-white',
                getRAGColor(finalStatus)
              )}>
                {getRAGLabel(finalStatus)}
              </div>
            </div>
          </div>
        </div>

        {/* Threshold legend */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <span className="font-medium">Thresholds:</span>
          <span className="ml-2">≥70% = Green</span>
          <span className="ml-2">≥40% = Amber</span>
          <span className="ml-2">&lt;40% = Red</span>
        </div>
      </CardContent>
    </Card>
  );
}