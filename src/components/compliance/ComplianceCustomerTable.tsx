import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export interface CustomerRow {
  customerId: string;
  customerName: string;
  csmName: string;
  csmEmail: string | null;
  scoresThisPeriod: number;
  totalExpected: number;
  lastEverSubmission: string | null;
  status: 'complete' | 'partial' | 'pending';
}

type SortField = 'customerName' | 'csmName' | 'status' | 'scoresThisPeriod';
type SortDir = 'asc' | 'desc';

interface ComplianceCustomerTableProps {
  rows: CustomerRow[];
  periodLabel: string;
}

export function ComplianceCustomerTable({ rows, periodLabel }: ComplianceCustomerTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = rows.filter(
      r => r.customerName.toLowerCase().includes(q) || r.csmName.toLowerCase().includes(q)
    );

    const statusOrder = { pending: 0, partial: 1, complete: 2 };
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'status') {
        cmp = statusOrder[a.status] - statusOrder[b.status];
      } else if (sortField === 'scoresThisPeriod') {
        cmp = a.scoresThisPeriod - b.scoresThisPeriod;
      } else {
        cmp = a[sortField].localeCompare(b[sortField]);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [rows, search, sortField, sortDir]);

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
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortButton field="customerName" label="Customer" /></TableHead>
                <TableHead><SortButton field="csmName" label="CSM" /></TableHead>
                <TableHead className="text-center"><SortButton field="scoresThisPeriod" label="Scores" /></TableHead>
                <TableHead>Last Submission</TableHead>
                <TableHead className="text-center"><SortButton field="status" label="Status" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search ? 'No results match your search' : 'No data available'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(row => (
                  <TableRow key={row.customerId}>
                    <TableCell className="font-medium">{row.customerName}</TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
