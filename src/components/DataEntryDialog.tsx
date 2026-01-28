import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Calculator, Target, TrendingUp, Clock, User } from 'lucide-react';

interface Indicator {
  id: string;
  name: string;
  tier: string;
  formula: string | null;
  frequency: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  last_updated_at?: string | null;
  last_updated_by?: string | null;
}

interface DataEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: Indicator | null;
}

export function DataEntryDialog({ open, onOpenChange, indicator }: DataEntryDialogProps) {
  const [currentValue, setCurrentValue] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const { logActivity } = useActivityLog();

  const handleSave = async () => {
    if (!indicator || !user) return;

    setSaving(true);
    try {
      const value = parseFloat(currentValue);
      if (isNaN(value)) {
        toast.error('Please enter a valid number');
        return;
      }

      const { error } = await supabase
        .from('indicators')
        .update({
          current_value: value,
          last_updated_by: user.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', indicator.id);

      if (error) throw error;

      await logActivity({
        action: 'update',
        entityType: 'indicator',
        entityId: indicator.id,
        entityName: indicator.name,
        oldValue: { current_value: indicator.current_value },
        newValue: { current_value: value },
        metadata: {
          unit: indicator.unit,
          frequency: indicator.frequency
        }
      });

      toast.success('Value updated successfully');
      queryClient.invalidateQueries({ queryKey: ['org-objectives'] });
      onOpenChange(false);
      setCurrentValue('');
    } catch (error) {
      console.error('Error updating indicator:', error);
      toast.error('Failed to update value');
    } finally {
      setSaving(false);
    }
  };

  if (!indicator) return null;

  const progress = indicator.target_value && indicator.current_value
    ? Math.round((indicator.current_value / indicator.target_value) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Update Indicator Value
          </DialogTitle>
          <DialogDescription>
            Enter your current value for this indicator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Indicator Info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <h4 className="font-medium text-sm">{indicator.name}</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {indicator.tier}
              </Badge>
              {indicator.frequency && (
                <Badge variant="secondary" className="text-xs">
                  {indicator.frequency}
                </Badge>
              )}
            </div>
          </div>

          {/* Last Updated Info */}
          {indicator.last_updated_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              <Clock className="h-3 w-3" />
              <span>Updated {formatDistanceToNow(new Date(indicator.last_updated_at), { addSuffix: true })}</span>
              {indicator.last_updated_by && (
                <>
                  <span className="mx-1">•</span>
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">by {indicator.last_updated_by.slice(0, 8)}...</span>
                </>
              )}
            </div>
          )}

          {/* Formula Display (Read-only) */}
          {indicator.formula && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calculator className="h-3 w-3" />
                Formula
              </Label>
              <div className="p-2 rounded bg-muted text-sm font-mono">
                {indicator.formula}
              </div>
            </div>
          )}

          {/* Target Display */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Target Value
            </Label>
            <div className="p-2 rounded bg-muted text-sm">
              {indicator.target_value ?? 'Not set'} {indicator.unit || ''}
            </div>
          </div>

          {/* Current Value Input */}
          <div className="space-y-1.5">
            <Label htmlFor="current-value">
              Current Value {indicator.unit && `(${indicator.unit})`}
            </Label>
            <Input
              id="current-value"
              type="number"
              step="0.01"
              placeholder={indicator.current_value?.toString() || 'Enter value'}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="text-lg"
            />
            {indicator.current_value !== null && (
              <p className="text-xs text-muted-foreground">
                Previous: {indicator.current_value} {indicator.unit || ''}
              </p>
            )}
          </div>

          {/* Progress Preview */}
          {indicator.target_value && currentValue && (
            <div className="p-2 rounded bg-muted/50 text-sm">
              <span className="text-muted-foreground">New Progress: </span>
              <span className="font-medium">
                {Math.round((parseFloat(currentValue) / indicator.target_value) * 100)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !currentValue}>
            {saving ? 'Saving...' : 'Save Value'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
