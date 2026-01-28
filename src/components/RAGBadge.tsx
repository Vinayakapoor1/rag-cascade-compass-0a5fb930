import { RAGStatus } from '@/types/venture';
import { getRAGColor, getRAGLabel, getRAGPulseClass } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';

interface RAGBadgeProps {
  status: RAGStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
  className?: string;
}

export function RAGBadge({ status, size = 'md', showLabel = false, pulse = false, className }: RAGBadgeProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full',
          getRAGColor(status),
          sizeClasses[size],
          pulse && getRAGPulseClass(status)
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium text-foreground">
          {getRAGLabel(status)}
        </span>
      )}
    </div>
  );
}
