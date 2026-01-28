import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Loader2 } from 'lucide-react';
import { RAGBadge } from '@/components/RAGBadge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  getKRCalculationBreakdown, 
  getFOCalculationBreakdown,
  type CalculationBreakdown,
  type FormulaType
} from '@/lib/formulaCalculations';
import { progressToRAG } from '@/lib/formulaCalculations';
import { cn } from '@/lib/utils';

interface CalculationBreakdownDialogProps {
  entityType: 'FO' | 'KR' | 'KPI';
  entityId: string;
  entityName: string;
  // For KPI, we need to pass the values directly since there's no breakdown function
  kpiData?: {
    currentValue: number | null;
    targetValue: number | null;
    unit: string | null;
  };
  trigger?: React.ReactNode;
}

function getFormulaDescription(formulaType: FormulaType): string {
  switch (formulaType) {
    case 'AVG':
      return 'Average of all child values';
    case 'SUM':
      return 'Sum of all child values';
    case 'WEIGHTED_AVG':
      return 'Weighted average using target values as weights';
    case 'MIN':
      return 'Minimum value among all children';
    case 'MAX':
      return 'Maximum value among all children';
    default:
      return 'Unknown formula';
  }
}

export function CalculationBreakdownDialog({
  entityType,
  entityId,
  entityName,
  kpiData,
  trigger
}: CalculationBreakdownDialogProps) {
  const [open, setOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<CalculationBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    
    async function fetchBreakdown() {
      setLoading(true);
      setError(null);
      
      try {
        if (entityType === 'KPI') {
          // For KPI, create a simple breakdown
          if (!kpiData) {
            setError('No KPI data available');
            return;
          }
          
          const { currentValue, targetValue, unit } = kpiData;
          const progress = currentValue !== null && targetValue !== null && targetValue > 0
            ? (currentValue / targetValue) * 100
            : 0;
          
          setBreakdown({
            entityName,
            entityType: 'KPI',
            formula: `(${currentValue ?? 0} / ${targetValue ?? 0}) × 100`,
            formulaType: 'AVG', // Not really used for KPI
            childValues: [
              { name: 'Current Value', progress: currentValue ?? 0 },
              { name: 'Target Value', progress: targetValue ?? 0 },
            ],
            calculatedProgress: progress,
            status: progressToRAG(progress),
          });
        } else if (entityType === 'KR') {
          const result = await getKRCalculationBreakdown(entityId);
          if (result) {
            setBreakdown(result);
          } else {
            setError('No calculation data available for this Key Result');
          }
        } else if (entityType === 'FO') {
          const result = await getFOCalculationBreakdown(entityId);
          if (result) {
            setBreakdown(result);
          } else {
            setError('No calculation data available for this Functional Objective');
          }
        }
      } catch (err) {
        console.error('Error fetching calculation breakdown:', err);
        setError('Failed to load calculation breakdown');
      } finally {
        setLoading(false);
      }
    }
    
    fetchBreakdown();
  }, [open, entityType, entityId, entityName, kpiData]);

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 hover:bg-muted"
      onClick={() => setOpen(true)}
    >
      <Info className="h-4 w-4 text-muted-foreground" />
    </Button>
  );

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        defaultTrigger
      )}
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Calculation Breakdown
            </DialogTitle>
            <DialogDescription>
              How the RAG status is calculated for this {entityType === 'FO' ? 'Functional Objective' : entityType === 'KR' ? 'Key Result' : 'KPI'}
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && breakdown && (
            <div className="space-y-6">
              {/* Entity Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Entity</p>
                      <p className="font-medium">{breakdown.entityName}</p>
                    </div>
                    
                    {entityType !== 'KPI' && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Formula Type</p>
                          <p className="font-mono text-sm font-semibold">{breakdown.formulaType}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getFormulaDescription(breakdown.formulaType)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Stored Formula</p>
                          <p className="font-mono text-sm">{breakdown.formula}</p>
                        </div>
                      </>
                    )}
                    
                    {entityType === 'KPI' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Calculation</p>
                        <p className="font-mono text-sm">{breakdown.formula}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Simple division: Current value divided by target value, multiplied by 100
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Child Values */}
              {entityType !== 'KPI' && breakdown.childValues.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">
                    {entityType === 'FO' ? 'Key Results' : 'Indicators'} ({breakdown.childValues.length})
                  </h4>
                  <div className="space-y-2">
                    {breakdown.childValues.map((child, index) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{child.name}</p>
                              {child.weight !== undefined && breakdown.formulaType === 'WEIGHTED_AVG' && (
                                <p className="text-xs text-muted-foreground">
                                  Weight: {child.weight}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-lg font-bold">{Math.round(child.progress)}%</p>
                                <RAGBadge status={progressToRAG(child.progress)} size="sm" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* KPI Values */}
              {entityType === 'KPI' && kpiData && (
                <div>
                  <h4 className="font-medium mb-3">Values</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Current Value</p>
                        <p className="text-xl font-bold">
                          {kpiData.currentValue ?? 0} {kpiData.unit || ''}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Target Value</p>
                        <p className="text-xl font-bold">
                          {kpiData.targetValue ?? 0} {kpiData.unit || ''}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Final Result */}
              <Card className={cn(
                'border-2',
                breakdown.status === 'green' && 'border-rag-green bg-rag-green-muted/20',
                breakdown.status === 'amber' && 'border-rag-amber bg-rag-amber-muted/20',
                breakdown.status === 'red' && 'border-rag-red bg-rag-red-muted/20',
                breakdown.status === 'not-set' && 'border-muted'
              )}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Final Calculated Progress</p>
                      <p className="text-3xl font-bold">{Math.round(breakdown.calculatedProgress)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-2">RAG Status</p>
                      <RAGBadge status={breakdown.status} size="lg" showLabel />
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      <strong>RAG Thresholds:</strong> Green ≥76%, Amber 51-75%, Red &lt;51%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
