import { RAGStatus } from '@/types/venture';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RAGBadge } from './RAGBadge';
import { getRAGBorderColor, getRAGMutedBg, getRAGLabel } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PillarCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: RAGStatus;
  weight: number;
  href: string;
  stats?: { label: string; value: string | number }[];
  filterStatus?: RAGStatus | null;
}

export function PillarCard({ 
  title, 
  description, 
  icon: Icon, 
  status, 
  weight, 
  href,
  stats = [],
  filterStatus
}: PillarCardProps) {
  // When filter is active, use filter status for styling
  const displayStatus = filterStatus || status;
  
  // Append filter to href if active
  const finalHref = filterStatus ? `${href}?filter=${filterStatus}` : href;
  
  return (
    <Link to={finalHref}>
      <Card 
        className={cn(
          'group cursor-pointer transition-all duration-300 hover:shadow-lg border-t-4 h-full',
          getRAGBorderColor(displayStatus),
          'hover:scale-[1.01]'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={cn('p-3 rounded-lg', getRAGMutedBg(displayStatus))}>
              <Icon className="h-6 w-6 text-foreground" />
            </div>
            <div className="text-right">
              <RAGBadge status={displayStatus} size="lg" showLabel />
              <p className="text-xs text-muted-foreground mt-1">Weight: {weight}%</p>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold mt-4">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>
          {stats.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end text-sm text-muted-foreground group-hover:text-foreground transition-colors pt-2 border-t">
            <span>Drill Down</span>
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
