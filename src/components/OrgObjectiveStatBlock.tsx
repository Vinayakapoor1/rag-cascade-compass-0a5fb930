import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RAGBadge } from '@/components/RAGBadge';
import { RAGStatus, OrgObjectiveClassification } from '@/types/venture';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgObjectiveStatBlockProps {
  name: string;
  classification: OrgObjectiveClassification;
  status: RAGStatus;
  percentage: number;
  filterStatus?: RAGStatus | null;
}

export function OrgObjectiveStatBlock({
  name,
  classification,
  status,
  percentage,
  filterStatus,
}: OrgObjectiveStatBlockProps) {
  const displayStatus = filterStatus || status;
  
  const getBorderColorClass = (s: RAGStatus) => {
    switch (s) {
      case 'green': return 'border-l-rag-green';
      case 'amber': return 'border-l-rag-amber';
      case 'red': return 'border-l-rag-red';
      default: return 'border-l-muted-foreground/30';
    }
  };

  const getProgressColorClass = (s: RAGStatus) => {
    switch (s) {
      case 'green': return '[&>div]:bg-rag-green';
      case 'amber': return '[&>div]:bg-rag-amber';
      case 'red': return '[&>div]:bg-rag-red';
      default: return '[&>div]:bg-muted';
    }
  };

  const getGlowClass = (s: RAGStatus) => {
    switch (s) {
      case 'green': return 'hover:shadow-rag-green/20';
      case 'amber': return 'hover:shadow-rag-amber/20';
      case 'red': return 'hover:shadow-rag-red/20';
      default: return '';
    }
  };

  return (
    <div className={cn(
      'glass-card h-full border-l-4 transition-all duration-300 hover:scale-[1.02]',
      getBorderColorClass(displayStatus),
      getGlowClass(displayStatus)
    )}>
      <div className="p-4 h-full flex flex-col">
        {/* Title Section - flexible, grows with content */}
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-xl bg-muted/80 flex-shrink-0 shadow-sm">
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-sm leading-tight">
            {name}
          </h3>
        </div>
        
        {/* Bottom Section - anchored to bottom for alignment */}
        <div className="mt-auto">
          {/* Status Row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground">
              {classification}
            </span>
            <div className="flex items-center gap-2">
              <RAGBadge status={displayStatus} size="sm" />
              <span className="text-base font-bold">{Math.round(percentage)}%</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <Progress 
            value={Math.min(percentage, 100)} 
            className={`h-1.5 ${getProgressColorClass(displayStatus)}`}
          />
        </div>
      </div>
    </div>
  );
}