import { Link } from 'react-router-dom';
import { FunctionalObjective, OrgObjectiveColor } from '@/types/venture';
import { RAGBadge } from '@/components/RAGBadge';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRAGMutedBg, getRAGBorderColor } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { Activity, Info } from 'lucide-react';

interface FunctionalObjectiveAccordionProps {
  functionalObjective: FunctionalObjective;
  orgObjectiveId: string;
  orgColor?: OrgObjectiveColor;
  deptColor?: OrgObjectiveColor;
}

export function FunctionalObjectiveAccordion({ 
  functionalObjective: fo, 
  orgObjectiveId,
  orgColor,
  deptColor 
}: FunctionalObjectiveAccordionProps) {
  return (
    <AccordionItem value={fo.id} className={cn('border rounded-lg border-l-4 px-4 mb-2', getRAGBorderColor(fo.status), getRAGMutedBg(fo.status))}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left flex-1">
          <RAGBadge status={fo.status} size="sm" />
          <div className="flex-1">
            <h3 className="font-medium">{fo.name}</h3>
            <p className="text-xs text-muted-foreground">
              {fo.keyResults.length} Key Results
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 pt-2">
          {fo.keyResults.map(kr => {
            const progress = Math.round((kr.current / kr.target) * 100);
            const indicatorCount = kr.indicators?.length || 0;
              
            return (
              <div 
                key={kr.id} 
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg border-l-4 transition-colors hover:bg-background/80',
                  getRAGBorderColor(kr.status),
                  'bg-background/50'
                )}
              >
                {/* RAG Status */}
                <RAGBadge status={kr.status} size="sm" />
                
                {/* KR Name & Owner */}
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/org-objective/${orgObjectiveId}/okr/${kr.id}`}
                    className="font-medium text-sm hover:underline truncate block"
                  >
                    {kr.name}
                  </Link>
                  {indicatorCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        <Activity className="h-3 w-3 mr-1" />
                        {indicatorCount} KPIs
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Progress */}
                <span className="text-sm font-medium tabular-nums">{progress}%</span>
                
                {/* Info Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open('https://preview--customer-darling-tool.lovable.app/okr-dashboard', '_blank');
                  }}
                  title="View detailed stats and formulas"
                >
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
