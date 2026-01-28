import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface KeyResult {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  owner: string | null;
}

interface EditKeyResultDialogProps {
  keyResult: KeyResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditKeyResultDialog({ keyResult, open, onOpenChange, onSuccess }: EditKeyResultDialogProps) {
  const { logActivity } = useActivityLog();
  const [saving, setSaving] = useState(false);
  const [currentValue, setCurrentValue] = useState<string>('');
  const [targetValue, setTargetValue] = useState<string>('');

  useEffect(() => {
    if (keyResult) {
      setCurrentValue(keyResult.current_value?.toString() || '');
      setTargetValue(keyResult.target_value?.toString() || '');
    }
  }, [keyResult]);

  const handleSave = async () => {
    if (!keyResult) return;

    setSaving(true);
    try {
      const oldValue = {
        current_value: keyResult.current_value,
        target_value: keyResult.target_value
      };

      const newCurrentValue = currentValue ? parseFloat(currentValue) : null;
      const newTargetValue = targetValue ? parseFloat(targetValue) : null;

      const { error } = await supabase
        .from('key_results')
        .update({
          current_value: newCurrentValue,
          target_value: newTargetValue
        })
        .eq('id', keyResult.id);

      if (error) throw error;

      await logActivity({
        action: 'update',
        entityType: 'key_result',
        entityId: keyResult.id,
        entityName: keyResult.name,
        oldValue,
        newValue: { current_value: newCurrentValue, target_value: newTargetValue }
      });

      toast.success('Key Result updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update key result');
    } finally {
      setSaving(false);
    }
  };

  if (!keyResult) return null;

  const progress = keyResult.target_value && keyResult.current_value 
    ? Math.round((keyResult.current_value / keyResult.target_value) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Key Result</DialogTitle>
          <DialogDescription>
            {keyResult.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {keyResult.owner && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Owner
              </Label>
              <div className="col-span-3">{keyResult.owner}</div>
            </div>
          )}
          {keyResult.unit && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Unit
              </Label>
              <div className="col-span-3">{keyResult.unit}</div>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current" className="text-right">
              Current
            </Label>
            <Input
              id="current"
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="col-span-3"
              placeholder="Enter current value"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="target" className="text-right">
              Target
            </Label>
            <Input
              id="target"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="col-span-3"
              placeholder="Enter target value"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Progress
            </Label>
            <div className="col-span-3 text-sm">
              {progress}% ({progress >= 70 ? '🟢 Green' : progress >= 40 ? '🟡 Amber' : '🔴 Red'})
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
