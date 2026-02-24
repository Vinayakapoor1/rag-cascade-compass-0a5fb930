import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';

interface ParsedRow {
  companyName: string;
  industry: string;
  customerId?: string;
  matched: boolean;
}

export function CustomerIndustryUpdater() {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

    // Find the right column names (flexible matching)
    const firstRow = json[0] || {};
    const keys = Object.keys(firstRow);
    const nameCol = keys.find(k => /company|customer|name/i.test(k));
    const industryCol = keys.find(k => /industry/i.test(k));

    if (!nameCol || !industryCol) {
      toast.error('Could not find "Company Name" and "Industry" columns in the file');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    // Fetch all existing customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name');

    const customerMap = new Map<string, string>();
    (customers || []).forEach(c => customerMap.set(c.name.toLowerCase().trim(), c.id));

    const rows: ParsedRow[] = json
      .filter(row => row[nameCol]?.toString().trim())
      .map(row => {
        const companyName = row[nameCol].toString().trim();
        const industry = (row[industryCol] || '').toString().trim();
        const customerId = customerMap.get(companyName.toLowerCase());
        return { companyName, industry, customerId, matched: !!customerId };
      });

    setParsedRows(rows);
    setPreview(true);
  };

  const handleImport = async () => {
    const matched = parsedRows.filter(r => r.matched && r.industry);
    if (!matched.length) {
      toast.error('No matched customers to update');
      return;
    }

    setImporting(true);
    let updated = 0;
    let errors = 0;

    for (const row of matched) {
      const { error } = await supabase
        .from('customers')
        .update({ industry: row.industry })
        .eq('id', row.customerId!);

      if (error) {
        errors++;
      } else {
        updated++;
      }
    }

    // Log activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('activity_logs').insert({
        action: 'bulk_industry_update',
        entity_type: 'customer',
        entity_name: `${updated} customers`,
        user_id: user.id,
        metadata: { updated, errors, total: matched.length },
      });
    }

    setImporting(false);
    toast.success(`Updated industry for ${updated} customers${errors ? `, ${errors} errors` : ''}`);
    setParsedRows([]);
    setPreview(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleReset = () => {
    setParsedRows([]);
    setPreview(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const matchedCount = parsedRows.filter(r => r.matched).length;
  const unmatchedCount = parsedRows.filter(r => !r.matched).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Industry Update
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload an Excel file with <strong>Company Name</strong> and <strong>Industry</strong> columns. Only the industry field will be updated — no other data will be changed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview && (
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
          </div>
        )}

        {preview && parsedRows.length > 0 && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {matchedCount} matched
              </Badge>
              {unmatchedCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {unmatchedCount} not found
                </Badge>
              )}
              <Badge variant="secondary">{parsedRows.length} total rows</Badge>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={!row.matched ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{row.companyName}</TableCell>
                      <TableCell>{row.industry || '-'}</TableCell>
                      <TableCell>
                        {row.matched ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" /> Match
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Not Found
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleImport} disabled={importing || matchedCount === 0}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Update {matchedCount} Customers</>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={importing}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
