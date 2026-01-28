import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Target, Plus, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { RAGMatrixCard } from './RAGMatrixCard';

interface RAGVersion {
  id: string;
  indicator_id: string | null;
  version_number: number;
  red_threshold: number;
  amber_threshold: number;
  green_threshold: number;
  rag_logic: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  indicator_name?: string;
}

interface Indicator {
  id: string;
  name: string;
}

interface RAGRulesTabProps {
  isAdmin: boolean;
  onDataChange: () => void;
}

export function RAGRulesTab({ isAdmin, onDataChange }: RAGRulesTabProps) {
  const [ragVersions, setRagVersions] = useState<RAGVersion[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    indicator_id: '',
    red_threshold: '40',
    amber_threshold: '70',
    green_threshold: '70',
    rag_logic: 'higher_is_better',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch RAG versions with indicator names
    const { data: ragData } = await supabase
      .from('rag_versions')
      .select(`
        id, indicator_id, version_number, red_threshold, amber_threshold,
        green_threshold, rag_logic, description, is_active, created_at,
        indicators (name)
      `)
      .order('created_at', { ascending: false });

    if (ragData) {
      setRagVersions(ragData.map((r: any) => ({
        ...r,
        indicator_name: r.indicators?.name
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
      red_threshold: '40',
      amber_threshold: '70',
      green_threshold: '70',
      rag_logic: 'higher_is_better',
      description: ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.indicator_id) {
      toast.error('Indicator is required');
      return;
    }

    setSaving(true);

    // Get the next version number
    const { data: existingVersions } = await supabase
      .from('rag_versions')
      .select('version_number')
      .eq('indicator_id', formData.indicator_id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = existingVersions && existingVersions.length > 0 
      ? existingVersions[0].version_number + 1 
      : 1;

    // Deactivate previous versions
    await supabase
      .from('rag_versions')
      .update({ is_active: false })
      .eq('indicator_id', formData.indicator_id);

    // Create new version
    const { error } = await supabase
      .from('rag_versions')
      .insert({
        indicator_id: formData.indicator_id,
        version_number: nextVersion,
        red_threshold: parseFloat(formData.red_threshold) || 40,
        amber_threshold: parseFloat(formData.amber_threshold) || 70,
        green_threshold: parseFloat(formData.green_threshold) || 70,
        rag_logic: formData.rag_logic,
        description: formData.description || null,
        is_active: true
      });

    if (error) {
      toast.error('Failed to create RAG version');
    } else {
      toast.success(`RAG rules v${nextVersion} created`);
      setDialogOpen(false);
      fetchData();
      onDataChange();
    }

    setSaving(false);
  };

  const handleSetActive = async (rag: RAGVersion) => {
    if (!rag.indicator_id) return;

    // Deactivate all versions for this indicator
    await supabase
      .from('rag_versions')
      .update({ is_active: false })
      .eq('indicator_id', rag.indicator_id);

    // Activate selected version
    const { error } = await supabase
      .from('rag_versions')
      .update({ is_active: true })
      .eq('id', rag.id);

    if (error) {
      toast.error('Failed to set active version');
    } else {
      toast.success('Active version updated');
      fetchData();
      onDataChange();
    }
  };

  const getLogicLabel = (logic: string | null) => {
    switch (logic) {
      case 'higher_is_better':
        return 'Higher is Better';
      case 'lower_is_better':
        return 'Lower is Better';
      case 'target_based':
        return 'Target Based';
      default:
        return logic || 'Default';
    }
  };

  return (
    <div className="space-y-6">
      <RAGMatrixCard />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                RAG Threshold Rules
              </CardTitle>
              <CardDescription>
                Define versioned Red/Amber/Green thresholds for each indicator
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
                  New RAG Version
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
          ) : ragVersions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {indicators.length === 0 
                ? 'Import indicators first, then define RAG rules.'
                : 'No RAG rules defined. Add threshold versions for indicators.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicator</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-center">
                    <span className="text-rag-red">Red</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="text-rag-amber">Amber</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="text-rag-green">Green</span>
                  </TableHead>
                  <TableHead>Logic</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ragVersions.map((rag) => (
                  <TableRow key={rag.id}>
                    <TableCell className="font-medium">
                      {rag.indicator_name || 'Unknown'}
                    </TableCell>
                    <TableCell>v{rag.version_number}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-rag-red-muted text-rag-red">
                        &lt; {rag.red_threshold}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-rag-amber-muted text-rag-amber">
                        {rag.red_threshold} - {rag.amber_threshold}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-rag-green-muted text-rag-green">
                        ≥ {rag.green_threshold}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {getLogicLabel(rag.rag_logic)}
                    </TableCell>
                    <TableCell>
                      {rag.is_active ? (
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
                        {!rag.is_active && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSetActive(rag)}
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

      {/* Add RAG Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New RAG Version</DialogTitle>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="red" className="text-rag-red">Red Below</Label>
                <Input
                  id="red"
                  type="number"
                  value={formData.red_threshold}
                  onChange={(e) => setFormData({ ...formData, red_threshold: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amber" className="text-rag-amber">Amber Below</Label>
                <Input
                  id="amber"
                  type="number"
                  value={formData.amber_threshold}
                  onChange={(e) => setFormData({ ...formData, amber_threshold: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="green" className="text-rag-green">Green At/Above</Label>
                <Input
                  id="green"
                  type="number"
                  value={formData.green_threshold}
                  onChange={(e) => setFormData({ ...formData, green_threshold: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logic">Logic</Label>
              <Select 
                value={formData.rag_logic} 
                onValueChange={(v) => setFormData({ ...formData, rag_logic: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher_is_better">Higher is Better</SelectItem>
                  <SelectItem value="lower_is_better">Lower is Better</SelectItem>
                  <SelectItem value="target_based">Target Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Standard CSAT thresholds"
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
