import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, RefreshCw, Eye, Download, Trash2, Play, Database } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ── Snapshot types & sub-component ──────────────────────────────

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

interface Backup {
  id: string;
  created_at: string;
  backup_type: string;
  tables_included: string[];
  row_counts: Record<string, number> | null;
  size_bytes: number | null;
}

interface SnapshotsTabProps {
  isAdmin: boolean;
}

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

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Calculation Snapshots Section ───────────────────────────────

function CalculationSnapshotsSection() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

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
        explainability: s.snapshot_explainability?.[0] || null,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchSnapshots(); }, []);

  return (
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
                        <span className="text-rag-red ml-1">(-{snapshot.rejected_records})</span>
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
                      onClick={() => { setSelectedSnapshot(snapshot); setDetailDialogOpen(true); }}
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
    </Card>
  );
}

// ── Backups Section ─────────────────────────────────────────────

function BackupsSection() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('daily_backups')
      .select('id, created_at, backup_type, tables_included, row_counts, size_bytes')
      .order('created_at', { ascending: false })
      .limit(30);

    setBackups((data as Backup[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchBackups(); }, []);

  const runBackupNow = async () => {
    setRunningBackup(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/daily-backup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ manual: true }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success(`Backup complete — ${result.total_rows} rows across ${result.tables} tables (${result.size_mb} MB)`);
        fetchBackups();
      } else {
        toast.error(`Backup failed: ${result.error}`);
      }
    } catch (err: any) {
      toast.error(`Backup error: ${err.message}`);
    } finally {
      setRunningBackup(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    const { data, error } = await supabase
      .from('daily_backups')
      .select('data, created_at')
      .eq('id', backupId)
      .single();

    if (error || !data) {
      toast.error('Failed to download backup');
      return;
    }

    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${format(new Date(data.created_at), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteBackup = async (backupId: string) => {
    const { error } = await supabase.from('daily_backups').delete().eq('id', backupId);
    if (error) {
      toast.error('Failed to delete backup');
    } else {
      toast.success('Backup deleted');
      setBackups((prev) => prev.filter((b) => b.id !== backupId));
    }
  };

  const totalRows = (rc: Record<string, number> | null) =>
    rc ? Object.values(rc).reduce((a, b) => a + b, 0) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Backups
            </CardTitle>
            <CardDescription>
              Daily midnight snapshots of all critical tables. Retained for 30 days.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchBackups}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={runBackupNow} disabled={runningBackup}>
              {runningBackup ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Run Backup Now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No backups yet. Click "Run Backup Now" or wait for the scheduled midnight run.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Tables</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-medium">
                    {format(new Date(backup.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={backup.backup_type === 'scheduled' ? 'outline' : 'secondary'}>
                      {backup.backup_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{backup.tables_included.length}</TableCell>
                  <TableCell className="text-right font-mono">{totalRows(backup.row_counts)}</TableCell>
                  <TableCell className="text-right">{formatBytes(backup.size_bytes)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => downloadBackup(backup.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteBackup(backup.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ──────────────────────────────────────────────

export function SnapshotsTab({ isAdmin }: SnapshotsTabProps) {
  return (
    <Tabs defaultValue="snapshots" className="space-y-4">
      <TabsList>
        <TabsTrigger value="snapshots">Calculation Snapshots</TabsTrigger>
        <TabsTrigger value="backups">Data Backups</TabsTrigger>
      </TabsList>
      <TabsContent value="snapshots">
        <CalculationSnapshotsSection />
      </TabsContent>
      <TabsContent value="backups">
        <BackupsSection />
      </TabsContent>
    </Tabs>
  );
}
