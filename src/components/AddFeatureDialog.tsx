import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  categories?: string[];
}

export function AddFeatureDialog({ 
  open, 
  onOpenChange, 
  onSave,
  categories = []
}: AddFeatureDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);
  const { logActivity } = useActivityLog();

  const resetForm = () => {
    setName('');
    setCategory('');
    setDescription('');
    setStatus('Active');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Feature name is required');
      return;
    }

    setSaving(true);
    try {
      const newFeature = {
        name: name.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        status,
      };

      const { data, error } = await supabase
        .from('features')
        .insert(newFeature)
        .select('id')
        .single();

      if (error) throw error;

      await logActivity({
        action: 'create',
        entityType: 'indicator', // Using 'indicator' as closest match for features
        entityId: data.id,
        entityName: name.trim(),
        newValue: newFeature,
        metadata: { featureCreation: true },
      });

      toast.success('Feature created successfully');
      resetForm();
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating feature:', error);
      toast.error('Failed to create feature: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Feature</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Name *</Label>
            <Input
              id="add-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Feature name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select or type a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Or type a new category..."
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-description">Description</Label>
            <Textarea
              id="add-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Feature description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Feature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}