import { OrgObjective, OrgObjectiveColor } from '@/types/venture';
import { RAGBadge } from '@/components/RAGBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion } from '@/components/ui/accordion';
import { getOrgObjectiveColorClasses, getRAGMutedBg, getRAGBorderColor } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';
import { DepartmentCard } from './DepartmentCard';
import { FunctionalObjectiveAccordion } from './FunctionalObjectiveAccordion';

interface OrgObjectiveCardProps {
  objective: OrgObjective;
  orgObjectiveId: string;
}

export function OrgObjectiveCard({ objective, orgObjectiveId }: OrgObjectiveCardProps) {
  const colorClasses = getOrgObjectiveColorClasses(objective.color);
  
  const hasDepartments = objective.departments && objective.departments.length > 0;

  return (
    <Card className={cn('border-l-4', getRAGBorderColor(objective.status))}>
      <CardHeader className={cn('border-b', getRAGMutedBg(objective.status))}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', getRAGMutedBg(objective.status))}>
              <Target className={cn('h-5 w-5', colorClasses.text)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{objective.name}</CardTitle>
                <Badge 
                  variant={objective.classification === 'CORE' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {objective.classification}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {hasDepartments 
                  ? `${objective.departments!.length} Departments`
                  : `${objective.functionalObjectives?.length || 0} Functional Objectives`
                }
              </p>
            </div>
          </div>
          <RAGBadge status={objective.status} size="lg" showLabel />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {hasDepartments ? (
          <Accordion type="multiple" className="w-full">
            {objective.departments!.map(dept => (
              <DepartmentCard 
                key={dept.id} 
                department={dept} 
                orgObjectiveId={orgObjectiveId} 
                orgColor={objective.color}
              />
            ))}
          </Accordion>
        ) : (
          <Accordion type="multiple" className="w-full">
            {objective.functionalObjectives?.map(fo => (
              <FunctionalObjectiveAccordion 
                key={fo.id} 
                functionalObjective={fo} 
                orgObjectiveId={orgObjectiveId}
                orgColor={objective.color}
              />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
