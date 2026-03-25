import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { Target, Save, RefreshCw, Loader2, Plus, Trash2, Building2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface OrgObjective {
  id: string;
  name: string;
  classification: string;
  color: string;
  description: string | null;
}

interface DepartmentMapping {
  id: string;
  name: string;
  org_objective_id: string | null;
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

function OrgObjectivesTable({
  objectives,
  departments,
  editedValues,
  saving,
  onChangeName,
  onChangeField,
  onSave,
  onDelete,
}: {
  objectives: OrgObjective[];
  departments: DepartmentMapping[];
  editedValues: Record<string, Partial<OrgObjective>>;
  saving: string | null;
  onChangeName: (id: string, value: string) => void;
  onChangeField: (id: string, field: keyof OrgObjective, value: string) => void;
  onSave: (objective: OrgObjective) => void;
  onDelete: (objective: OrgObjective) => void;
}) {
  const getDisplayValue = (obj: OrgObjective, field: keyof OrgObjective) =>
    editedValues[obj.id]?.[field] ?? obj[field];

  const hasChanges = (id: string) => Object.keys(editedValues[id] || {}).length > 0;

  const getDeptCount = (objId: string) =>
    departments.filter((d) => d.org_objective_id === objId).length;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Name</TableHead>
            <TableHead className="w-[15%]">Classification</TableHead>
            <TableHead className="w-[15%]">Color</TableHead>
            <TableHead className="w-[15%]">Departments</TableHead>
            <TableHead className="w-[20%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objectives.map((objective) => (
            <TableRow key={objective.id}>
              <TableCell>
                <Input
                  value={(getDisplayValue(objective, 'name') as string) || ''}
                  onChange={(e) => onChangeName(objective.id, e.target.value)}
                  className="h-9"
                />
              </TableCell>
              <TableCell>
                <Select
                  value={getDisplayValue(objective, 'classification') as string}
                  onValueChange={(value) => onChangeField(objective.id, 'classification', value)}
                >
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        <span className={option === 'CORE' ? 'font-semibold' : ''}>{option}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={getDisplayValue(objective, 'color') as string}
                  onValueChange={(value) => onChangeField(objective.id, 'color', value)}
                >
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            COLOR_OPTIONS.find((c) => c.value === getDisplayValue(objective, 'color'))?.class || 'bg-gray-500'
                          }`}
                        />
                        <span className="capitalize">{getDisplayValue(objective, 'color')}</span>
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
              <TableCell>
                <Badge variant="secondary">{getDeptCount(objective.id)}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSave(objective)}
                    disabled={!hasChanges(objective.id) || saving === objective.id}
                  >
                    {saving === objective.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={getDeptCount(objective.id) > 0}
                        title={getDeptCount(objective.id) > 0 ? 'Reassign departments first' : 'Delete objective'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Org Objective</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{objective.name}&quot;? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(objective)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DepartmentMappingTable({
  departments,
  objectives,
  onSaveMapping,
}: {
  departments: DepartmentMapping[];
  objectives: OrgObjective[];
  onSaveMapping: (deptId: string, objId: string | null) => void;
}) {
  const [localMappings, setLocalMappings] = useState<Record<string, string | null>>({});
  const [savingDept, setSavingDept] = useState<string | null>(null);

  const getDisplayMapping = (dept: DepartmentMapping) =>
    localMappings[dept.id] !== undefined ? localMappings[dept.id] : dept.org_objective_id;

  const hasChange = (dept: DepartmentMapping) =>
    localMappings[dept.id] !== undefined && localMappings[dept.id] !== dept.org_objective_id;

  const handleSave = async (dept: DepartmentMapping) => {
    const newObjId = localMappings[dept.id];
    if (newObjId === undefined) return;
    setSavingDept(dept.id);
    try {
      const { error } = await supabase
        .from('departments')
        .update({ org_objective_id: newObjId })
        .eq('id', dept.id);
      if (error) throw error;
      toast.success(`Mapped "${dept.name}" successfully`);
      onSaveMapping(dept.id, newObjId);
      setLocalMappings((prev) => {
        const next = { ...prev };
        delete next[dept.id];
        return next;
      });
    } catch {
      toast.error('Failed to update mapping');
    } finally {
      setSavingDept(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Department</TableHead>
            <TableHead className="w-[45%]">Org Objective</TableHead>
            <TableHead className="w-[15%] text-right">Save</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((dept) => (
            <TableRow key={dept.id}>
              <TableCell className="font-medium">{dept.name}</TableCell>
              <TableCell>
                <Select
                  value={getDisplayMapping(dept) || '__none__'}
                  onValueChange={(value) =>
                    setLocalMappings((prev) => ({
                      ...prev,
                      [dept.id]: value === '__none__' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Select objective..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">— No objective —</span>
                    </SelectItem>
                    {objectives.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              COLOR_OPTIONS.find((c) => c.value === obj.color)?.class || 'bg-gray-500'
                            }`}
                          />
                          <span>{obj.name}</span>
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
                  onClick={() => handleSave(dept)}
                  disabled={!hasChange(dept) || savingDept === dept.id}
                >
                  {savingDept === dept.id ? (
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
  );
}

export function OrgObjectivesManager() {
  const [objectives, setObjectives] = useState<OrgObjective[]>([]);
  const [departments, setDepartments] = useState<DepartmentMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<OrgObjective>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newObj, setNewObj] = useState({ name: '', classification: 'CORE', color: 'green' });
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [objRes, deptRes] = await Promise.all([
      supabase.from('org_objectives').select('id, name, classification, color, description').order('name'),
      supabase.from('departments').select('id, name, org_objective_id').order('name'),
    ]);

    if (objRes.error) {
      toast.error('Failed to load org objectives');
    } else {
      setObjectives(objRes.data || []);
      setEditedValues({});
    }
    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (id: string, field: keyof OrgObjective, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = async (objective: OrgObjective) => {
    const changes = editedValues[objective.id];
    if (!changes) return;
    setSaving(objective.id);
    const { error } = await supabase.from('org_objectives').update(changes).eq('id', objective.id);
    if (error) {
      toast.error(`Failed to update ${objective.name}`);
    } else {
      toast.success(`Updated ${objective.name}`);
      setObjectives((prev) => prev.map((o) => (o.id === objective.id ? { ...o, ...changes } : o)));
      setEditedValues((prev) => { const next = { ...prev }; delete next[objective.id]; return next; });
    }
    setSaving(null);
  };

  const handleDelete = async (objective: OrgObjective) => {
    const { error } = await supabase.from('org_objectives').delete().eq('id', objective.id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(`Deleted "${objective.name}"`);
      setObjectives((prev) => prev.filter((o) => o.id !== objective.id));
    }
  };

  const handleCreate = async () => {
    if (!newObj.name.trim()) { toast.error('Name is required'); return; }
    setCreating(true);
    // Get venture_id from existing objectives or active venture
    let ventureId: string | null = null;
    const existing = objectives.find((o) => o.id);
    if (existing) {
      const { data } = await supabase.from('org_objectives').select('venture_id').eq('id', existing.id).single();
      ventureId = data?.venture_id || null;
    }
    if (!ventureId) {
      const { data } = await supabase.from('ventures').select('id').eq('is_active', true).limit(1).single();
      ventureId = data?.id || null;
    }

    const { data, error } = await supabase
      .from('org_objectives')
      .insert({ name: newObj.name.trim(), classification: newObj.classification, color: newObj.color, venture_id: ventureId })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create');
    } else {
      toast.success(`Created "${data.name}"`);
      setObjectives((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewObj({ name: '', classification: 'CORE', color: 'green' });
      setShowCreate(false);
    }
    setCreating(false);
  };

  const handleMappingSaved = (deptId: string, objId: string | null) => {
    setDepartments((prev) => prev.map((d) => (d.id === deptId ? { ...d, org_objective_id: objId } : d)));
  };

  return (
    <div className="space-y-6">
      {/* Org Objectives CRUD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Org Objectives</CardTitle>
              <CardDescription>Create, rename, delete, and classify organizational goals</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCreate && (
            <div className="flex items-end gap-3 p-4 rounded-lg border bg-muted/30">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  value={newObj.name}
                  onChange={(e) => setNewObj((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Achieve Operational Excellence"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Classification</label>
                <Select value={newObj.classification} onValueChange={(v) => setNewObj((p) => ({ ...p, classification: v }))}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATION_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Color</label>
                <Select value={newObj.color} onValueChange={(v) => setNewObj((p) => ({ ...p, color: v }))}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${o.class}`} />
                          {o.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : objectives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No org objectives found. Click "Add" to create one.
            </div>
          ) : (
            <OrgObjectivesTable
              objectives={objectives}
              departments={departments}
              editedValues={editedValues}
              saving={saving}
              onChangeName={(id, value) => handleChange(id, 'name', value)}
              onChangeField={handleChange}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Department Mapping */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Department → Objective Mapping</CardTitle>
              <CardDescription>Assign each department to an organizational objective</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No departments found.</div>
          ) : (
            <DepartmentMappingTable
              departments={departments}
              objectives={objectives}
              onSaveMapping={handleMappingSaved}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
