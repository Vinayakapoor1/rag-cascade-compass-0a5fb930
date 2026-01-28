import { Indicator, RAGStatus } from '@/types/venture';

/**
 * Standard RAG thresholds - used consistently across the entire system
 * 76-100% = Green, 51-75% = Amber, 1-50% = Red
 */
export const RAG_THRESHOLDS = {
  green: 76,
  amber: 51,
  red: 50
};

/**
 * Convert a percentage to RAG status using standard thresholds
 * 76-100 = Green, 51-75 = Amber, 1-50 = Red
 */
export function percentageToRAG(percentage: number): RAGStatus {
  if (percentage >= RAG_THRESHOLDS.green) return 'green';
  if (percentage >= RAG_THRESHOLDS.amber) return 'amber';
  return 'red';
}

/**
 * Calculate progress for a single indicator
 * Simple formula: (current / target) * 100
 * Returns a percentage (0-100+)
 */
export function calculateIndicatorProgress(indicator: Indicator): number {
  if (indicator.currentValue !== undefined && indicator.targetValue !== undefined && indicator.targetValue > 0) {
    return (indicator.currentValue / indicator.targetValue) * 100;
  }
  return 0;
}

/**
 * Calculate the RAG status for an indicator based on its progress percentage
 */
export function calculateIndicatorStatus(indicator: Indicator): RAGStatus {
  const progress = calculateIndicatorProgress(indicator);
  return percentageToRAG(progress);
}

/**
 * Calculate Key Result progress from its indicators
 * Simple average of all indicator percentages
 */
export function calculateKRProgressFromIndicators(indicators: Indicator[]): number {
  if (indicators.length === 0) return 0;
  
  const totalProgress = indicators.reduce((sum, indicator) => {
    return sum + calculateIndicatorProgress(indicator);
  }, 0);
  
  return totalProgress / indicators.length;
}

/**
 * Calculate Key Result RAG status from its indicators
 * Simple average → apply standard thresholds
 */
export function calculateKRStatusFromIndicators(indicators: Indicator[]): RAGStatus {
  const progress = calculateKRProgressFromIndicators(indicators);
  return percentageToRAG(progress);
}

/**
 * Get a breakdown of indicator contributions to KR progress
 * Shows each indicator's percentage contribution
 */
export function getIndicatorContributions(indicators: Indicator[]): Array<{
  indicator: Indicator;
  progress: number;
  status: RAGStatus;
}> {
  return indicators.map(indicator => {
    const progress = calculateIndicatorProgress(indicator);
    return {
      indicator,
      progress,
      status: percentageToRAG(progress)
    };
  });
}
