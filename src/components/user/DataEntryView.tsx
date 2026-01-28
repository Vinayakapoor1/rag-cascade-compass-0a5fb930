import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Paperclip, Link2, ExternalLink, Upload, Download, FileText, BarChart3, Target, CheckCircle2, Users, Box, Clock, Calendar, Table } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

interface Indicator {
  id: string;
  name: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  formula: string | null;
  frequency: string | null;
  evidence_url: string | null;
  evidence_type: string | null;
  department_name?: string;
  key_result_name?: string;
}

interface LinkedCustomer {
  id: string;
  name: string;
  tier: string;
  region: string | null;
}

interface LinkedFeature {
  id: string;
  name: string;
  category: string | null;
}

interface CustomerValue {
  customer_id: string;
  value: number | null;
  period: string;
  rag_status: string | null;
}

interface Department {
  id: string;
  name: string;
}

function getRAGStatus(current: number | null, target: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (current === null || target === null || target === 0) return 'gray';
  const progress = (current / target) * 100;
  if (progress >= 76) return 'green';
  if (progress >= 51) return 'amber';
  return 'red';
}

function getFrequencyBadge(frequency: string | null) {
  if (!frequency) return null;
  const colors: Record<string, string> = {
    'Daily': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    'Weekly': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    'Monthly': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    'Quarterly': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    'Annually': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${colors[frequency] || ''}`}>
      <Clock className="h-3 w-3" />
      {frequency}
    </Badge>
  );
}

function RAGBadge({ status }: { status: 'green' | 'amber' | 'red' | 'gray' }) {
  const styles = {
    green: 'bg-rag-green text-rag-green-foreground',
    amber: 'bg-rag-amber text-rag-amber-foreground',
    red: 'bg-rag-red text-rag-red-foreground',
    gray: 'bg-muted text-muted-foreground',
  };
  const labels = { green: 'On Track', amber: 'At Risk', red: 'Off Track', gray: 'No Data' };
  return <Badge className={`${styles[status]} text-xs`}>{labels[status]}</Badge>;
}

function EvidenceDialog({ indicator, onSave }: {
  indicator: Indicator;
  onSave: (url: string, type: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [evidenceType, setEvidenceType] = useState<'link' | 'file'>((indicator.evidence_type as 'link' | 'file') || 'link');
  const [evidenceUrl, setEvidenceUrl] = useState(indicator.evidence_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${indicator.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('evidence-files').upload(fileName, selectedFile);
      if (error) throw error;
      setEvidenceUrl(data.path);
      setSelectedFile(null);
      toast.success('File uploaded');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!evidenceUrl.trim()) {
      toast.error('Please enter a URL or upload a file');
      return;
    }
    setSaving(true);
    try {
      await onSave(evidenceUrl.trim(), evidenceType);
      setOpen(false);
      toast.success('Evidence saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!indicator.evidence_url) return;
    if (indicator.evidence_type === 'link') {
      window.open(indicator.evidence_url, '_blank');
    } else {
      try {
        const { data, error } = await supabase.storage.from('evidence-files').download(indicator.evidence_url);
        if (error) throw error;
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = indicator.evidence_url.split('/').pop() || 'evidence';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error: any) {
        toast.error(`Download failed: ${error.message}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-xs">
          {indicator.evidence_url ? (
            <><Link2 className="h-3 w-3 text-primary" />Evidence</>
          ) : (
            <><Paperclip className="h-3 w-3" />Attach</>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach Evidence</DialogTitle>
          <DialogDescription>Add supporting documentation for "{indicator.name}"</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup value={evidenceType} onValueChange={(v) => { setEvidenceType(v as 'link' | 'file'); setEvidenceUrl(''); }} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="link" id="link" />
              <Label htmlFor="link">Link</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="file" id="file" />
              <Label htmlFor="file">File</Label>
            </div>
          </RadioGroup>
          {evidenceType === 'link' ? (
            <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." />
          ) : (
            <div className="flex gap-2">
              <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="flex-1" />
              <Button onClick={handleFileUpload} disabled={!selectedFile || uploading} size="sm">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
          )}
          {indicator.evidence_url && (
            <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
              <span className="text-sm truncate">{indicator.evidence_url.split('/').pop()}</span>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                {indicator.evidence_type === 'link' ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !evidenceUrl}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Customer-level data entry for an indicator
function CustomerDataEntry({
  indicatorId,
  indicatorName,
  targetValue,
  unit,
  onSave
}: {
  indicatorId: string;
  indicatorName: string;
  targetValue: number | null;
  unit: string | null;
  onSave: () => void;
}) {
  const [customers, setCustomers] = useState<LinkedCustomer[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [existingValues, setExistingValues] = useState<CustomerValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    fetchLinkedCustomers();
  }, [indicatorId]);

  const fetchLinkedCustomers = async () => {
    setLoading(true);
    try {
      // Get linked customers
      const { data: links } = await supabase
        .from('indicator_customer_links')
        .select('customer_id')
        .eq('indicator_id', indicatorId);

      if (links && links.length > 0) {
        const customerIds = links.map(l => l.customer_id);
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, name, tier, region')
          .in('id', customerIds)
          .order('name');

        setCustomers(customerData || []);

        // Get existing values
        const { data: valueData } = await supabase
          .from('customer_indicator_values')
          .select('customer_id, value, period, rag_status')
          .eq('indicator_id', indicatorId)
          .eq('period', currentPeriod);

        setExistingValues(valueData || []);

        // Pre-fill values
        const initialValues: Record<string, string> = {};
        valueData?.forEach(v => {
          if (v.value !== null) {
            initialValues[v.customer_id] = v.value.toString();
          }
        });
        setValues(initialValues);
      }
    } catch (error) {
      console.error('Error fetching linked customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upserts = Object.entries(values)
        .filter(([_, v]) => v !== '')
        .map(([customerId, value]) => {
          const numValue = parseFloat(value);
          let ragStatus = 'not-set';
          if (targetValue && !isNaN(numValue)) {
            const progress = (numValue / targetValue) * 100;
            if (progress >= 76) ragStatus = 'green';
            else if (progress >= 51) ragStatus = 'amber';
            else ragStatus = 'red';
          }
          return {
            customer_id: customerId,
            indicator_id: indicatorId,
            period: currentPeriod,
            value: numValue,
            rag_status: ragStatus,
          };
        });

      if (upserts.length > 0) {
        const { error } = await supabase
          .from('customer_indicator_values')
          .upsert(upserts, { onConflict: 'customer_id,indicator_id,period' });

        if (error) throw error;
      }

      toast.success(`Saved values for ${upserts.length} customers`);
      onSave();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No customers linked to this indicator.
        <br />
        Ask an admin to link customers.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Enter value for each customer ({currentPeriod})
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save All
        </Button>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="space-y-2 pr-3">
          {customers.map(customer => {
            const existing = existingValues.find(v => v.customer_id === customer.id);
            return (
              <div key={customer.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.tier} {customer.region && `• ${customer.region}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={values[customer.id] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [customer.id]: e.target.value }))}
                    placeholder="Value"
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-8">{unit}</span>
                  {existing && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${existing.rag_status === 'green' ? 'border-rag-green text-rag-green' :
                        existing.rag_status === 'amber' ? 'border-rag-amber text-rag-amber' :
                          existing.rag_status === 'red' ? 'border-rag-red text-rag-red' :
                            ''
                        }`}
                    >
                      {existing.rag_status}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// Feature usage data entry
function FeatureDataEntry({
  indicatorId,
  onSave
}: {
  indicatorId: string;
  onSave: () => void;
}) {
  const [features, setFeatures] = useState<LinkedFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinkedFeatures();
  }, [indicatorId]);

  const fetchLinkedFeatures = async () => {
    setLoading(true);
    try {
      const { data: links } = await supabase
        .from('indicator_feature_links')
        .select('feature_id')
        .eq('indicator_id', indicatorId);

      if (links && links.length > 0) {
        const featureIds = links.map(l => l.feature_id);
        const { data: featureData } = await supabase
          .from('features')
          .select('id, name, category')
          .in('id', featureIds)
          .order('name');

        setFeatures(featureData || []);
      }
    } catch (error) {
      console.error('Error fetching linked features:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No features linked to this indicator.
        <br />
        Ask an admin to link features.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Features linked to this indicator:
      </p>
      <ScrollArea className="h-[150px]">
        <div className="space-y-2 pr-3">
          {features.map(feature => (
            <div key={feature.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
              <Box className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{feature.name}</p>
                {feature.category && (
                  <p className="text-xs text-muted-foreground">{feature.category}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function IndicatorCard({ indicator, onSave }: { indicator: Indicator; onSave: () => void }) {
  const [value, setValue] = useState(indicator.current_value?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [entryMode, setEntryMode] = useState<'direct' | 'customers' | 'features'>('direct');

  useEffect(() => {
    setValue(indicator.current_value?.toString() || '');
    setHasChanges(false);
  }, [indicator.current_value]);

  const handleChange = (v: string) => {
    setValue(v);
    setHasChanges(v !== (indicator.current_value?.toString() || ''));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('indicators').update({ current_value: value ? parseFloat(value) : null }).eq('id', indicator.id);
      toast.success('Saved');
      setHasChanges(false);
      onSave();
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEvidenceSave = async (url: string, type: string) => {
    await supabase.from('indicators').update({ evidence_url: url, evidence_type: type }).eq('id', indicator.id);
    onSave();
  };

  const ragStatus = getRAGStatus(indicator.current_value, indicator.target_value);
  const progress = indicator.target_value && indicator.current_value
    ? Math.min(100, Math.round((indicator.current_value / indicator.target_value) * 100))
    : 0;

  return (
    <Card className={`transition-all ${hasChanges ? 'ring-2 ring-primary/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium">{indicator.name}</h4>
              <RAGBadge status={ragStatus} />
              {getFrequencyBadge(indicator.frequency)}
            </div>
            {indicator.formula && (
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 rounded">{indicator.formula}</code>
              </p>
            )}
          </div>
          <EvidenceDialog indicator={indicator} onSave={handleEvidenceSave} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="font-semibold">{indicator.target_value ?? '—'} {indicator.unit}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-semibold">{indicator.current_value ?? '—'} {indicator.unit}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="font-semibold">{progress}%</p>
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-4" />

        {/* Entry Mode Tabs */}
        <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as 'direct' | 'customers' | 'features')}>
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="direct" className="text-xs gap-1">
              <Target className="h-3 w-3" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              By Customer
            </TabsTrigger>
            <TabsTrigger value="features" className="text-xs gap-1">
              <Box className="h-3 w-3" />
              Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="mt-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Enter new value</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Enter value..."
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">{indicator.unit}</span>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving || !hasChanges} className="self-end">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="mt-3">
            <CustomerDataEntry
              indicatorId={indicator.id}
              indicatorName={indicator.name}
              targetValue={indicator.target_value}
              unit={indicator.unit}
              onSave={onSave}
            />
          </TabsContent>

          <TabsContent value="features" className="mt-3">
            <FeatureDataEntry
              indicatorId={indicator.id}
              onSave={onSave}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function DataEntryView() {
  const { user } = useAuth();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Get user's accessible departments
      const { data: accessData } = await supabase
        .from('department_access')
        .select('department_id')
        .eq('user_id', user.id);

      const departmentIds = accessData?.map(a => a.department_id) || [];

      if (departmentIds.length === 0) {
        setIndicators([]);
        setDepartments([]);
        setIsLoading(false);
        return;
      }

      // Fetch departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);

      setDepartments(deptData || []);

      // Fetch all indicators for accessible departments with their context
      const allIndicators: Indicator[] = [];

      for (const dept of deptData || []) {
        const { data: fos } = await supabase
          .from('functional_objectives')
          .select('id')
          .eq('department_id', dept.id);

        for (const fo of fos || []) {
          const { data: krs } = await supabase
            .from('key_results')
            .select('id, name')
            .eq('functional_objective_id', fo.id);

          for (const kr of krs || []) {
            const { data: inds } = await supabase
              .from('indicators')
              .select('id, name, target_value, current_value, unit, formula, frequency, evidence_url, evidence_type')
              .eq('key_result_id', kr.id);

            for (const ind of inds || []) {
              allIndicators.push({
                ...ind,
                department_name: dept.name,
                key_result_name: kr.name,
              });
            }
          }
        }
      }

      setIndicators(allIndicators);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const filteredIndicators = selectedDepartment === 'all'
    ? indicators
    : indicators.filter(i => i.department_name === selectedDepartment);

  // Stats
  const totalIndicators = filteredIndicators.length;
  const completedIndicators = filteredIndicators.filter(i => i.current_value !== null).length;
  const onTrackIndicators = filteredIndicators.filter(i => getRAGStatus(i.current_value, i.target_value) === 'green').length;

  // Group by frequency
  const byFrequency = filteredIndicators.reduce((acc, ind) => {
    const freq = ind.frequency || 'Not Set';
    if (!acc[freq]) acc[freq] = 0;
    acc[freq]++;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Access Yet</h3>
          <p className="text-muted-foreground">
            You don't have access to any departments. Contact an admin to get assigned.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-background to-muted/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Your Indicators</h2>
              <p className="text-muted-foreground text-sm">Enter current values for your assigned KPIs</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{completedIndicators}/{totalIndicators}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-rag-green">{onTrackIndicators}</p>
                <p className="text-xs text-muted-foreground">On Track</p>
              </div>
              {departments.length === 1 && (
                <Link to={`/department/${departments[0].id}/data-entry`}>
                  <Button variant="outline" className="gap-2">
                    <Table className="h-4 w-4" />
                    Bulk Entry
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Frequency breakdown */}
          {Object.keys(byFrequency).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Update Schedule:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(byFrequency).map(([freq, count]) => (
                  <Badge key={freq} variant="outline" className="text-xs">
                    {freq}: {count} indicator{count > 1 ? 's' : ''}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Filter */}
      {departments.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="text-sm">Department:</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Indicator Cards Grid */}
      {filteredIndicators.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No indicators found in selected department.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIndicators.map(indicator => (
            <IndicatorCard key={indicator.id} indicator={indicator} onSave={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}