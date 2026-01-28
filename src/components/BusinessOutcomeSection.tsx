import { useState } from 'react';
import { RAGBadge } from '@/components/RAGBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Calendar, Pencil } from 'lucide-react';
import { getRAGMutedBg, getRAGBorderColor } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { RAGStatus } from '@/types/venture';
import { useAuth } from '@/hooks/useAuth';
import { EditBusinessOutcomeDialog } from '@/components/EditBusinessOutcomeDialog';

interface BusinessOutcomeSectionProps {
  businessOutcome: string | null;
  status: RAGStatus;
  percentage?: number;
  orgObjectiveId?: string | null;
  onEditSuccess?: () => void;
}

export function BusinessOutcomeSection({ 
  businessOutcome, 
  status, 
  percentage,
  orgObjectiveId,
  onEditSuccess 
}: BusinessOutcomeSectionProps) {
  const { isAdmin } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const displayOutcome = businessOutcome || "Business Outcome Not Set";
  const currentYear = new Date().getFullYear();
  const displayPercentage = percentage !== undefined ? Math.round(percentage) : null;
  
  return (
    <>
      <div className={cn(
        'card-3d relative overflow-hidden border-l-4 p-8',
        getRAGBorderColor(status)
      )}>
        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-gradient-to-tr from-accent/10 to-transparent blur-3xl pointer-events-none" />
        
        {/* Inner highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <div className={cn(
              'p-5 rounded-2xl transition-all duration-300 animate-float',
              getRAGMutedBg(status),
              'ring-2 ring-offset-4 ring-offset-card shadow-lg',
              status === 'green' && 'ring-rag-green/40 shadow-rag-green/20',
              status === 'amber' && 'ring-rag-amber/40 shadow-rag-amber/20',
              status === 'red' && 'ring-rag-red/40 shadow-rag-red/20',
              status === 'not-set' && 'ring-muted-foreground/20'
            )}>
              <TrendingUp className="h-9 w-9" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-2">
                Business Outcome FY {currentYear}
              </p>
              <div className="flex items-center gap-4">
                <h2 className="text-4xl font-bold tracking-tight">{displayOutcome}</h2>
                {isAdmin && orgObjectiveId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">FY {currentYear}</span>
              </div>
              {displayPercentage !== null && (
                <div className="text-2xl font-bold mt-1">{displayPercentage}%</div>
              )}
            </div>
            <RAGBadge status={status} size="lg" showLabel pulse={status !== 'not-set'} />
          </div>
        </div>
      </div>
      
      {isAdmin && orgObjectiveId && (
        <EditBusinessOutcomeDialog
          orgObjectiveId={orgObjectiveId}
          currentValue={businessOutcome}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => onEditSuccess?.()}
        />
      )}
    </>
  );
}