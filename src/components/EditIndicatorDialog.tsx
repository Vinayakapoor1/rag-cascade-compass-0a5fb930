import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';
import { Loader2, Building2, Target, Calculator, Clock, Layers } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface IndicatorWithContext {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  tier: string;
  frequency: string | null;
  formula: string | null;
  key_result_id: string | null;
  // Context from joins
  key_result_name?: string;
  functional_objective_name?: string;
  department_name?: string;
}

interface KeyResultOption {
  id: string;
  name: string;
  functional_objective_id: string | null;
  fo_name?: string;
  dept_name?: string;
}

interface EditIndicatorDialogProps {
  indicator: IndicatorWithContext | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditIndicatorDialog({ indicator, open, onOpenChange, onSuccess }: EditIndicatorDialogProps) {
  const { logActivity } = useActivityLog();
  const [saving, setSaving] = useState(false);
  const [loadingKeyResults, setLoadingKeyResults] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [formula, setFormula] = useState('');
  const [frequency, setFrequency] = useState('Monthly');
  const [tier, setTier] = useState('tier1');
  const [currentValue, setCurrentValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [keyResultId, setKeyResultId] = useState<string | null>(null);
  
  // Key results for reassignment
  const [keyResults, setKeyResults] = useState<KeyResultOption[]>([]);

  // Load key results with department context
  useEffect(() => {
    if (open) {
      fetchKeyResults();
    }
  }, [open]);

  // Reset form when indicator changes
  useEffect(() => {
    if (indicator && open) {
      setName(indicator.name || '');
      setFormula(indicator.formula || '');
      setFrequency(indicator.frequency || 'Monthly');
      setTier(indicator.tier || 'tier1');
      setCurrentValue(indicator.current_value?.toString() || '');
      setTargetValue(indicator.target_value?.toString() || '');
      setKeyResultId(indicator.key_result_id);
    }
  }, [indicator, open]);

  const fetchKeyResults = async () => {
    setLoadingKeyResults(true);
    try {
      // Fetch key results with their FO and department context
      const { data: krs, error } = await supabase
        .from('key_results')
        .select(`
          id,
          name,
          functional_objective_id,
          functional_objectives (
            name,
            department_id,
            departments (
              name
            )
          )
        `)
        .order('name');

      if (error) throw error;

      const formattedKRs: KeyResultOption[] = (krs || []).map((kr: any) => ({
        id: kr.id,
        name: kr.name,
        functional_objective_id: kr.functional_objective_id,
        fo_name: kr.functional_objectives?.name || 'Unknown FO',
        dept_name: kr.functional_objectives?.departments?.name || 'Unknown Dept',
      }));

      setKeyResults(formattedKRs);
    } catch (error) {
      console.error('Error fetching key results:', error);
    } finally {
      setLoadingKeyResults(false);
    }
  };

  const handleSave = async () => {
    if (!indicator) return;

    if (!name.trim()) {
      toast.error('Indicator name is required');
      return;
    }

    setSaving(true);
    try {
      const oldValue = {
        name: indicator.name,
        formula: indicator.formula,
        frequency: indicator.frequency,
        tier: indicator.tier,
        current_value: indicator.current_value,
        target_value: indicator.target_value,
        key_result_id: indicator.key_result_id,
      };

      const newCurrentValue = currentValue ? parseFloat(currentValue) : null;
      const newTargetValue = targetValue ? parseFloat(targetValue) : null;

      const updateData = {
        name: name.trim(),
        formula: formula.trim() || null,
        frequency: frequency,
        tier: tier,
        current_value: newCurrentValue,
        target_value: newTargetValue,
        key_result_id: keyResultId,
      };

      const { error } = await supabase
        .from('indicators')
        .update(updateData)
        .eq('id', indicator.id);

      if (error) throw error;

      await logActivity({
        action: 'update',
        entityType: 'indicator',
        entityId: indicator.id,
        entityName: name.trim(),
        oldValue,
        newValue: updateData,
      });

      toast.success('Indicator updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update indicator');
    } finally {
      setSaving(false);
    }
  };

  if (!indicator) return null;

  const progress = targetValue && currentValue 
    ? Math.round((parseFloat(currentValue) / parseFloat(targetValue)) * 100) 
    : 0;

  const selectedKR = keyResults.find(kr => kr.id === keyResultId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Edit Indicator
          </DialogTitle>
          <DialogDescription>
            Update indicator details, formula, and assignment
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Current Context Display */}
          {indicator.department_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Building2 className="h-4 w-4" />
              <span>{indicator.department_name}</span>
              <span className="text-muted-foreground/50">→</span>
              <span>{indicator.functional_objective_name}</span>
              <span className="text-muted-foreground/50">→</span>
              <span>{indicator.key_result_name}</span>
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Basic Information
            </h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Indicator Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter indicator name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier">Tier</Label>
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier1">Tier 1 (Leading)</SelectItem>
                      <SelectItem value="tier2">Tier 2 (Lagging)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Frequency
                  </Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Formula Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Formula
            </h4>
            <Textarea
              id="formula"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="e.g., (Active Users / Total Users) × 100"
              rows={2}
            />
          </div>

          <Separator />

          {/* Values Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Values
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Value</Label>
                <Input
                  id="current"
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">Target Value</Label>
                <Input
                  id="target"
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Progress: <span className="font-medium">{progress}%</span>
              {' '}
              ({progress >= 70 ? '🟢 On Track' : progress >= 40 ? '🟡 At Risk' : '🔴 Off Track'})
            </div>
          </div>

          <Separator />

          {/* Assignment Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Assignment
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="keyResult">Assign to Key Result</Label>
              {loadingKeyResults ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading key results...
                </div>
              ) : (
                <Select value={keyResultId || ''} onValueChange={(val) => setKeyResultId(val || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Key Result" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {keyResults.map((kr) => (
                      <SelectItem key={kr.id} value={kr.id}>
                        <div className="flex flex-col">
                          <span className="truncate max-w-[400px]">{kr.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {kr.dept_name} → {kr.fo_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {selectedKR && (
                <p className="text-xs text-muted-foreground">
                  Will be assigned to: {selectedKR.dept_name} → {selectedKR.fo_name}
                </p>
              )}
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
