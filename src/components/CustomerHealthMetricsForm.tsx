import { useState } from 'react';
import { useUpsertHealthMetric, useCustomerHealthMetrics } from '@/hooks/useCustomerHealthMetrics';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const RAG_OPTIONS = [
  { value: '1', label: 'Green', color: 'bg-rag-green' },
  { value: '0.5', label: 'Amber', color: 'bg-rag-amber' },
  { value: '0', label: 'Red', color: 'bg-rag-red' },
];

interface Props {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerHealthMetricsForm({ customerId, open, onOpenChange }: Props) {
  const currentPeriod = format(new Date(), 'yyyy-MM');
  const [period, setPeriod] = useState(currentPeriod);
  const [bugCount, setBugCount] = useState('');
  const [bugSla, setBugSla] = useState('');
  const [promises, setPromises] = useState('');
  const [nfrSla, setNfrSla] = useState('');
  const [notes, setNotes] = useState('');

  const { data: existingMetrics } = useCustomerHealthMetrics(customerId);
  const upsert = useUpsertHealthMetric();

  const loadExisting = (p: string) => {
    const existing = existingMetrics?.find(m => m.period === p);
    if (existing) {
      setBugCount(existing.bug_count != null ? String(existing.bug_count) : '');
      setBugSla(existing.bug_sla_compliance != null ? String(existing.bug_sla_compliance) : '');
      setPromises(existing.promises_made != null ? String(existing.promises_made) : '');
      setNfrSla(existing.new_feature_requests != null ? String(existing.new_feature_requests) : '');
      setNotes(existing.notes || '');
    } else {
      setBugCount(''); setBugSla(''); setPromises(''); setNfrSla(''); setNotes('');
    }
  };

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        customer_id: customerId,
        period,
        bug_count: bugCount ? Number(bugCount) : null,
        bug_sla_compliance: bugSla ? Number(bugSla) : null,
        promises_made: promises ? Number(promises) : null,
        promises_delivered: null,
        new_feature_requests: nfrSla ? Number(nfrSla) : null,
        notes: notes.trim() || null,
      });
      toast.success('Health metrics saved');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Operational Health Metrics</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Period</Label>
            <Input
              type="month"
              value={period}
              onChange={(e) => { setPeriod(e.target.value); loadExisting(e.target.value); }}
            />
          </div>

          <div>
            <Label>Bug Count (monthly)</Label>
            <Input type="number" min={0} max={9999} value={bugCount} onChange={e => setBugCount(e.target.value)} placeholder="e.g. 3" />
            <p className="text-xs text-muted-foreground mt-1">&lt;5 Green, 5-10 Amber, &gt;10 Red</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Bug SLA</Label>
              <Select value={bugSla || 'unset'} onValueChange={(v) => setBugSla(v === 'unset' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">—</SelectItem>
                  {RAG_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', o.color)} />
                        {o.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Promises</Label>
              <Select value={promises || 'unset'} onValueChange={(v) => setPromises(v === 'unset' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">—</SelectItem>
                  {RAG_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', o.color)} />
                        {o.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>NFR SLA</Label>
              <Select value={nfrSla || 'unset'} onValueChange={(v) => setNfrSla(v === 'unset' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">—</SelectItem>
                  {RAG_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', o.color)} />
                        {o.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} rows={2} />
          </div>

          <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
            {upsert.isPending ? 'Saving...' : 'Save Metrics'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
