import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Target, Flag, Users, Gauge, Activity, Info, ExternalLink } from 'lucide-react';

export function OKRHierarchyLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs min-w-[140px] justify-center">
          <Info className="h-3.5 w-3.5" />
          OKR Structure
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">OKR Hierarchy</h4>
            <a 
              href="https://customer-darling-tool.lovable.app/okr-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View Full Map
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          
          <div className="font-mono text-[11px] space-y-0.5">
            {/* Business Outcome */}
            <div className="flex items-center gap-1.5 py-0.5">
              <Target className="h-3 w-3 text-primary shrink-0" />
              <span className="font-semibold">BUSINESS OUTCOME</span>
            </div>

            {/* Org Objective */}
            <div className="ml-3 border-l border-border pl-2">
              <div className="flex items-center gap-1.5 py-0.5">
                <Flag className="h-3 w-3 text-blue-500 shrink-0" />
                <span className="font-medium">ORG OBJECTIVE</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">CORE</Badge>
              </div>

              {/* Functional Objective */}
              <div className="ml-3 border-l border-border/60 pl-2">
                <div className="flex items-center gap-1.5 py-0.5">
                  <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span>FUNCTIONAL OBJ</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-muted">Team</span>
                </div>

                {/* Key Results */}
                <div className="ml-3 border-l border-border/40 pl-2">
                  <div className="flex items-center gap-1.5 py-0.5 text-muted-foreground">
                    <Gauge className="h-2.5 w-2.5 shrink-0" />
                    <span>KEY RESULT</span>
                  </div>

                  {/* Indicators */}
                  <div className="ml-3 border-l border-border/30 pl-2 space-y-0.5">
                    <div className="flex items-center gap-1 py-0.5 text-muted-foreground/80">
                      <Activity className="h-2 w-2 shrink-0" />
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 bg-green-500/10 text-green-600 border-green-500/30">L</Badge>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">P</Badge>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 bg-orange-500/10 text-orange-600 border-orange-500/30">G</Badge>
                      <span className="text-[10px]">Indicators</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RAG Legend */}
          <div className="pt-2 border-t border-border/50 flex items-center gap-3 text-[10px]">
            <span className="text-muted-foreground">RAG:</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-rag-green" />
              <span>On Track</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-rag-amber" />
              <span>At Risk</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-rag-red" />
              <span>Critical</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
