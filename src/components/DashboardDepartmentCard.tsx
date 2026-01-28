import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RAGBadge } from '@/components/RAGBadge';
import { DataEntryDialog } from '@/components/DataEntryDialog';
import { getOrgObjectiveColorClasses, getIndicatorTierClasses } from '@/lib/ragUtils';
import { parseFormulaType, aggregateProgress, progressToRAG } from '@/lib/formulaCalculations';
import { cn } from '@/lib/utils';
import { Building2, Target, TrendingUp, Edit3, ChevronRight } from 'lucide-react';
import { OrgObjectiveColor, RAGStatus } from '@/types/venture';

interface Indicator {
  id: string;
  name: string;
  tier: string;
  formula: string | null;
  frequency: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
}

interface KeyResult {
  id: string;
  name: string;
  owner: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  formula: string | null;
  indicators: Indicator[];
}

interface FunctionalObjective {
  id: string;
  name: string;
  owner: string | null;
  formula: string | null;
  key_results: KeyResult[];
}

interface Department {
  id: string;
  name: string;
  functional_objectives: FunctionalObjective[];
}

interface DashboardDepartmentCardProps {
  department: Department;
  color: OrgObjectiveColor;
  isLoggedIn: boolean;
}

function calculateIndicatorStatus(indicator: Indicator): RAGStatus {
  if (indicator.current_value != null && indicator.target_value != null && indicator.target_value > 0) {
    const progress = (indicator.current_value / indicator.target_value) * 100;
    return progressToRAG(progress);
  }
  return 'not-set';
}

function calculateKRStatus(kr: KeyResult): RAGStatus {
  if (kr.indicators.length === 0) {
    if (kr.current_value != null && kr.target_value != null && kr.target_value > 0) {
      return progressToRAG((kr.current_value / kr.target_value) * 100);
    }
    return 'not-set';
  }
  
  const progressValues: number[] = [];
  kr.indicators.forEach(ind => {
    if (ind.current_value != null && ind.target_value != null && ind.target_value > 0) {
      progressValues.push((ind.current_value / ind.target_value) * 100);
    }
  });
  
  if (progressValues.length === 0) return 'not-set';
  
  // Use stored formula for aggregation
  const formulaType = parseFormulaType(kr.formula);
  const aggregatedProgress = aggregateProgress(progressValues, formulaType);
  return progressToRAG(aggregatedProgress);
}

function calculateFOStatus(fo: FunctionalObjective): RAGStatus {
  if (fo.key_results.length === 0) return 'not-set';
  
  const krProgresses: number[] = [];
  
  fo.key_results.forEach(kr => {
    const indProgresses: number[] = [];
    kr.indicators.forEach(ind => {
      if (ind.current_value != null && ind.target_value != null && ind.target_value > 0) {
        indProgresses.push((ind.current_value / ind.target_value) * 100);
      }
    });
    
    if (indProgresses.length > 0) {
      // Aggregate indicators using KR's formula
      const krFormulaType = parseFormulaType(kr.formula);
      krProgresses.push(aggregateProgress(indProgresses, krFormulaType));
    }
  });
  
  if (krProgresses.length === 0) return 'not-set';
  
  // Aggregate KRs using FO's formula
  const foFormulaType = parseFormulaType(fo.formula);
  const aggregatedProgress = aggregateProgress(krProgresses, foFormulaType);
  return progressToRAG(aggregatedProgress);
}

function calculateDeptStatus(dept: Department): RAGStatus {
  if (dept.functional_objectives.length === 0) return 'not-set';
  
  const foProgresses: number[] = [];
  
  dept.functional_objectives.forEach(fo => {
    const krProgresses: number[] = [];
    
    fo.key_results.forEach(kr => {
      const indProgresses: number[] = [];
      kr.indicators.forEach(ind => {
        if (ind.current_value != null && ind.target_value != null && ind.target_value > 0) {
          indProgresses.push((ind.current_value / ind.target_value) * 100);
        }
      });
      
      if (indProgresses.length > 0) {
        const krFormulaType = parseFormulaType(kr.formula);
        krProgresses.push(aggregateProgress(indProgresses, krFormulaType));
      }
    });
    
    if (krProgresses.length > 0) {
      const foFormulaType = parseFormulaType(fo.formula);
      foProgresses.push(aggregateProgress(krProgresses, foFormulaType));
    }
  });
  
  if (foProgresses.length === 0) return 'not-set';
  
  // Department uses simple average
  return progressToRAG(aggregateProgress(foProgresses, 'AVG'));
}

export function DashboardDepartmentCard({ department, color, isLoggedIn }: DashboardDepartmentCardProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const colorClasses = getOrgObjectiveColorClasses(color);
  const deptStatus = calculateDeptStatus(department);

  const handleEditIndicator = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setDialogOpen(true);
  };

  return (
    <>
      <div className={cn(
        'glass-card border-l-4 transition-all duration-300',
        colorClasses.border
      )}>
        {/* Header with gradient overlay */}
        <div className={cn(
          'px-5 py-4 border-b border-border/30',
          'bg-gradient-to-r from-transparent via-muted/30 to-transparent'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'p-2.5 rounded-xl transition-all duration-300 hover:scale-105',
                colorClasses.bg,
                'shadow-lg'
              )}>
                <Building2 className={cn('h-5 w-5', colorClasses.text)} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{department.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {department.functional_objectives.length} Functional Objectives
                </p>
              </div>
            </div>
            <RAGBadge status={deptStatus} size="md" showLabel />
          </div>
        </div>
        
        <div className="p-5">
          <Accordion type="multiple" className="space-y-3">
            {department.functional_objectives.map(fo => {
              const foStatus = calculateFOStatus(fo);
              return (
                <AccordionItem 
                  key={fo.id} 
                  value={fo.id} 
                  className="glass rounded-xl px-4 border-none transition-all duration-200 hover:shadow-md"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 text-left flex-1">
                      <div className="p-2 rounded-lg bg-background/80 shadow-sm">
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{fo.name}</h4>
                          <RAGBadge status={foStatus} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fo.owner || 'Unassigned'} • {fo.key_results.length} KRs
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="pb-4">
                    <div className="space-y-4 pl-7">
                      {fo.key_results.map(kr => {
                        const krStatus = calculateKRStatus(kr);
                        const krProgress = kr.target_value && kr.current_value 
                          ? Math.min((kr.current_value / kr.target_value) * 100, 100)
                          : 0;
                        
                        return (
                          <div key={kr.id} className="space-y-3">
                            <div className="glass-card p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium">{kr.name}</h5>
                                    <RAGBadge status={krStatus} size="sm" />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {kr.owner || 'Unassigned'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Progress value={krProgress} className="h-2.5" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>
                                    {kr.current_value ?? 0} / {kr.target_value ?? 100} {kr.unit || ''}
                                  </span>
                                  <span className="font-semibold text-foreground">{Math.round(krProgress)}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Indicators */}
                            {kr.indicators.length > 0 && (
                              <div className="pl-4 border-l-2 border-primary/30 space-y-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                  <TrendingUp className="h-4 w-4" />
                                  <span>{kr.indicators.length} Indicators</span>
                                </div>
                                
                                <div className="grid gap-3">
                                  {kr.indicators.map(indicator => {
                                    const indStatus = calculateIndicatorStatus(indicator);
                                    const tierClasses = getIndicatorTierClasses(indicator.tier);
                                    const indProgress = indicator.target_value && indicator.current_value
                                      ? Math.round((indicator.current_value / indicator.target_value) * 100)
                                      : 0;
                                    
                                    return (
                                      <div 
                                        key={indicator.id}
                                        className="stats-card p-4 flex items-center justify-between gap-4"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-2">
                                            <RAGBadge status={indStatus} size="sm" />
                                            <h6 className="font-medium truncate">{indicator.name}</h6>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className={cn('text-[10px] font-semibold', tierClasses.bg, tierClasses.text)}>
                                              {tierClasses.label}
                                            </Badge>
                                            {indicator.frequency && (
                                              <span className="px-2 py-0.5 rounded-full bg-muted/80">{indicator.frequency}</span>
                                            )}
                                            <span className="flex items-center gap-1">
                                              <ChevronRight className="h-3 w-3" />
                                              {indicator.current_value ?? '—'} / {indicator.target_value ?? '—'} {indicator.unit || ''}
                                            </span>
                                            <span className="font-bold text-foreground">({indProgress}%)</span>
                                          </div>
                                        </div>
                                        
                                        {isLoggedIn && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditIndicator(indicator)}
                                            className="flex-shrink-0 hover-glow hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                                          >
                                            <Edit3 className="h-4 w-4 mr-2" />
                                            Update
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>

      <DataEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        indicator={selectedIndicator}
      />
    </>
  );
}