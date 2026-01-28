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
import { Database, Plus, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface RawDataInput {
  id: string;
  indicator_id: string | null;
  customer_id: string | null;
  data_value: number | null;
  data_type: string;
  record_date: string;
  period: string;
  source_file: string | null;
  validation_status: string | null;
  created_at: string;
  indicator_name?: string;
  customer_name?: string;
}

interface Indicator {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface RawDataTabProps {
  isAdmin: boolean;
  onDataChange: () => void;
}

export function RawDataTab({ isAdmin, onDataChange }: RawDataTabProps) {
  const [rawData, setRawData] = useState<RawDataInput[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    indicator_id: '',
    customer_id: '',
    data_value: '',
    data_type: 'CSAT',
    record_date: new Date().toISOString().split('T')[0],
    period: format(new Date(), 'yyyy-MM'),
    source_file: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch raw data with relations
    const { data: rawDataResult } = await supabase
      .from('raw_data_inputs')
      .select(`
        id, indicator_id, customer_id, data_value, data_type,
        record_date, period, source_file, validation_status, created_at,
        indicators (name),
        customers (name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (rawDataResult) {
      setRawData(rawDataResult.map((r: any) => ({
        ...r,
        indicator_name: r.indicators?.name,
        customer_name: r.customers?.name
      })));
    }

    // Fetch indicators and customers for dropdowns
    const { data: indicatorsData } = await supabase
      .from('indicators')
      .select('id, name')
      .order('name');
    if (indicatorsData) setIndicators(indicatorsData);

    const { data: customersData } = await supabase
      .from('customers')
      .select('id, name')
      .order('name');
    if (customersData) setCustomers(customersData);

    setLoading(false);
  };

  const openAddDialog = () => {
    setFormData({
      indicator_id: '',
      customer_id: '',
      data_value: '',
      data_type: 'CSAT',
      record_date: new Date().toISOString().split('T')[0],
      period: format(new Date(), 'yyyy-MM'),
      source_file: ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.data_type || !formData.record_date || !formData.period) {
      toast.error('Data type, record date, and period are required');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('raw_data_inputs')
      .insert({
        indicator_id: formData.indicator_id || null,
        customer_id: formData.customer_id || null,
        data_value: formData.data_value ? parseFloat(formData.data_value) : null,
        data_type: formData.data_type,
        record_date: formData.record_date,
        period: formData.period,
        source_file: formData.source_file || null,
        validation_status: 'pending'
      });

    if (error) {
      toast.error('Failed to add data input');
    } else {
      toast.success('Data input added');
      setDialogOpen(false);
      fetchData();
      onDataChange();
    }

    setSaving(false);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-rag-green-muted text-rag-green">Valid</Badge>;
      case 'invalid':
        return <Badge className="bg-rag-red-muted text-rag-red">Invalid</Badge>;
      case 'pending':
        return <Badge className="bg-rag-amber-muted text-rag-amber">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-tier-1">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-5 w-5 text-tier-1 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Append-Only Data:</strong> Raw data inputs are immutable. 
              Once added, records cannot be modified or deleted. This ensures data integrity 
              and historical accuracy for calculations.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Raw Data Inputs
              </CardTitle>
              <CardDescription>
                Append-only data records used for indicator calculations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {isAdmin && (
                <Button size="sm" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Data Input
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
          ) : rawData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No raw data inputs yet. Add data or import from Excel.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Indicator</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawData.map((data) => (
                  <TableRow key={data.id}>
                    <TableCell>
                      <Badge variant="outline">{data.data_type}</Badge>
                    </TableCell>
                    <TableCell>{data.indicator_name || '-'}</TableCell>
                    <TableCell>{data.customer_name || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {data.data_value?.toFixed(2) ?? '-'}
                    </TableCell>
                    <TableCell>{data.period}</TableCell>
                    <TableCell>{getStatusBadge(data.validation_status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(data.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Data Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Raw Data Input</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_type">Data Type *</Label>
                <Select 
                  value={formData.data_type} 
                  onValueChange={(v) => setFormData({ ...formData, data_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSAT">CSAT</SelectItem>
                    <SelectItem value="NPS">NPS</SelectItem>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Churn">Churn</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_value">Value</Label>
                <Input
                  id="data_value"
                  type="number"
                  step="0.01"
                  value={formData.data_value}
                  onChange={(e) => setFormData({ ...formData, data_value: e.target.value })}
                  placeholder="e.g., 4.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="indicator">Indicator</Label>
                <Select 
                  value={formData.indicator_id} 
                  onValueChange={(v) => setFormData({ ...formData, indicator_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {indicators.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select 
                  value={formData.customer_id} 
                  onValueChange={(v) => setFormData({ ...formData, customer_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((cust) => (
                      <SelectItem key={cust.id} value={cust.id}>{cust.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="record_date">Record Date *</Label>
                <Input
                  id="record_date"
                  type="date"
                  value={formData.record_date}
                  onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Period *</Label>
                <Input
                  id="period"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  placeholder="e.g., 2024-08"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_file">Source File</Label>
              <Input
                id="source_file"
                value={formData.source_file}
                onChange={(e) => setFormData({ ...formData, source_file: e.target.value })}
                placeholder="e.g., CSAT_Aug_2024.xlsx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
