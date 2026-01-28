import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, RefreshCw, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface Snapshot {
  id: string;
  indicator_id: string;
  period: string;
  calculated_value: number | null;
  rag_status: string | null;
  total_records_processed: number;
  valid_records: number;
  rejected_records: number;
  calculated_at: string;
  indicator_name?: string;
  explainability?: {
    total_customers: number;
    count_red: number;
    count_amber: number;
    count_green: number;
    filters_applied: Record<string, any>;
  };
}

interface SnapshotsTabProps {
  isAdmin: boolean;
}

export function SnapshotsTab({ isAdmin }: SnapshotsTabProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    setLoading(true);

    const { data: snapshotsData } = await supabase
      .from('indicator_snapshots')
      .select(`
        id, indicator_id, period, calculated_value, rag_status,
        total_records_processed, valid_records, rejected_records, calculated_at,
        indicators (name),
        snapshot_explainability (
          total_customers, count_red, count_amber, count_green, filters_applied
        )
      `)
      .order('calculated_at', { ascending: false })
      .limit(100);

    if (snapshotsData) {
      setSnapshots(snapshotsData.map((s: any) => ({
        ...s,
        indicator_name: s.indicators?.name,
        explainability: s.snapshot_explainability?.[0] || null
      })));
    }

    setLoading(false);
  };

  const openDetailDialog = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setDetailDialogOpen(true);
  };

  const getRAGBadge = (status: string | null) => {
    switch (status) {
      case 'green':
        return <Badge className="bg-rag-green text-rag-green-foreground">Green</Badge>;
      case 'amber':
        return <Badge className="bg-rag-amber text-rag-amber-foreground">Amber</Badge>;
      case 'red':
        return <Badge className="bg-rag-red text-rag-red-foreground">Red</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Calculation Snapshots
              </CardTitle>
              <CardDescription>
                Immutable history of indicator calculations. Snapshots are never modified.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSnapshots}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No calculation snapshots yet. Run calculations to generate snapshots.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicator</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>RAG</TableHead>
                  <TableHead className="text-center">Records</TableHead>
                  <TableHead>Calculated</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">
                      {snapshot.indicator_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{snapshot.period}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {snapshot.calculated_value?.toFixed(2) ?? '-'}
                    </TableCell>
                    <TableCell>{getRAGBadge(snapshot.rag_status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <span className="text-rag-green">{snapshot.valid_records}</span>
                        <span>/</span>
                        <span className="text-muted-foreground">{snapshot.total_records_processed}</span>
                        {snapshot.rejected_records > 0 && (
                          <span className="text-rag-red ml-1">
                            (-{snapshot.rejected_records})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(snapshot.calculated_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openDetailDialog(snapshot)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Snapshot Details</DialogTitle>
          </DialogHeader>
          {selectedSnapshot && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Indicator</div>
                  <div className="font-medium">{selectedSnapshot.indicator_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Period</div>
                  <div className="font-medium">{selectedSnapshot.period}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Calculated Value</div>
                  <div className="text-2xl font-bold">
                    {selectedSnapshot.calculated_value?.toFixed(2) ?? '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">RAG Status</div>
                  <div className="mt-1">{getRAGBadge(selectedSnapshot.rag_status)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Records Processed</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-2 rounded bg-muted">
                    <div className="font-bold">{selectedSnapshot.total_records_processed}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center p-2 rounded bg-rag-green-muted">
                    <div className="font-bold text-rag-green">{selectedSnapshot.valid_records}</div>
                    <div className="text-xs text-muted-foreground">Valid</div>
                  </div>
                  <div className="text-center p-2 rounded bg-rag-red-muted">
                    <div className="font-bold text-rag-red">{selectedSnapshot.rejected_records}</div>
                    <div className="text-xs text-muted-foreground">Rejected</div>
                  </div>
                </div>
              </div>

              {selectedSnapshot.explainability && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Explainability Breakdown</div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded bg-muted">
                      <div className="font-bold">{selectedSnapshot.explainability.total_customers}</div>
                      <div className="text-xs text-muted-foreground">Customers</div>
                    </div>
                    <div className="text-center p-2 rounded bg-rag-green-muted">
                      <div className="font-bold text-rag-green">{selectedSnapshot.explainability.count_green}</div>
                      <div className="text-xs text-muted-foreground">Green</div>
                    </div>
                    <div className="text-center p-2 rounded bg-rag-amber-muted">
                      <div className="font-bold text-rag-amber">{selectedSnapshot.explainability.count_amber}</div>
                      <div className="text-xs text-muted-foreground">Amber</div>
                    </div>
                    <div className="text-center p-2 rounded bg-rag-red-muted">
                      <div className="font-bold text-rag-red">{selectedSnapshot.explainability.count_red}</div>
                      <div className="text-xs text-muted-foreground">Red</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Calculated: {format(new Date(selectedSnapshot.calculated_at), 'PPpp')}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
