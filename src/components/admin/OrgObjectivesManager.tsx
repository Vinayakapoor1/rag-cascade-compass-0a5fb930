import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Target, Save, RefreshCw, Loader2 } from 'lucide-react';

interface OrgObjective {
  id: string;
  name: string;
  classification: string;
  color: string;
  description: string | null;
}

const CLASSIFICATION_OPTIONS = ['CORE', 'Enabler'] as const;

const COLOR_OPTIONS = [
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
];

export function OrgObjectivesManager() {
  const [objectives, setObjectives] = useState<OrgObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<OrgObjective>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchObjectives = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('org_objectives')
      .select('id, name, classification, color, description')
      .order('name');

    if (error) {
      toast.error('Failed to load org objectives');
      console.error(error);
    } else {
      setObjectives(data || []);
      setEditedValues({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchObjectives();
  }, []);

  const handleChange = (id: string, field: keyof OrgObjective, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const getDisplayValue = (objective: OrgObjective, field: keyof OrgObjective) => {
    return editedValues[objective.id]?.[field] ?? objective[field];
  };

  const hasChanges = (id: string) => {
    return Object.keys(editedValues[id] || {}).length > 0;
  };

  const handleSave = async (objective: OrgObjective) => {
    const changes = editedValues[objective.id];
    if (!changes) return;

    setSaving(objective.id);
    
    const { error } = await supabase
      .from('org_objectives')
      .update(changes)
      .eq('id', objective.id);

    if (error) {
      toast.error(`Failed to update ${objective.name}`);
      console.error(error);
    } else {
      toast.success(`Updated ${objective.name}`);
      // Update local state
      setObjectives((prev) =>
        prev.map((o) => (o.id === objective.id ? { ...o, ...changes } : o))
      );
      // Clear edited values for this objective
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[objective.id];
        return next;
      });
    }
    setSaving(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Org Objectives</CardTitle>
            <CardDescription>Manage classification and settings for organizational goals</CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchObjectives} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : objectives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No org objectives found. Import data to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead className="w-[25%]">Classification</TableHead>
                  <TableHead className="w-[25%]">Color</TableHead>
                  <TableHead className="w-[10%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objectives.map((objective) => (
                  <TableRow key={objective.id}>
                    <TableCell className="font-medium">{objective.name}</TableCell>
                    <TableCell>
                      <Select
                        value={getDisplayValue(objective, 'classification') as string}
                        onValueChange={(value) => handleChange(objective.id, 'classification', value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSIFICATION_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              <span className={option === 'CORE' ? 'font-semibold' : ''}>
                                {option}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={getDisplayValue(objective, 'color') as string}
                        onValueChange={(value) => handleChange(objective.id, 'color', value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  COLOR_OPTIONS.find(
                                    (c) => c.value === getDisplayValue(objective, 'color')
                                  )?.class || 'bg-gray-500'
                                }`}
                              />
                              <span className="capitalize">
                                {getDisplayValue(objective, 'color')}
                              </span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {COLOR_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${option.class}`} />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSave(objective)}
                        disabled={!hasChanges(objective.id) || saving === objective.id}
                      >
                        {saving === objective.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
