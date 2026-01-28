import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RAGBadge } from '@/components/RAGBadge';
import { RAGStatus, OrgObjectiveColor } from '@/types/venture';
import { Building2 } from 'lucide-react';
import { getOrgObjectiveColorClasses } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';

interface DepartmentStatBlockProps {
  id: string;
  name: string;
  owner?: string | null;
  status: RAGStatus;
  percentage: number;
  foCount: number;
  krCount: number;
  kpiCount: number;
  orgObjectiveId: string;
  orgColor: OrgObjectiveColor;
  filterStatus?: RAGStatus | null;
}

export function DepartmentStatBlock({
  id,
  name,
  owner,
  status,
  percentage,
  foCount,
  krCount,
  kpiCount,
  orgObjectiveId,
  orgColor,
  filterStatus,
}: DepartmentStatBlockProps) {
  const displayStatus = filterStatus || status;
  const colorClasses = getOrgObjectiveColorClasses(orgColor);
  
  const getProgressColorClass = (s: RAGStatus) => {
    switch (s) {
      case 'green': return '[&>div]:bg-rag-green';
      case 'amber': return '[&>div]:bg-rag-amber';
      case 'red': return '[&>div]:bg-rag-red';
      default: return '[&>div]:bg-muted';
    }
  };

  return (
    <Link to={`/department/${id}${filterStatus ? `?filter=${filterStatus}` : ''}`}>
      <div className={cn(
        'glass-card h-full cursor-pointer border-l-4 transition-all duration-300',
        colorClasses.border,
        'hover:scale-[1.02]'
      )}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={cn(
                'p-2 rounded-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110',
                colorClasses.bg,
                'shadow-sm'
              )}>
                <Building2 className={cn('h-4 w-4', colorClasses.text)} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2">{name}</h3>
                {owner && (
                  <span className="text-[11px] text-muted-foreground">{owner}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <RAGBadge status={displayStatus} size="sm" />
              <span className="text-base font-bold">{Math.round(percentage)}%</span>
            </div>
          </div>
          
          <Progress 
            value={Math.min(percentage, 100)} 
            className={`h-1.5 mb-3 ${getProgressColorClass(displayStatus)}`}
          />
          
          <div className="flex gap-2 text-[11px] text-muted-foreground font-medium">
            <span>{foCount} FOs</span>
            <span className="opacity-50">•</span>
            <span>{krCount} KRs</span>
            <span className="opacity-50">•</span>
            <span>{kpiCount} KPIs</span>
          </div>
        </div>
      </div>
    </Link>
  );
}