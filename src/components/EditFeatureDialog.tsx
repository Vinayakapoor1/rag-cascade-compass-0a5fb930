import { useState, useEffect } from 'react';
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

interface Feature {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  status: string | null;
}

interface EditFeatureDialogProps {
  feature: Feature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  categories?: string[];
}

export function EditFeatureDialog({ 
  feature, 
  open, 
  onOpenChange, 
  onSave,
  categories = []
}: EditFeatureDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);
  const { logActivity } = useActivityLog();

  useEffect(() => {
    if (feature) {
      setName(feature.name);
      setCategory(feature.category || '');
      setDescription(feature.description || '');
      setStatus(feature.status || 'Active');
    }
  }, [feature]);

  const handleSave = async () => {
    if (!feature || !name.trim()) {
      toast.error('Feature name is required');
      return;
    }

    setSaving(true);
    try {
      const oldValue = {
        name: feature.name,
        category: feature.category,
        description: feature.description,
        status: feature.status,
      };

      const newValue = {
        name: name.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        status,
      };

      const { error } = await supabase
        .from('features')
        .update({
          ...newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feature.id);

      if (error) throw error;

      await logActivity({
        action: 'update',
        entityType: 'indicator', // Using 'indicator' as closest match for features
        entityId: feature.id,
        entityName: name.trim(),
        oldValue,
        newValue,
        metadata: { featureUpdate: true },
      });

      toast.success('Feature updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating feature:', error);
      toast.error('Failed to update feature: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Feature</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Feature name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Feature description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}