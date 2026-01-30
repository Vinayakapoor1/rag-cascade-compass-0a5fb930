// Simplified types for OKR-focused platform

export type RAGStatus = 'green' | 'amber' | 'red' | 'not-set';

// Identity colors for Org Objectives (separate from RAG)
export type OrgObjectiveColor = 'green' | 'purple' | 'blue' | 'yellow' | 'orange' | 'teal';

// Indicator tier types
export type IndicatorTier = 'kpi' | 'leading' | 'lagging';

// Classification for Org Objectives
export type OrgObjectiveClassification = 'CORE' | 'Enabler';

// Frequency types for indicators
export type IndicatorFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

// Indicator (lowest level of OKR hierarchy)
export interface Indicator {
  id: string;
  name: string;
  tier: IndicatorTier;
  formula: string;
  calculationFormula?: string;
  frequency: IndicatorFrequency;
  frequencyWeight?: number;
  status: RAGStatus;
  currentValue?: number;
  targetValue?: number;
  baselineValue?: number;
  calculatedProgress?: number;
  unit?: string;
  linkedCustomerIds?: string[];
  linkedFeatureIds?: string[];
}

// Key Result
export interface KeyResult {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  status: RAGStatus;
  owner: string;
  indicators?: Indicator[];
}

// Functional Objective
export interface FunctionalObjective {
  id: string;
  name: string;
  team: string;
  status: RAGStatus;
  keyResults: KeyResult[];
}

// Department (with optional owner)
export interface Department {
  id: string;
  name: string;
  owner?: string;
  color?: OrgObjectiveColor;
  status?: RAGStatus;
  functionalObjectives: FunctionalObjective[];
}

// Org Objective
export interface OrgObjective {
  id: string;
  name: string;
  color: OrgObjectiveColor;
  classification: OrgObjectiveClassification;
  status: RAGStatus;
  departments?: Department[];
  functionalObjectives?: FunctionalObjective[];
}

// Business Outcome (top of hierarchy)
export interface BusinessOutcome {
  id: string;
  name: string;
  year: number;
  status: RAGStatus;
}

// OKR Structure for a venture
export interface VentureOKRs {
  ventureId: string;
  businessOutcome?: BusinessOutcome;
  orgObjectives: OrgObjective[];
}
