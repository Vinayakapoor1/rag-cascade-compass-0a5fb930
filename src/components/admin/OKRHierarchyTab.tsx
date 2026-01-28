import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Pencil, Save, X, Trash2, RefreshCw, Plus, Search, Loader2, FolderTree, Target, BarChart3, HelpCircle, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
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

interface Indicator {
  id: string;
  name: string;
  formula: string | null;
  frequency: string | null;
  tier: string;
  unit: string | null;
  target_value: number | null;
  current_value: number | null;
}

interface KeyResult {
  id: string;
  name: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  indicators: Indicator[];
}

interface FunctionalObjective {
  id: string;
  name: string;
  owner: string | null;
  key_results: KeyResult[];
}

interface Department {
  id: string;
  name: string;
  org_objective_id: string | null;
  color: string;
  functional_objectives: FunctionalObjective[];
}

type SelectedItem = 
  | { type: 'department'; data: Department }
  | { type: 'fo'; data: FunctionalObjective; departmentId: string }
  | { type: 'kr'; data: KeyResult; foId: string }
  | { type: 'indicator'; data: Indicator; krId: string }
  | null;

const DEPARTMENT_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
];

function getColorClass(color: string): string {
  const colorMap = DEPARTMENT_COLORS.find(c => c.value === color);
  return colorMap?.class || 'bg-gray-500';
}

function calculateRAGStatus(current: number | null, target: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (current === null || target === null || target === 0) return 'gray';
  const progress = (current / target) * 100;
  if (progress >= 76) return 'green';
  if (progress >= 51) return 'amber';
  return 'red';
}

function RAGBadge({ status }: { status: 'green' | 'amber' | 'red' | 'gray' }) {
  const colors = {
    green: 'bg-rag-green text-rag-green-foreground',
    amber: 'bg-rag-amber text-rag-amber-foreground',
    red: 'bg-rag-red text-rag-red-foreground',
    gray: 'bg-muted text-muted-foreground',
  };
  const labels = { green: 'On Track', amber: 'At Risk', red: 'Off Track', gray: 'No Data' };
  return <Badge className={`${colors[status]} text-xs`}>{labels[status]}</Badge>;
}

// Tree Node Component
function TreeNode({ 
  icon, 
  label, 
  badge,
  isSelected, 
  onClick,
  onExpand,
  isExpanded,
  hasChildren,
  level,
  colorDot,
  ragStatus
}: { 
  icon: string;
  label: string;
  badge?: string;
  isSelected: boolean;
  onClick: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  hasChildren?: boolean;
  level: number;
  colorDot?: string;
  ragStatus?: 'green' | 'amber' | 'red' | 'gray';
}) {
  return (
    <div 
      className={`flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-colors ${
        isSelected 
          ? 'bg-primary/10 border border-primary/30' 
          : 'hover:bg-muted/50'
      }`}
      style={{ paddingLeft: `${12 + level * 16}px` }}
      onClick={onClick}
    >
      {hasChildren && (
        <button 
          onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
          className="text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      )}
      {!hasChildren && <span className="w-4" />}
      {colorDot && <div className={`w-3 h-3 rounded-full ${colorDot}`} />}
      <span className="text-sm">{icon}</span>
      <span className={`text-sm flex-1 truncate ${isSelected ? 'font-medium' : ''}`}>{label}</span>
      {ragStatus && <RAGBadge status={ragStatus} />}
      {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
    </div>
  );
}

// Edit Panel Components
function DepartmentEditPanel({ 
  dept, 
  onSave, 
  onDelete,
  onClose 
}: { 
  dept: Department; 
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [color, setColor] = useState(dept.color);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update the department's own color
      const { error } = await supabase
        .from('departments')
        .update({ color })
        .eq('id', dept.id);
      
      if (error) {
        console.error('Error updating department color:', error);
        toast.error('Failed to update department: ' + error.message);
        return;
      }
      
      toast.success('Department color updated');
      onSave();
    } catch (error) {
      console.error('Exception updating department:', error);
      toast.error('Failed to update department');
    } finally {
      setSaving(false);
    }
  };

  const totalKPIs = dept.functional_objectives.reduce(
    (sum, fo) => sum + fo.key_results.reduce((s, kr) => s + kr.indicators.length, 0), 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          📁 {dept.name}
          <Badge variant="secondary">Department</Badge>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {dept.functional_objectives.length} Functional Objectives • {totalKPIs} KPIs
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Department Color</label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${c.class}`} />
                    {c.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Department</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete "{dept.name}" and ALL its objectives, key results, and indicators. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function FOEditPanel({ 
  fo, 
  onSave, 
  onDelete,
  onClose 
}: { 
  fo: FunctionalObjective; 
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(fo.name);
  const [owner, setOwner] = useState(fo.owner || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('functional_objectives').update({ name, owner: owner || null }).eq('id', fo.id);
      toast.success('Functional Objective updated');
      onSave();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          📋 Functional Objective
          <Badge variant="secondary">FO</Badge>
        </h3>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Objective name" />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Owner</label>
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g., John Smith" />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Functional Objective</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete "{fo.name}" and all its key results and indicators.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function KREditPanel({ 
  kr, 
  onSave, 
  onDelete,
  onClose 
}: { 
  kr: KeyResult; 
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(kr.name);
  const [targetValue, setTargetValue] = useState(kr.target_value?.toString() || '');
  const [unit, setUnit] = useState(kr.unit || '%');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('key_results').update({ 
        name, 
        target_value: targetValue ? parseFloat(targetValue) : null,
        unit 
      }).eq('id', kr.id);
      toast.success('Key Result updated');
      onSave();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🎯 Key Result
          <Badge variant="secondary">KR</Badge>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{kr.indicators.length} indicators</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key result name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Target Value</label>
            <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="100" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Unit</label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Key Result</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete "{kr.name}" and all its indicators.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function IndicatorEditPanel({ 
  indicator, 
  onSave, 
  onDelete,
  onClose 
}: { 
  indicator: Indicator; 
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: indicator.name,
    formula: indicator.formula || '',
    frequency: indicator.frequency || 'Monthly',
    tier: indicator.tier || 'Tier 1',
    unit: indicator.unit || '%',
    target_value: indicator.target_value?.toString() || '',
    current_value: indicator.current_value?.toString() || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('indicators').update({
        name: formData.name,
        formula: formData.formula || null,
        frequency: formData.frequency,
        tier: formData.tier,
        unit: formData.unit,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      }).eq('id', indicator.id);
      toast.success('Indicator updated');
      onSave();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const ragStatus = calculateRAGStatus(
    formData.current_value ? parseFloat(formData.current_value) : null,
    formData.target_value ? parseFloat(formData.target_value) : null
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          📈 Indicator
          <RAGBadge status={ragStatus} />
        </h3>
      </div>

      <Separator />
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Name</label>
          <Input 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            placeholder="Indicator name" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              Tier
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>Tier 1 (Leading):</strong> Predictive metrics that indicate future performance</p>
                    <p><strong>Tier 2 (Lagging):</strong> Outcome metrics that show past results</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Tier 1">Tier 1 (Leading)</SelectItem>
                <SelectItem value="Tier 2">Tier 2 (Lagging)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Frequency</label>
            <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Formula / Description</label>
          <Input 
            value={formData.formula} 
            onChange={(e) => setFormData({ ...formData, formula: e.target.value })} 
            placeholder="e.g., % users with score ≥ 90" 
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Target</label>
            <Input 
              type="number" 
              value={formData.target_value} 
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })} 
              placeholder="100" 
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Current</label>
            <Input 
              type="number" 
              value={formData.current_value} 
              onChange={(e) => setFormData({ ...formData, current_value: e.target.value })} 
              placeholder="0" 
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Unit</label>
            <Input 
              value={formData.unit} 
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })} 
              placeholder="%" 
            />
          </div>
        </div>

        {formData.target_value && formData.current_value && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm">
              Progress: <strong>{Math.round((parseFloat(formData.current_value) / parseFloat(formData.target_value)) * 100)}%</strong>
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Indicator</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{indicator.name}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Main Component
export function OKRHierarchyTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedFOs, setExpandedFOs] = useState<Set<string>>(new Set());
  const [expandedKRs, setExpandedKRs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch departments including their own color column
      const { data: depts, error: deptError } = await supabase
        .from('departments')
        .select('id, name, org_objective_id, color');

      if (deptError) throw deptError;

      const fullDepts: Department[] = [];

      for (const dept of depts || []) {
        // Use department's own color, fallback to org objective color, then gray
        let color = dept.color || 'gray';
        if (!dept.color && dept.org_objective_id) {
          const { data: orgObj } = await supabase
            .from('org_objectives')
            .select('color')
            .eq('id', dept.org_objective_id)
            .single();
          color = orgObj?.color || 'gray';
        }

        const { data: fos } = await supabase
          .from('functional_objectives')
          .select('id, name, owner')
          .eq('department_id', dept.id);

        const fullFOs: FunctionalObjective[] = [];

        for (const fo of fos || []) {
          const { data: krs } = await supabase
            .from('key_results')
            .select('id, name, target_value, current_value, unit')
            .eq('functional_objective_id', fo.id);

          const fullKRs: KeyResult[] = [];

          for (const kr of krs || []) {
            const { data: inds } = await supabase
              .from('indicators')
              .select('id, name, formula, frequency, tier, unit, target_value, current_value')
              .eq('key_result_id', kr.id);

            fullKRs.push({ ...kr, indicators: inds || [] });
          }

          fullFOs.push({ ...fo, key_results: fullKRs });
        }

        fullDepts.push({ ...dept, color, functional_objectives: fullFOs });
      }

      setDepartments(fullDepts);
      // Auto-expand first department
      if (fullDepts.length > 0) {
        setExpandedDepts(new Set([fullDepts[0].id]));
      }
    } catch (error) {
      toast.error('Failed to load hierarchy');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = () => {
    setSelectedItem(null);
    fetchData();
  };

  const toggleDept = (id: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFO = (id: string) => {
    setExpandedFOs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleKR = (id: string) => {
    setExpandedKRs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      if (selectedItem.type === 'department') {
        const dept = selectedItem.data;
        for (const fo of dept.functional_objectives) {
          for (const kr of fo.key_results) {
            await supabase.from('indicators').delete().eq('key_result_id', kr.id);
          }
          await supabase.from('key_results').delete().eq('functional_objective_id', fo.id);
        }
        await supabase.from('functional_objectives').delete().eq('department_id', dept.id);
        await supabase.from('departments').delete().eq('id', dept.id);
        if (dept.org_objective_id) {
          await supabase.from('org_objectives').delete().eq('id', dept.org_objective_id);
        }
      } else if (selectedItem.type === 'fo') {
        const fo = selectedItem.data;
        for (const kr of fo.key_results) {
          await supabase.from('indicators').delete().eq('key_result_id', kr.id);
        }
        await supabase.from('key_results').delete().eq('functional_objective_id', fo.id);
        await supabase.from('functional_objectives').delete().eq('id', fo.id);
      } else if (selectedItem.type === 'kr') {
        const kr = selectedItem.data;
        await supabase.from('indicators').delete().eq('key_result_id', kr.id);
        await supabase.from('key_results').delete().eq('id', kr.id);
      } else if (selectedItem.type === 'indicator') {
        await supabase.from('indicators').delete().eq('id', selectedItem.data.id);
      }
      
      toast.success('Deleted successfully');
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Filter logic for search
  const filterMatch = (text: string) => 
    !searchQuery || text.toLowerCase().includes(searchQuery.toLowerCase());

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[500px]" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No departments found</h3>
          <p className="text-muted-foreground">Upload an Excel file to get started with your OKR hierarchy.</p>
        </CardContent>
      </Card>
    );
  }

  const totalIndicators = departments.reduce(
    (sum, d) => sum + d.functional_objectives.reduce(
      (s, fo) => s + fo.key_results.reduce((k, kr) => k + kr.indicators.length, 0), 0
    ), 0
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Panel: Tree */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                OKR Hierarchy
              </CardTitle>
              <CardDescription>
                {departments.length} departments • {totalIndicators} indicators
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="p-2">
              {departments.map(dept => {
                if (!filterMatch(dept.name) && 
                    !dept.functional_objectives.some(fo => filterMatch(fo.name) ||
                      fo.key_results.some(kr => filterMatch(kr.name) ||
                        kr.indicators.some(ind => filterMatch(ind.name))))) {
                  return null;
                }
                
                return (
                  <div key={dept.id}>
                    <TreeNode
                      icon="📁"
                      label={dept.name}
                      colorDot={getColorClass(dept.color)}
                      badge={`${dept.functional_objectives.length} FOs`}
                      isSelected={selectedItem?.type === 'department' && selectedItem.data.id === dept.id}
                      onClick={() => setSelectedItem({ type: 'department', data: dept })}
                      onExpand={() => toggleDept(dept.id)}
                      isExpanded={expandedDepts.has(dept.id)}
                      hasChildren={dept.functional_objectives.length > 0}
                      level={0}
                    />
                    
                    {expandedDepts.has(dept.id) && dept.functional_objectives.map(fo => {
                      if (!filterMatch(fo.name) && 
                          !fo.key_results.some(kr => filterMatch(kr.name) ||
                            kr.indicators.some(ind => filterMatch(ind.name)))) {
                        return null;
                      }
                      
                      return (
                        <div key={fo.id}>
                          <TreeNode
                            icon="📋"
                            label={fo.name}
                            badge={`${fo.key_results.length} KRs`}
                            isSelected={selectedItem?.type === 'fo' && selectedItem.data.id === fo.id}
                            onClick={() => setSelectedItem({ type: 'fo', data: fo, departmentId: dept.id })}
                            onExpand={() => toggleFO(fo.id)}
                            isExpanded={expandedFOs.has(fo.id)}
                            hasChildren={fo.key_results.length > 0}
                            level={1}
                          />
                          
                          {expandedFOs.has(fo.id) && fo.key_results.map(kr => {
                            if (!filterMatch(kr.name) && 
                                !kr.indicators.some(ind => filterMatch(ind.name))) {
                              return null;
                            }
                            
                            return (
                              <div key={kr.id}>
                                <TreeNode
                                  icon="🎯"
                                  label={kr.name}
                                  badge={`${kr.indicators.length} KPIs`}
                                  isSelected={selectedItem?.type === 'kr' && selectedItem.data.id === kr.id}
                                  onClick={() => setSelectedItem({ type: 'kr', data: kr, foId: fo.id })}
                                  onExpand={() => toggleKR(kr.id)}
                                  isExpanded={expandedKRs.has(kr.id)}
                                  hasChildren={kr.indicators.length > 0}
                                  level={2}
                                />
                                
                                {expandedKRs.has(kr.id) && kr.indicators.map(ind => {
                                  if (!filterMatch(ind.name)) return null;
                                  
                                  const ragStatus = calculateRAGStatus(ind.current_value, ind.target_value);
                                  
                                  return (
                                    <TreeNode
                                      key={ind.id}
                                      icon="📈"
                                      label={ind.name}
                                      ragStatus={ragStatus}
                                      isSelected={selectedItem?.type === 'indicator' && selectedItem.data.id === ind.id}
                                      onClick={() => setSelectedItem({ type: 'indicator', data: ind, krId: kr.id })}
                                      hasChildren={false}
                                      level={3}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel: Edit */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Details
          </CardTitle>
          <CardDescription>
            Select an item from the tree to edit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedItem ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Click on any item in the tree to edit its details</p>
            </div>
          ) : selectedItem.type === 'department' ? (
            <DepartmentEditPanel 
              dept={selectedItem.data} 
              onSave={handleRefresh} 
              onDelete={handleDelete}
              onClose={() => setSelectedItem(null)} 
            />
          ) : selectedItem.type === 'fo' ? (
            <FOEditPanel 
              fo={selectedItem.data} 
              onSave={handleRefresh} 
              onDelete={handleDelete}
              onClose={() => setSelectedItem(null)} 
            />
          ) : selectedItem.type === 'kr' ? (
            <KREditPanel 
              kr={selectedItem.data} 
              onSave={handleRefresh} 
              onDelete={handleDelete}
              onClose={() => setSelectedItem(null)} 
            />
          ) : selectedItem.type === 'indicator' ? (
            <IndicatorEditPanel 
              indicator={selectedItem.data} 
              onSave={handleRefresh} 
              onDelete={handleDelete}
              onClose={() => setSelectedItem(null)} 
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
