import { ArrowRight, Layers, Users, Target, TrendingUp } from 'lucide-react';
import { RAGStatus } from '@/types/venture';
import { cn } from '@/lib/utils';
import { getRAGMutedBg, getRAGBorderColor } from '@/lib/ragUtils';

interface CascadeFlowDiagramProps {
  orgObjectiveId: string;
  featureHealth: RAGStatus;
  customerHealth: RAGStatus;
  okrHealth: RAGStatus;
  overallHealth: RAGStatus;
  filterStatus?: RAGStatus | null;
}

export function CascadeFlowDiagram({
  orgObjectiveId,
  featureHealth,
  customerHealth,
  okrHealth,
  overallHealth,
  filterStatus,
}: CascadeFlowDiagramProps) {
  // When filter is active, all nodes display the filter color
  const getDisplayStatus = (actualStatus: RAGStatus) => filterStatus || actualStatus;
  const getHref = (basePath: string) => filterStatus ? `${basePath}?filter=${filterStatus}` : basePath;
  
  const nodes = [
    { 
      label: 'Feature Health', 
      status: getDisplayStatus(featureHealth), 
      icon: Layers, 
      href: getHref(`/org-objective/${orgObjectiveId}/features`),
      description: 'Adoption & Utilisation'
    },
    { 
      label: 'Customer Health', 
      status: getDisplayStatus(customerHealth), 
      icon: Users, 
      href: getHref(`/org-objective/${orgObjectiveId}/customers`),
      description: 'Satisfaction & Retention'
    },
    { 
      label: 'OKR Performance', 
      status: getDisplayStatus(okrHealth), 
      icon: Target, 
      href: getHref(`/org-objective/${orgObjectiveId}/okr`),
      description: 'Objectives & Key Results'
    },
    { 
      label: 'Objective Health', 
      status: getDisplayStatus(overallHealth), 
      icon: TrendingUp, 
      href: getHref(`/org-objective/${orgObjectiveId}`),
      description: 'Overall Status'
    },
  ];

  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
          Health Flow
        </span>
        <div className="flex items-center gap-1">
          {nodes.map((node, index) => (
            <div key={node.label} className="flex items-center">
              <div 
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded border text-xs',
                  getRAGBorderColor(node.status),
                  getRAGMutedBg(node.status)
                )}
              >
                <node.icon className="h-3 w-3" />
                <span className="font-medium whitespace-nowrap">{node.label}</span>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  node.status === 'green' && 'bg-rag-green',
                  node.status === 'amber' && 'bg-rag-amber',
                  node.status === 'red' && 'bg-rag-red',
                  node.status === 'not-set' && 'bg-muted-foreground/50'
                )} />
              </div>
              {index < nodes.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
