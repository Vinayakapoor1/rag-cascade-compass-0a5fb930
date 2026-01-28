import { Link } from 'react-router-dom';
import { Indicator, OrgObjectiveColor } from '@/types/venture';
import { RAGBadge } from '@/components/RAGBadge';
import { getIndicatorTierClasses, getOrgObjectiveColorClasses } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { ArrowRight, Calculator, Clock } from 'lucide-react';
import { calculateIndicatorProgress, calculateIndicatorStatus } from '@/lib/formulaUtils';

interface IndicatorCardProps {
  indicator: Indicator;
  orgObjectiveId: string;
  orgColor?: OrgObjectiveColor;
  compact?: boolean;
}

export function IndicatorCard({ indicator, orgObjectiveId, orgColor, compact = false }: IndicatorCardProps) {
  const tierClasses = getIndicatorTierClasses(indicator.tier);
  const orgColorClasses = orgColor ? getOrgObjectiveColorClasses(orgColor) : null;
  
  const progress = calculateIndicatorProgress(indicator);
  const derivedStatus = calculateIndicatorStatus(indicator);

  if (compact) {
    return (
      <Link
        to={`/org-objective/${orgObjectiveId}/indicator/${indicator.id}`}
        className={cn(
          'block p-3 rounded-lg border transition-colors hover:bg-muted/50',
          orgColorClasses ? `border-l-4 ${orgColorClasses.border}` : 'border-l-4 border-muted'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                tierClasses.bg,
                tierClasses.text
              )}>
                {tierClasses.label}
              </span>
              <RAGBadge status={derivedStatus} size="sm" />
            </div>
            <h4 className="font-medium text-sm truncate">{indicator.name}</h4>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {indicator.frequency}
              </span>
              {indicator.currentValue !== undefined && (
                <span className="font-medium">{Math.round(progress)}%</span>
              )}
            </div>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/org-objective/${orgObjectiveId}/indicator/${indicator.id}`}
      className={cn(
        'block p-4 rounded-lg border transition-colors hover:bg-muted/50',
        orgColorClasses ? `border-l-4 ${orgColorClasses.border}` : 'border-l-4 border-muted'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            tierClasses.bg,
            tierClasses.text
          )}>
            {tierClasses.label}
          </span>
          <RAGBadge status={derivedStatus} size="sm" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <h4 className="font-medium text-sm mb-2">{indicator.name}</h4>
      
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calculator className="h-3 w-3" />
          <span className="truncate">{indicator.formula}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {indicator.frequency}
          </span>
        </div>
        {indicator.currentValue !== undefined && indicator.targetValue !== undefined && (
          <div className="flex items-center justify-between pt-1">
            <span>{indicator.currentValue} / {indicator.targetValue}</span>
            <span className="font-medium">{Math.round(progress)}% progress</span>
          </div>
        )}
      </div>
    </Link>
  );
}
