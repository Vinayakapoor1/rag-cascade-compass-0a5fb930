import { Department, OrgObjectiveColor } from '@/types/venture';
import { RAGBadge } from '@/components/RAGBadge';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { getOrgObjectiveColorClasses } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { Building2, Info } from 'lucide-react';
import { FunctionalObjectiveAccordion } from './FunctionalObjectiveAccordion';

interface DepartmentCardProps {
  department: Department;
  orgObjectiveId: string;
  orgColor: OrgObjectiveColor;
}

export function DepartmentCard({ department, orgObjectiveId, orgColor }: DepartmentCardProps) {
  // Use department's own color if set, otherwise fall back to org objective color
  const deptColor = department.color || orgColor;
  const colorClasses = getOrgObjectiveColorClasses(deptColor);

  return (
    <AccordionItem 
      value={department.id} 
      className={cn(
        'border rounded-lg border-l-4 px-4 mb-2',
        colorClasses.border,
        colorClasses.bg
      )}
    >
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left flex-1">
          <div className={cn('p-1.5 rounded-md', colorClasses.bg)}>
            <Building2 className={cn('h-4 w-4', colorClasses.text)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{department.name}</h3>
              <RAGBadge status={department.status} size="sm" />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('https://preview--customer-darling-tool.lovable.app/okr-dashboard', '_blank');
                }}
                title="View detailed stats"
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {department.functionalObjectives.length} Functional Objectives
              {department.owner && ` • Owner: ${department.owner}`}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Accordion type="multiple" className="w-full">
          {department.functionalObjectives.map(fo => (
            <FunctionalObjectiveAccordion 
              key={fo.id} 
              functionalObjective={fo} 
              orgObjectiveId={orgObjectiveId}
              orgColor={orgColor}
              deptColor={deptColor}
            />
          ))}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  );
}
