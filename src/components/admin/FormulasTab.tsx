import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, Plus, Loader2, RefreshCw, CheckCircle } from 'lucide-react';

interface FormulaVersion {
  id: string;
  indicator_id: string | null;
  version_number: number;
  formula_expression: string;
  formula_type: string;
  variables: Record<string, any> | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  indicator_name?: string;
}

interface Indicator {
  id: string;
  name: string;
}

interface FormulasTabProps {
  isAdmin: boolean;
  onDataChange: () => void;
}

export function FormulasTab({ isAdmin, onDataChange }: FormulasTabProps) {
  const [formulas, setFormulas] = useState<FormulaVersion[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    indicator_id: '',
    formula_expression: '',
    formula_type: 'Percentage',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch formulas with indicator names
    const { data: formulasData } = await supabase
      .from('formula_versions')
      .select(`
        id, indicator_id, version_number, formula_expression, formula_type,
        variables, description, is_active, created_at,
        indicators (name)
      `)
      .order('created_at', { ascending: false });

    if (formulasData) {
      setFormulas(formulasData.map((f: any) => ({
        ...f,
        indicator_name: f.indicators?.name
      })));
    }

    // Fetch all indicators for dropdown
    const { data: indicatorsData } = await supabase
      .from('indicators')
      .select('id, name')
      .order('name');

    if (indicatorsData) {
      setIndicators(indicatorsData);
    }

    setLoading(false);
  };

  const openAddDialog = () => {
    setFormData({
      indicator_id: '',
      formula_expression: '',
      formula_type: 'Percentage',
      description: ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.indicator_id || !formData.formula_expression.trim()) {
      toast.error('Indicator and formula expression are required');
      return;
    }

    setSaving(true);

    // Get the next version number for this indicator
    const { data: existingVersions } = await supabase
      .from('formula_versions')
      .select('version_number')
      .eq('indicator_id', formData.indicator_id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = existingVersions && existingVersions.length > 0 
      ? existingVersions[0].version_number + 1 
      : 1;

    // Deactivate previous versions
    await supabase
      .from('formula_versions')
      .update({ is_active: false })
      .eq('indicator_id', formData.indicator_id);

    // Create new version
    const { error } = await supabase
      .from('formula_versions')
      .insert({
        indicator_id: formData.indicator_id,
        version_number: nextVersion,
        formula_expression: formData.formula_expression,
        formula_type: formData.formula_type,
        description: formData.description || null,
        is_active: true
      });

    if (error) {
      toast.error('Failed to create formula version');
    } else {
      toast.success(`Formula v${nextVersion} created`);
      setDialogOpen(false);
      fetchData();
      onDataChange();
    }

    setSaving(false);
  };

  const handleSetActive = async (formula: FormulaVersion) => {
    if (!formula.indicator_id) return;

    // Deactivate all versions for this indicator
    await supabase
      .from('formula_versions')
      .update({ is_active: false })
      .eq('indicator_id', formula.indicator_id);

    // Activate selected version
    const { error } = await supabase
      .from('formula_versions')
      .update({ is_active: true })
      .eq('id', formula.id);

    if (error) {
      toast.error('Failed to set active version');
    } else {
      toast.success('Active version updated');
      fetchData();
      onDataChange();
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'DirectPercentage':
        return <Badge className="bg-tier-1-muted text-tier-1">Direct %</Badge>;
      case 'NumberDrivenPercentage':
        return <Badge className="bg-primary/20 text-primary">Number-Driven %</Badge>;
      case 'Percentage':
        return <Badge className="bg-tier-1-muted text-tier-1">Percentage</Badge>;
      case 'Absolute':
        return <Badge className="bg-tier-2-muted text-tier-2">Absolute</Badge>;
      case 'Sum':
        return <Badge className="bg-rag-green-muted text-rag-green">Sum</Badge>;
      case 'Average':
        return <Badge className="bg-rag-amber-muted text-rag-amber">Average</Badge>;
      case 'Count':
        return <Badge className="bg-org-purple-muted text-org-purple">Count</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Formula Versions
              </CardTitle>
              <CardDescription>
                Manage versioned formulas for indicators. New versions don't overwrite history.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {isAdmin && indicators.length > 0 && (
                <Button size="sm" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Formula Version
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : formulas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {indicators.length === 0 
                ? 'Import indicators first, then add formulas.'
                : 'No formulas defined. Add formula versions for indicators.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicator</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Formula</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {formulas.map((formula) => (
                  <TableRow key={formula.id}>
                    <TableCell className="font-medium">
                      {formula.indicator_name || 'Unknown'}
                    </TableCell>
                    <TableCell>v{formula.version_number}</TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="truncate text-sm font-mono">
                        {formula.formula_expression}
                      </div>
                      {formula.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {formula.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getTypeBadge(formula.formula_type)}</TableCell>
                    <TableCell>
                      {formula.is_active ? (
                        <Badge className="bg-rag-green-muted text-rag-green">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {!formula.is_active && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSetActive(formula)}
                          >
                            Set Active
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Formula Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Formula Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="indicator">Indicator *</Label>
              <Select 
                value={formData.indicator_id} 
                onValueChange={(v) => setFormData({ ...formData, indicator_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select indicator" />
                </SelectTrigger>
                <SelectContent>
                  {indicators.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="formula">Formula Expression *</Label>
              <Textarea
                id="formula"
                value={formData.formula_expression}
                onChange={(e) => setFormData({ ...formData, formula_expression: e.target.value })}
                placeholder="e.g., (Count_Green / Total_Customers) * 100"
                rows={3}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Formula Type</Label>
              <Select 
                value={formData.formula_type} 
                onValueChange={(v) => setFormData({ ...formData, formula_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                  <SelectItem value="DirectPercentage">
                    <div className="flex flex-col">
                      <span>Direct Percentage</span>
                      <span className="text-xs text-muted-foreground">Value is already a % (0-100)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="NumberDrivenPercentage">
                    <div className="flex flex-col">
                      <span>Number-Driven Percentage</span>
                      <span className="text-xs text-muted-foreground">Calculate from numbers (x/y × 100)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Absolute">
                    <div className="flex flex-col">
                      <span>Absolute</span>
                      <span className="text-xs text-muted-foreground">Direct numeric value ($, units)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Count">
                    <div className="flex flex-col">
                      <span>Count</span>
                      <span className="text-xs text-muted-foreground">Count of items</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Average">
                    <div className="flex flex-col">
                      <span>Average</span>
                      <span className="text-xs text-muted-foreground">Calculate average value</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Sum">
                    <div className="flex flex-col">
                      <span>Sum</span>
                      <span className="text-xs text-muted-foreground">Sum of values</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What this formula calculates"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
