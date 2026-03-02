import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';

interface ComplianceSummaryCardsProps {
  totalCsms: number;
  compliantCount: number;
  pendingCount: number;
  completionPct: number;
  totalCustomers: number;
  completedCustomers: number;
  pendingCustomers: number;
}

export function ComplianceSummaryCards({
  totalCsms, compliantCount, pendingCount, completionPct,
  totalCustomers, completedCustomers, pendingCustomers,
}: ComplianceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      <Card className="card-3d">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xl font-bold">{totalCsms}</p>
              <p className="text-[10px] text-muted-foreground">Total CSMs</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="card-3d border-l-4 border-l-rag-green">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-rag-green shrink-0" />
            <div>
              <p className="text-xl font-bold">{compliantCount}</p>
              <p className="text-[10px] text-muted-foreground">CSMs Submitted</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="card-3d border-l-4 border-l-rag-red">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-rag-red shrink-0" />
            <div>
              <p className="text-xl font-bold">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">CSMs Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="card-3d border-l-4 border-l-primary">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold">{completionPct}%</p>
              <p className="text-[10px] text-muted-foreground">Completion</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="card-3d">
        <CardContent className="pt-4 pb-4">
          <div>
            <p className="text-xl font-bold">{totalCustomers}</p>
            <p className="text-[10px] text-muted-foreground">Total Customers</p>
          </div>
        </CardContent>
      </Card>
      <Card className="card-3d border-l-4 border-l-rag-green">
        <CardContent className="pt-4 pb-4">
          <div>
            <p className="text-xl font-bold">{completedCustomers}</p>
            <p className="text-[10px] text-muted-foreground">Customers Done</p>
          </div>
        </CardContent>
      </Card>
      <Card className="card-3d border-l-4 border-l-rag-red">
        <CardContent className="pt-4 pb-4">
          <div>
            <p className="text-xl font-bold">{pendingCustomers}</p>
            <p className="text-[10px] text-muted-foreground">Customers Pending</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
