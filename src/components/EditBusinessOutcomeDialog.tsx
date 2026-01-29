import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface EditBusinessOutcomeDialogProps {
  orgObjectiveId: string | null;
  currentValue: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditBusinessOutcomeDialog({
  orgObjectiveId,
  currentValue,
  open,
  onOpenChange,
  onSuccess
}: EditBusinessOutcomeDialogProps) {
  const { user } = useAuth();
  const [value, setValue] = useState(currentValue || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!orgObjectiveId) {
      toast.error('No org objective selected');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('org_objectives')
        .update({ business_outcome: value || null })
        .eq('id', orgObjectiveId);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user?.id,
        action: 'update',
        entity_type: 'org_objective',
        entity_id: orgObjectiveId,
        entity_name: 'Business Outcome',
        old_value: { value: currentValue },
        new_value: { value: value || null },
        metadata: {
          user_email: user?.email
        }
      });

      toast.success('Business outcome updated');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating business outcome:', error);
      toast.error('Failed to update business outcome');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Business Outcome</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="business-outcome">Business Outcome</Label>
            <Input
              id="business-outcome"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g., 3X Revenue"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
