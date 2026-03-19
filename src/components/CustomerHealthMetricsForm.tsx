import { useState } from 'react';
import { useUpsertHealthMetric, useCustomerHealthMetrics } from '@/hooks/useCustomerHealthMetrics';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';

const schema = z.object({
  bug_count: z.number().int().min(0).max(9999).nullable(),
  bug_sla_compliance: z.number().min(0).max(100).nullable(),
  promises_made: z.number().int().min(0).max(9999).nullable(),
  promises_delivered: z.number().int().min(0).max(9999).nullable(),
  nfr_compliance: z.number().min(0).max(100).nullable(),
  notes: z.string().max(1000).nullable(),
});

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
  const [promisesMade, setPromisesMade] = useState('');
  const [promisesDelivered, setPromisesDelivered] = useState('');
  const [nfrCompliance, setNfrCompliance] = useState('');
  const [notes, setNotes] = useState('');

  const { data: existingMetrics } = useCustomerHealthMetrics(customerId);
  const upsert = useUpsertHealthMetric();

  // Pre-fill when period changes
  const loadExisting = (p: string) => {
    const existing = existingMetrics?.find(m => m.period === p);
    if (existing) {
      setBugCount(existing.bug_count != null ? String(existing.bug_count) : '');
      setBugSla(existing.bug_sla_compliance != null ? String(existing.bug_sla_compliance) : '');
      setPromisesMade(existing.promises_made != null ? String(existing.promises_made) : '');
      setPromisesDelivered(existing.promises_delivered != null ? String(existing.promises_delivered) : '');
      setNfrCompliance(existing.nfr_compliance != null ? String(existing.nfr_compliance) : '');
      setNotes(existing.notes || '');
    } else {
      setBugCount(''); setBugSla(''); setPromisesMade('');
      setPromisesDelivered(''); setNfrCompliance(''); setNotes('');
    }
  };

  const handleSave = async () => {
    const input = {
      bug_count: bugCount ? Number(bugCount) : null,
      bug_sla_compliance: bugSla ? Number(bugSla) : null,
      promises_made: promisesMade ? Number(promisesMade) : null,
      promises_delivered: promisesDelivered ? Number(promisesDelivered) : null,
      nfr_compliance: nfrCompliance ? Number(nfrCompliance) : null,
      notes: notes.trim() || null,
    };

    const result = schema.safeParse(input);
    if (!result.success) {
      toast.error('Invalid input: ' + result.error.issues.map(i => i.message).join(', '));
      return;
    }

    if (input.promises_delivered != null && input.promises_made != null && input.promises_delivered > input.promises_made) {
      toast.error('Promises delivered cannot exceed promises made');
      return;
    }

    try {
      await upsert.mutateAsync({ customer_id: customerId, period, ...input });
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bug Count (monthly)</Label>
              <Input type="number" min={0} max={9999} value={bugCount} onChange={e => setBugCount(e.target.value)} placeholder="e.g. 3" />
              <p className="text-xs text-muted-foreground mt-1">&lt;5 Green, 5-10 Amber, &gt;10 Red</p>
            </div>
            <div>
              <Label>Bug SLA Compliance (%)</Label>
              <Input type="number" min={0} max={100} value={bugSla} onChange={e => setBugSla(e.target.value)} placeholder="e.g. 85" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Promises Made</Label>
              <Input type="number" min={0} max={9999} value={promisesMade} onChange={e => setPromisesMade(e.target.value)} placeholder="e.g. 10" />
            </div>
            <div>
              <Label>Promises Delivered</Label>
              <Input type="number" min={0} max={9999} value={promisesDelivered} onChange={e => setPromisesDelivered(e.target.value)} placeholder="e.g. 8" />
            </div>
          </div>

          <div>
            <Label>NFR Compliance (%)</Label>
            <Input type="number" min={0} max={100} value={nfrCompliance} onChange={e => setNfrCompliance(e.target.value)} placeholder="e.g. 90" />
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
