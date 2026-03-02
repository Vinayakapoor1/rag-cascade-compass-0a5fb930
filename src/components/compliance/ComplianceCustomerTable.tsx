import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ArrowUpDown, ChevronRight, TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ComplianceCustomerDetail, type ScoreRecord } from './ComplianceCustomerDetail';
import { cn } from '@/lib/utils';
import type { ComplianceFilter } from './ComplianceSummaryCards';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface CustomerRow {
  customerId: string;
  customerName: string;
  csmName: string;
  csmEmail: string | null;
  scoresThisPeriod: number;
  totalExpected: number;
  lastEverSubmission: string | null;
  status: 'complete' | 'partial' | 'pending';
  currentAvg: number | null;
  previousAvg: number | null;
  isManagedServices: boolean;
}

type SortField = 'customerName' | 'csmName' | 'status' | 'scoresThisPeriod' | 'currentAvg';
type SortDir = 'asc' | 'desc';
type TypeFilter = 'all' | 'csm' | 'cm';

function percentToRAG(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 76) return 'green';
  if (pct >= 51) return 'amber';
  return 'red';
}

const RAG_BADGE_STYLES: Record<string, string> = {
  green: 'bg-rag-green/15 text-rag-green border-rag-green/30',
  amber: 'bg-rag-amber/15 text-rag-amber border-rag-amber/30',
  red: 'bg-rag-red/15 text-rag-red border-rag-red/30',
};

interface ComplianceCustomerTableProps {
  rows: CustomerRow[];
  periodLabel: string;
  customerFeaturesMap: Map<string, string[]>;
  featureNameMap: Map<string, string>;
  indicatorFeatureLinks: { indicator_id: string; feature_id: string }[];
  detailedScores: ScoreRecord[];
  period: string;
  externalFilter?: ComplianceFilter;
}

export function ComplianceCustomerTable({
  rows, periodLabel,
  customerFeaturesMap, featureNameMap, indicatorFeatureLinks, detailedScores, period,
  externalFilter,
}: ComplianceCustomerTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Compute which CSMs have submitted vs pending for external filter
  const csmSubmittedSet = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.status !== 'pending') set.add(r.csmName); });
    return set;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = rows.filter(
      r => r.customerName.toLowerCase().includes(q) || r.csmName.toLowerCase().includes(q)
    );

    if (typeFilter === 'cm') result = result.filter(r => r.isManagedServices);
    else if (typeFilter === 'csm') result = result.filter(r => !r.isManagedServices);

    // Apply external card filter
    if (externalFilter === 'csm-submitted') {
      result = result.filter(r => csmSubmittedSet.has(r.csmName));
    } else if (externalFilter === 'csm-pending') {
      result = result.filter(r => !csmSubmittedSet.has(r.csmName));
    } else if (externalFilter === 'customer-complete') {
      result = result.filter(r => r.status !== 'pending');
    } else if (externalFilter === 'customer-pending') {
      result = result.filter(r => r.status === 'pending');
    }

    const statusOrder = { pending: 0, partial: 1, complete: 2 };
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'status') {
        cmp = statusOrder[a.status] - statusOrder[b.status];
      } else if (sortField === 'scoresThisPeriod') {
        cmp = a.scoresThisPeriod - b.scoresThisPeriod;
      } else if (sortField === 'currentAvg') {
        cmp = (a.currentAvg ?? -1) - (b.currentAvg ?? -1);
      } else {
        cmp = a[sortField].localeCompare(b[sortField]);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [rows, search, sortField, sortDir, typeFilter, externalFilter, csmSubmittedSet]);

  const hasCM = rows.some(r => r.isManagedServices);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground" onClick={() => toggleSort(field)}>
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg">Per-Customer Breakdown — {periodLabel}</CardTitle>
          <div className="flex items-center gap-2">
            {hasCM && (
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-[220px] h-9">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="csm">CSM Only</SelectItem>
                  <SelectItem value="cm">Content Management Only</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer or CSM..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead><SortButton field="customerName" label="Customer" /></TableHead>
                <TableHead><SortButton field="csmName" label="CSM" /></TableHead>
                <TableHead className="text-center"><SortButton field="scoresThisPeriod" label="Scores" /></TableHead>
                <TableHead className="text-center"><SortButton field="currentAvg" label="Trend" /></TableHead>
                <TableHead>Last Submission</TableHead>
                <TableHead className="text-center"><SortButton field="status" label="Status" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search ? 'No results match your search' : 'No data available'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(row => {
                  const isExpanded = expandedIds.has(row.customerId);
                  const customerFeatureIds = customerFeaturesMap.get(row.customerId) || [];
                  const currRag = row.currentAvg != null ? percentToRAG(row.currentAvg) : null;
                  const prevRag = row.previousAvg != null ? percentToRAG(row.previousAvg) : null;
                  return (
                    <Collapsible key={row.customerId} open={isExpanded} onOpenChange={() => toggleExpand(row.customerId)} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer">
                            <TableCell className="w-8 px-2">
                              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                {row.customerName}
                                {row.isManagedServices && (
                                  <Badge className="text-[9px] bg-primary/15 text-primary border-none px-1.5">Content Management</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="text-sm">{row.csmName}</span>
                                {row.csmEmail && <p className="text-[10px] text-muted-foreground">{row.csmEmail}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-mono">
                                {row.scoresThisPeriod}/{row.totalExpected}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {row.previousAvg != null && row.currentAvg != null && prevRag && currRag ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Badge variant="outline" className={cn(RAG_BADGE_STYLES[prevRag], 'text-[9px] opacity-60 px-1.5')}>
                                    {row.previousAvg}%
                                  </Badge>
                                  <span className="text-muted-foreground text-[10px]">→</span>
                                  <Badge variant="outline" className={cn(RAG_BADGE_STYLES[currRag], 'text-[9px] px-1.5')}>
                                    {row.currentAvg}%
                                  </Badge>
                                  {row.currentAvg > row.previousAvg ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-rag-green" />
                                  ) : row.currentAvg < row.previousAvg ? (
                                    <TrendingDown className="h-3.5 w-3.5 text-rag-red" />
                                  ) : (
                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>
                              ) : row.currentAvg != null && currRag ? (
                                <Badge variant="outline" className={cn(RAG_BADGE_STYLES[currRag], 'text-[9px] px-1.5')}>
                                  {row.currentAvg}%
                                </Badge>
                              ) : row.previousAvg != null && prevRag ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[9px] text-muted-foreground">Last:</span>
                                  <Badge variant="outline" className={cn(RAG_BADGE_STYLES[prevRag], 'text-[9px] opacity-60 px-1.5')}>
                                    {row.previousAvg}%
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {row.lastEverSubmission
                                ? formatDistanceToNow(new Date(row.lastEverSubmission), { addSuffix: true })
                                : 'Never'}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.status === 'complete' && (
                                <Badge className="bg-rag-green/15 text-rag-green border-rag-green/30 text-[10px]">
                                  Submitted
                                </Badge>
                              )}
                              {row.status === 'partial' && (
                                <Badge className="bg-rag-amber/15 text-rag-amber border-rag-amber/30 text-[10px]">
                                  Partial
                                </Badge>
                              )}
                              {row.status === 'pending' && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={7} className="p-0 border-b">
                              <ComplianceCustomerDetail
                                customerId={row.customerId}
                                customerFeatureIds={customerFeatureIds}
                                featureMap={featureNameMap}
                                indicatorFeatureLinks={indicatorFeatureLinks}
                                scores={detailedScores}
                                period={period}
                              />
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}