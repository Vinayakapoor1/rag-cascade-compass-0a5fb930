import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle2, AlertTriangle, BarChart3, Building2, CircleCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ComplianceFilter = 'all' | 'csm-submitted' | 'csm-pending' | 'customer-complete' | 'customer-pending' | null;

interface ComplianceSummaryCardsProps {
  totalCsms: number;
  compliantCount: number;
  pendingCount: number;
  completionPct: number;
  totalCustomers: number;
  completedCustomers: number;
  pendingCustomers: number;
  activeFilter?: ComplianceFilter;
  onFilterChange?: (filter: ComplianceFilter) => void;
  /** Extra context for cards */
  csmNames?: { submitted: string[]; pending: string[] };
}

export function ComplianceSummaryCards({
  totalCsms, compliantCount, pendingCount, completionPct,
  totalCustomers, completedCustomers, pendingCustomers,
  activeFilter, onFilterChange,
  csmNames,
}: ComplianceSummaryCardsProps) {
  const handleClick = (filter: ComplianceFilter) => {
    if (!onFilterChange) return;
    onFilterChange(activeFilter === filter ? null : filter);
  };

  const isActive = (filter: ComplianceFilter) => activeFilter === filter;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* Total CSMs */}
      <Card
        className={cn(
          'card-3d cursor-pointer transition-all hover:ring-2 hover:ring-primary/30',
          isActive('all') && 'ring-2 ring-primary'
        )}
        onClick={() => handleClick('all')}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xl font-bold">{totalCsms}</p>
              <p className="text-[10px] text-muted-foreground">Total CSMs</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                {compliantCount} active, {pendingCount} idle
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSMs Submitted */}
      <Card
        className={cn(
          'card-3d border-l-4 border-l-rag-green cursor-pointer transition-all hover:ring-2 hover:ring-rag-green/30',
          isActive('csm-submitted') && 'ring-2 ring-rag-green'
        )}
        onClick={() => handleClick('csm-submitted')}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-rag-green shrink-0" />
            <div>
              <p className="text-xl font-bold">{compliantCount}</p>
              <p className="text-[10px] text-muted-foreground">CSMs Submitted</p>
              {csmNames?.submitted && csmNames.submitted.length > 0 && (
                <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate max-w-[120px]" title={csmNames.submitted.join(', ')}>
                  {csmNames.submitted.slice(0, 2).join(', ')}{csmNames.submitted.length > 2 ? ` +${csmNames.submitted.length - 2}` : ''}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSMs Pending */}
      <Card
        className={cn(
          'card-3d border-l-4 border-l-rag-red cursor-pointer transition-all hover:ring-2 hover:ring-rag-red/30',
          isActive('csm-pending') && 'ring-2 ring-rag-red'
        )}
        onClick={() => handleClick('csm-pending')}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-rag-red shrink-0" />
            <div>
              <p className="text-xl font-bold">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">CSMs Pending</p>
              {csmNames?.pending && csmNames.pending.length > 0 && (
                <p className="text-[9px] text-rag-red/70 mt-0.5 truncate max-w-[120px]" title={csmNames.pending.join(', ')}>
                  {csmNames.pending.slice(0, 2).join(', ')}{csmNames.pending.length > 2 ? ` +${csmNames.pending.length - 2}` : ''}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion % */}
      <Card
        className={cn(
          'card-3d border-l-4 border-l-primary cursor-pointer transition-all hover:ring-2 hover:ring-primary/30',
          isActive('all') && 'ring-2 ring-primary'
        )}
        onClick={() => handleClick('all')}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold">{completionPct}%</p>
              <p className="text-[10px] text-muted-foreground">Completion</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                {completedCustomers}/{totalCustomers} customers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Customers */}
      <Card className="card-3d">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xl font-bold">{totalCustomers}</p>
              <p className="text-[10px] text-muted-foreground">Total Customers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Done */}
      <Card
        className={cn(
          'card-3d border-l-4 border-l-rag-green cursor-pointer transition-all hover:ring-2 hover:ring-rag-green/30',
          isActive('customer-complete') && 'ring-2 ring-rag-green'
        )}
        onClick={() => handleClick('customer-complete')}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <CircleCheck className="h-5 w-5 text-rag-green shrink-0" />
            <div>
              <p className="text-xl font-bold">{completedCustomers}</p>
              <p className="text-[10px] text-muted-foreground">Customers Done</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                {totalCustomers > 0 ? Math.round((completedCustomers / totalCustomers) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Pending */}
      <Card
        className={cn(
          'card-3d border-l-4 border-l-rag-red cursor-pointer transition-all hover:ring-2 hover:ring-rag-red/30',
          isActive('customer-pending') && 'ring-2 ring-rag-red'
        )}
        onClick={() => handleClick('customer-pending')}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-rag-red shrink-0" />
            <div>
              <p className="text-xl font-bold">{pendingCustomers}</p>
              <p className="text-[10px] text-muted-foreground">Customers Pending</p>
              <p className="text-[9px] text-rag-red/70 mt-0.5">
                {totalCustomers > 0 ? Math.round((pendingCustomers / totalCustomers) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
