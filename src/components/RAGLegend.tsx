import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export function RAGLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs min-w-[140px] justify-center">
          <Info className="h-3.5 w-3.5" />
          RAG Legend
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">RAG Status Legend</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge className="bg-rag-green text-white">Green</Badge>
              <span className="text-sm text-muted-foreground">On Track (76-100%)</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-rag-amber text-white">Amber</Badge>
              <span className="text-sm text-muted-foreground">At Risk (51-75%)</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-rag-red text-white">Red</Badge>
              <span className="text-sm text-muted-foreground">Critical (1-50%)</span>
            </div>
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground">
            RAG thresholds can be customized per indicator in Data Management.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}