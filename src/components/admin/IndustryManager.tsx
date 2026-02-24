import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Factory, Plus, X, Loader2, Pencil, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Industry {
  id: string;
  name: string;
}

export function IndustryManager() {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchIndustries = async () => {
    const { data } = await supabase.from('industries').select('id, name').order('name');
    setIndustries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchIndustries(); }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (industries.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Industry already exists');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('industries').insert({ name: trimmed });
    setAdding(false);
    if (error) {
      toast.error('Failed to add industry');
    } else {
      toast.success(`Added "${trimmed}"`);
      setNewName('');
      fetchIndustries();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from('industries').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete — industry may be in use');
    } else {
      toast.success(`Deleted "${name}"`);
      fetchIndustries();
    }
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (industries.some(i => i.id !== editingId && i.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Industry name already exists');
      return;
    }
    const { error } = await supabase.from('industries').update({ name: trimmed }).eq('id', editingId);
    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success('Updated');
      setEditingId(null);
      fetchIndustries();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Manage Industries
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add, edit or remove industries that can be assigned to customers.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type new industry name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="max-w-xs"
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : industries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No industries yet. Add one above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {industries.map(ind => (
              <div key={ind.id} className="group">
                {editingId === ind.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditSave();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="h-7 w-40 text-xs"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEditSave}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="secondary" className="gap-1 pr-1 text-sm font-normal">
                    {ind.name}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { setEditingId(ind.id); setEditName(ind.name); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => handleDelete(ind.id, ind.name)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
