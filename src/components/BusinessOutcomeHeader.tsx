import { BusinessOutcome } from '@/types/venture';
import { RAGBadge } from '@/components/RAGBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRAGMutedBg } from '@/lib/ragUtils';

interface BusinessOutcomeHeaderProps {
  businessOutcome: BusinessOutcome;
  className?: string;
}

export function BusinessOutcomeHeader({ businessOutcome, className }: BusinessOutcomeHeaderProps) {
  return (
    <Card className={cn('border-2 border-primary/20', className)}>
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-xl', getRAGMutedBg(businessOutcome.status))}>
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                Business Outcome {businessOutcome.year}
              </p>
              <h2 className="text-2xl font-bold tracking-tight">{businessOutcome.name}</h2>
            </div>
          </div>
          <RAGBadge status={businessOutcome.status} size="lg" showLabel pulse />
        </div>
      </CardContent>
    </Card>
  );
}
