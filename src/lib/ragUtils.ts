import { RAGStatus, OrgObjectiveColor, IndicatorTier, Indicator } from '@/types/venture';

export function getRAGColor(status: RAGStatus): string {
  switch (status) {
    case 'green': return 'bg-rag-green';
    case 'amber': return 'bg-rag-amber';
    case 'red': return 'bg-rag-red';
    case 'not-set': return 'bg-rag-not-set';
  }
}

export function getRAGTextColor(status: RAGStatus): string {
  switch (status) {
    case 'green': return 'text-rag-green';
    case 'amber': return 'text-rag-amber';
    case 'red': return 'text-rag-red';
    case 'not-set': return 'text-rag-not-set';
  }
}

export function getRAGMutedBg(status: RAGStatus): string {
  switch (status) {
    case 'green': return 'bg-rag-green-muted';
    case 'amber': return 'bg-rag-amber-muted';
    case 'red': return 'bg-rag-red-muted';
    case 'not-set': return 'bg-rag-not-set-muted';
  }
}

export function getRAGBorderColor(status: RAGStatus): string {
  switch (status) {
    case 'green': return 'border-rag-green';
    case 'amber': return 'border-rag-amber';
    case 'red': return 'border-rag-red';
    case 'not-set': return 'border-rag-not-set';
  }
}

export function getRAGPulseClass(status: RAGStatus): string {
  switch (status) {
    case 'green': return 'rag-pulse-green';
    case 'amber': return 'rag-pulse-amber';
    case 'red': return 'rag-pulse-red';
    case 'not-set': return '';
  }
}

export function scoreToRAG(score: number): RAGStatus {
  if (score >= 76) return 'green';
  if (score >= 51) return 'amber';
  return 'red';
}

export function ragToScore(status: RAGStatus): number {
  switch (status) {
    case 'green': return 85;
    case 'amber': return 55;
    case 'red': return 25;
    case 'not-set': return 0;
  }
}

// Simplified health calculation - just uses OKR status directly
export function calculateHealth(okrStatus: RAGStatus): RAGStatus {
  return okrStatus;
}

export function getRAGLabel(status: RAGStatus): string {
  switch (status) {
    case 'green': return 'On Track';
    case 'amber': return 'At Risk';
    case 'red': return 'Critical';
    case 'not-set': return 'Not Set';
  }
}

// ==================== ORG OBJECTIVE IDENTITY COLORS ====================

export function getOrgObjectiveColorClasses(color: OrgObjectiveColor | string): {
  border: string;
  bg: string;
  text: string;
} {
  const normalizedColor = (color || 'green').toLowerCase();
  switch (normalizedColor) {
    case 'green':
      return { border: 'border-org-green', bg: 'bg-org-green-muted', text: 'text-org-green' };
    case 'purple':
      return { border: 'border-org-purple', bg: 'bg-org-purple-muted', text: 'text-org-purple' };
    case 'blue':
      return { border: 'border-org-blue', bg: 'bg-org-blue-muted', text: 'text-org-blue' };
    case 'yellow':
      return { border: 'border-org-yellow', bg: 'bg-org-yellow-muted', text: 'text-org-yellow' };
    case 'orange':
      return { border: 'border-org-orange', bg: 'bg-org-orange-muted', text: 'text-org-orange' };
    default:
      return { border: 'border-primary', bg: 'bg-primary/10', text: 'text-primary' };
  }
}

export function getOrgObjectiveColorLabel(color: OrgObjectiveColor): string {
  switch (color) {
    case 'green': return 'Customer Success First';
    case 'purple': return 'Market-Leading Innovation';
    case 'blue': return 'Sustainable Revenue Growth';
    case 'yellow': return 'Maximize Customer Success';
    case 'orange': return 'Operational Excellence';
  }
}

// ==================== INDICATOR TIER COLORS ====================

export function getIndicatorTierClasses(tier: IndicatorTier | string): {
  bg: string;
  text: string;
  border: string;
  label: string;
  priority: string;
} {
  // All indicators are now just called KPI
  return { 
    bg: 'bg-primary/10', 
    text: 'text-primary', 
    border: 'border-primary',
    label: 'KPI',
    priority: 'Key Performance Indicator'
  };
}

export function getIndicatorTierLabel(tier: IndicatorTier | string): string {
  return 'KPI';
}

// ==================== SIMPLE PERCENTAGE KR CALCULATION ====================

/**
 * Calculate Key Result RAG status from its indicators
 * Simple: average all indicator percentages → apply standard thresholds
 * ≥70% = Green, ≥40% = Amber, <40% = Red
 */
export function calculateKRStatusFromIndicators(indicators: Indicator[]): RAGStatus {
  if (indicators.length === 0) return 'not-set';
  
  // Check if any indicator has data
  const indicatorsWithData = indicators.filter(
    indicator => indicator.currentValue !== undefined && 
                 indicator.targetValue !== undefined && 
                 indicator.targetValue > 0
  );
  
  if (indicatorsWithData.length === 0) return 'not-set';
  
  // Calculate simple average of all indicator percentages
  const totalProgress = indicatorsWithData.reduce((sum, indicator) => {
    return sum + (indicator.currentValue! / indicator.targetValue!) * 100;
  }, 0);
  
  const averageProgress = totalProgress / indicatorsWithData.length;
  
  // Apply standard thresholds
  return scoreToRAG(averageProgress);
}
