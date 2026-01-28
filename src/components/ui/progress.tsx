import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";
import { RAGStatus } from "@/types/venture";

// Get RAG-based background color for progress bar
const getRAGProgressColor = (status?: RAGStatus): string => {
  switch (status) {
    case 'green':
      return 'bg-rag-green';
    case 'amber':
      return 'bg-rag-amber';
    case 'red':
      return 'bg-rag-red';
    default:
      return 'bg-primary';
  }
};

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  ragStatus?: RAGStatus;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, ragStatus, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 transition-all", getRAGProgressColor(ragStatus))}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
