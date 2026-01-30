import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Database, LogIn, Layers, XCircle, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { generateSimpleOKRTemplate } from '@/lib/simpleExcelTemplate';
import { parseSimpleExcelFile, importSimpleExcelToDatabase, getImportPreview } from '@/lib/simpleExcelImporter';
import { 
  parseMultiSheetExcel, 
  importMultiSheetToDatabase, 
  getMultiSheetPreview, 
  type ParsedMultiSheetData,
  type MultiSheetPreview,
  type ExcludedIndicator,
  type MultiSheetImportResult
} from '@/lib/multiSheetExcelImporter';
import {
  parseV5ExcelFile,
  importV5ExcelToDatabase,
  getV5ImportPreview,
  generateV5Template,
  type V5ImportPreview,
  type V5ImportResult,
} from '@/lib/v5ExcelImporter';
import { useAuth } from '@/hooks/useAuth';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type UploadStatus = 'idle' | 'parsing' | 'preview' | 'uploading' | 'success' | 'error';

interface ParsedPreview {
  orgObjectives: number;
  departments: number;
  functionalObjectives: number;
  keyResults: number;
  indicators: number;
}

export default function AdminUpload() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Simple format state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  
  // Multi-sheet format state
  const [multiSheetStatus, setMultiSheetStatus] = useState<UploadStatus>('idle');
  const [multiSheetFileName, setMultiSheetFileName] = useState<string>('');
  const [multiSheetData, setMultiSheetData] = useState<ParsedMultiSheetData | null>(null);
  const [multiSheetPreview, setMultiSheetPreview] = useState<MultiSheetPreview | null>(null);
  const [importResult, setImportResult] = useState<MultiSheetImportResult | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);

  // V5 format state (with formulas)
  const [v5Status, setV5Status] = useState<UploadStatus>('idle');
  const [v5FileName, setV5FileName] = useState<string>('');
  const [v5Rows, setV5Rows] = useState<any[]>([]);
  const [v5Preview, setV5Preview] = useState<V5ImportPreview | null>(null);
  const [v5Result, setV5Result] = useState<V5ImportResult | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadStatus('parsing');

    try {
      const rows = await parseSimpleExcelFile(file);
      const previewData = getImportPreview(rows);
      
      setParsedRows(rows);
      setPreview(previewData);
      setUploadStatus('preview');
      
      toast.success(`Parsed ${rows.length} rows from ${file.name}`);
    } catch (error) {
      setUploadStatus('error');
      toast.error(`Failed to parse file: ${error}`);
    }
  };

  const handleMultiSheetFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMultiSheetFileName(file.name);
    setMultiSheetStatus('parsing');
    setImportResult(null);

    try {
      const data = await parseMultiSheetExcel(file);
      const previewData = getMultiSheetPreview(data);
      
      setMultiSheetData(data);
      setMultiSheetPreview(previewData);
      setMultiSheetStatus('preview');
      
      toast.success(`Parsed multi-sheet file: ${previewData.totalToImport} indicators will be imported`);
    } catch (error) {
      setMultiSheetStatus('error');
      toast.error(`Failed to parse file: ${error}`);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setUploadStatus('uploading');

    try {
      const result = await importSimpleExcelToDatabase(parsedRows);
      
      if (result.success) {
        setUploadStatus('success');
        toast.success(`Import complete! Created ${result.counts.orgObjectives} Org Objectives, ${result.counts.keyResults} Key Results, ${result.counts.indicators} Indicators`);
      } else {
        setUploadStatus('error');
        toast.error(`Import completed with ${result.errors.length} errors`);
        result.errors.slice(0, 3).forEach(err => toast.error(err));
      }
    } catch (error) {
      setUploadStatus('error');
      toast.error(`Import failed: ${error}`);
    }
  };

  const handleMultiSheetImport = async () => {
    if (!multiSheetData) return;

    setMultiSheetStatus('uploading');

    try {
      const result = await importMultiSheetToDatabase(multiSheetData);
      setImportResult(result);
      
      if (result.success) {
        setMultiSheetStatus('success');
        toast.success(`Import complete! Created ${result.counts.indicators} Indicators (${result.excludedIndicators.length} excluded by color)`);
      } else {
        setMultiSheetStatus('error');
        toast.error(`Import completed with ${result.errors.length} errors`);
        result.errors.slice(0, 5).forEach(err => toast.error(err));
      }
    } catch (error) {
      setMultiSheetStatus('error');
      toast.error(`Import failed: ${error}`);
    }
  };

  const handleDownloadTemplate = () => {
    generateSimpleOKRTemplate();
    toast.success('Template downloaded! Check your downloads folder.');
  };

  const handleReset = () => {
    setUploadStatus('idle');
    setFileName('');
    setParsedRows([]);
    setPreview(null);
  };

  const handleMultiSheetReset = () => {
    setMultiSheetStatus('idle');
    setMultiSheetFileName('');
    setMultiSheetData(null);
    setMultiSheetPreview(null);
    setImportResult(null);
    setShowExcluded(false);
  };

  // V5 format handlers
  const handleV5FileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setV5FileName(file.name);
    setV5Status('parsing');
    setV5Result(null);

    try {
      const rows = await parseV5ExcelFile(file);
      const previewData = getV5ImportPreview(rows);
      
      setV5Rows(rows);
      setV5Preview(previewData);
      setV5Status('preview');
      
      toast.success(`Parsed ${rows.length} rows with formula support from ${file.name}`);
    } catch (error) {
      setV5Status('error');
      toast.error(`Failed to parse file: ${error}`);
    }
  };

  const handleV5Import = async () => {
    if (v5Rows.length === 0) return;

    setV5Status('uploading');

    try {
      const result = await importV5ExcelToDatabase(v5Rows);
      setV5Result(result);
      
      if (result.success) {
        setV5Status('success');
        toast.success(`Import complete! Created ${result.counts.departments} Departments, ${result.counts.functionalObjectives} FOs, ${result.counts.keyResults} KRs, ${result.counts.indicators} KPIs`);
      } else {
        setV5Status('error');
        toast.error(`Import completed with ${result.errors.length} errors`);
        result.errors.slice(0, 3).forEach(err => toast.error(err));
      }
    } catch (error) {
      setV5Status('error');
      toast.error(`Import failed: ${error}`);
    }
  };

  const handleV5Reset = () => {
    setV5Status('idle');
    setV5FileName('');
    setV5Rows([]);
    setV5Preview(null);
    setV5Result(null);
  };

  const handleDownloadV5Template = () => {
    generateV5Template();
    toast.success('V5 Template with formula support downloaded!');
  };

  const handleUseDemoData = () => {
    toast.success('Demo data is already loaded in the system.');
  };

  const breadcrumbItems = [
    { label: 'Portfolio', href: '/' },
    { label: 'Admin Upload Center' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <DrilldownBreadcrumb items={breadcrumbItems} />
        
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You must be logged in to upload and import OKR data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={() => navigate('/auth')} className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Sign In to Continue
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Back to Portfolio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Color breakdown component - shows actual cell colors detected by ExcelJS
  const ColorBreakdownTable = ({ preview }: { preview: MultiSheetPreview }) => (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-foreground">Indicator Color Breakdown:</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Color</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">Count</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Green
              </td>
              <td className="py-2 px-3 text-right font-medium">{preview.colorBreakdown.willImport.green}</td>
              <td className="py-2 px-3 text-right text-green-600 font-medium">✓ Import</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                Yellow
              </td>
              <td className="py-2 px-3 text-right font-medium">{preview.colorBreakdown.willImport.yellow}</td>
              <td className="py-2 px-3 text-right text-green-600 font-medium">✓ Import</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                Orange
              </td>
              <td className="py-2 px-3 text-right font-medium">{preview.colorBreakdown.willExclude.orange}</td>
              <td className="py-2 px-3 text-right text-destructive font-medium">✗ Exclude</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Red
              </td>
              <td className="py-2 px-3 text-right font-medium">{preview.colorBreakdown.willExclude.red}</td>
              <td className="py-2 px-3 text-right text-destructive font-medium">✗ Exclude</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400"></span>
                No color
              </td>
              <td className="py-2 px-3 text-right font-medium">{preview.colorBreakdown.willExclude.noColor}</td>
              <td className="py-2 px-3 text-right text-destructive font-medium">✗ Exclude</td>
            </tr>
            {preview.colorBreakdown.willExclude.other > 0 && (
              <tr className="border-b border-border/50">
                <td className="py-2 px-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  Other
                </td>
                <td className="py-2 px-3 text-right font-medium">{preview.colorBreakdown.willExclude.other}</td>
                <td className="py-2 px-3 text-right text-destructive font-medium">✗ Exclude</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-2 px-3">Total</td>
              <td className="py-2 px-3 text-right">{preview.totalToImport + preview.totalToExclude}</td>
              <td className="py-2 px-3 text-right">
                <span className="text-green-600">{preview.totalToImport}</span>
                {' / '}
                <span className="text-destructive">{preview.totalToExclude}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  // Excluded indicators list component
  const ExcludedIndicatorsList = ({ excluded }: { excluded: ExcludedIndicator[] }) => (
    <Collapsible open={showExcluded} onOpenChange={setShowExcluded}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            {excluded.length} Indicators Excluded
          </span>
          {showExcluded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="bg-muted/30 rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium">Row</th>
                  <th className="text-left py-2 px-2 font-medium">Indicator</th>
                  <th className="text-left py-2 px-2 font-medium">Key Result</th>
                  <th className="text-left py-2 px-2 font-medium">Tier</th>
                  <th className="text-left py-2 px-2 font-medium">Color</th>
                  <th className="text-left py-2 px-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {excluded.map((ind, idx) => (
                  <tr key={idx} className="border-b border-border/30 hover:bg-muted/50">
                    <td className="py-1.5 px-2 text-muted-foreground">{ind.rowNumber}</td>
                    <td className="py-1.5 px-2 max-w-[200px] truncate" title={ind.name}>
                      {ind.name}
                    </td>
                    <td className="py-1.5 px-2 max-w-[150px] truncate text-muted-foreground" title={ind.keyResult}>
                      {ind.keyResult || '—'}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        ind.tier === 'tier1' ? 'bg-tier-1-muted text-tier-1' : 'bg-tier-2-muted text-tier-2'
                      }`}>
                        {ind.tier === 'tier1' ? 'T1' : 'T2'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        ind.colorName === 'Orange' ? 'bg-orange-100 text-orange-700' :
                        ind.colorName === 'Red' ? 'bg-red-100 text-red-700' :
                        ind.colorName === 'No color' ? 'bg-gray-100 text-gray-600' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {ind.colorName}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground max-w-[200px] truncate" title={ind.reason}>
                      {ind.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="space-y-8">
      <DrilldownBreadcrumb items={breadcrumbItems} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Upload Center</h1>
          <p className="text-muted-foreground mt-1">
            Import OKR data from Excel files
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{user.email}</span>
        </div>
      </div>

      <Tabs defaultValue="v5format" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="v5format" className="gap-2">
            <Calculator className="h-4 w-4" />
            V5 Format (Formulas)
          </TabsTrigger>
          <TabsTrigger value="multisheet" className="gap-2">
            <Layers className="h-4 w-4" />
            Multi-Sheet Import
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Simple Format
          </TabsTrigger>
          <TabsTrigger value="template" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Get Template
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-2">
            <Database className="h-4 w-4" />
            Demo Data
          </TabsTrigger>
        </TabsList>

        {/* V5 Format with Formulas Tab */}
        <TabsContent value="v5format" className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                V5 OKR Import (With Formula Calculations)
              </CardTitle>
              <CardDescription>
                Import OKRs with formula-based calculations at FO, KR, and KPI levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-foreground">9-Column Format:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Column A:</strong> Department</li>
                  <li>• <strong>Column B:</strong> Owner</li>
                  <li>• <strong>Column C:</strong> Organizational Objective</li>
                  <li>• <strong>Column D:</strong> Functional Objective</li>
                  <li>• <strong>Column E:</strong> Formula (FO aggregation, e.g., <code>(KR1 % + KR2 %) / 2</code>)</li>
                  <li>• <strong>Column F:</strong> Key Result</li>
                  <li>• <strong>Column G:</strong> Formula (BODMAS rule, e.g., <code>MIN((Actual KPI % / Target KPI %) × 100,100)</code>)</li>
                  <li>• <strong>Column H:</strong> KPI</li>
                  <li>• <strong>Column I:</strong> Formula (KPI calculation)</li>
                </ul>
                <div className="flex gap-2 mt-3 text-xs flex-wrap">
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">(KR1 % + KR2 %) / 2</span>
                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 font-medium">MIN((Actual / Target) × 100, 100)</span>
                  <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">BODMAS Expressions</span>
                </div>
              </div>

              {v5Status === 'idle' && (
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-primary/50 rounded-lg cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Calculator className="h-10 w-10 text-primary mb-3" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">Click to upload</span> your V5 format file
                      </p>
                      <p className="text-xs text-muted-foreground">.xlsx or .xls files with formulas</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handleV5FileSelect}
                    />
                  </label>
                  <Button variant="outline" onClick={handleDownloadV5Template} className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download V5 Template
                  </Button>
                </div>
              )}

              {v5Status === 'parsing' && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Parsing {v5FileName}...</p>
                </div>
              )}

              {v5Status === 'preview' && v5Preview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Calculator className="h-5 w-5" />
                    <span className="font-medium">{v5FileName}</span>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">Import Preview:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Departments:</span>
                        <span className="font-medium text-foreground">{v5Preview.departments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Functional Objectives:</span>
                        <span className="font-medium text-foreground">{v5Preview.functionalObjectives}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Key Results:</span>
                        <span className="font-medium text-foreground">{v5Preview.keyResults}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">KPIs:</span>
                        <span className="font-medium text-foreground">{v5Preview.indicators}</span>
                      </div>
                    </div>
                  </div>

                  {/* Formula Preview */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Formulas Detected:</h4>
                    <div className="space-y-2 text-sm">
                      {v5Preview.formulas.foFormulas.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">FO Formulas:</span>
                          <span className="ml-2 font-mono text-xs">{v5Preview.formulas.foFormulas.join(', ')}</span>
                        </div>
                      )}
                      {v5Preview.formulas.krFormulas.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">KR Formulas:</span>
                          <span className="ml-2 font-mono text-xs">{v5Preview.formulas.krFormulas.join(', ')}</span>
                        </div>
                      )}
                      {v5Preview.formulas.kpiFormulas.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">KPI Formulas:</span>
                          <span className="ml-2 font-mono text-xs">{v5Preview.formulas.kpiFormulas.join(', ')}</span>
                        </div>
                      )}
                      {v5Preview.formulas.foFormulas.length === 0 && 
                       v5Preview.formulas.krFormulas.length === 0 && 
                       v5Preview.formulas.kpiFormulas.length === 0 && (
                        <p className="text-muted-foreground">No formulas detected - will use default AVG aggregation</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleV5Import} className="flex-1 gap-2">
                      <Database className="h-4 w-4" />
                      Import with Formulas
                    </Button>
                    <Button variant="outline" onClick={handleV5Reset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {v5Status === 'uploading' && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Importing data with formulas...</p>
                </div>
              )}

              {v5Status === 'success' && v5Result && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <p className="text-lg font-medium text-foreground">Import Complete!</p>
                    <p className="text-sm text-muted-foreground">
                      Formulas stored for dynamic calculations
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">Import Summary:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Departments:</span>
                        <span className="font-medium text-foreground">{v5Result.counts.departments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Functional Objectives:</span>
                        <span className="font-medium text-foreground">{v5Result.counts.functionalObjectives}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Key Results:</span>
                        <span className="font-medium text-foreground">{v5Result.counts.keyResults}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">KPIs:</span>
                        <span className="font-medium text-green-600">{v5Result.counts.indicators}</span>
                      </div>
                    </div>
                  </div>

                  {v5Result.warnings.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Warnings:</h4>
                      <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                        {v5Result.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button variant="outline" onClick={handleV5Reset} className="w-full">
                    Upload Another File
                  </Button>
                </div>
              )}

              {v5Status === 'error' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <p className="text-lg font-medium text-foreground">Import Failed</p>
                  </div>

                  {v5Result && v5Result.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Errors:</h4>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-y-auto">
                        {v5Result.errors.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button variant="outline" onClick={handleV5Reset} className="w-full">
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multisheet" className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Multi-Sheet OKR Import (OKRs_v4.0 Format)
              </CardTitle>
              <CardDescription>
                Import from files with separate sheets for Org Objectives, Hierarchy, and Indicators. Only green and yellow colored indicators are imported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-foreground">Expected Sheet Structure:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Sheet 1:</strong> Organizational Objectives (name, significance, classification)</li>
                  <li>• <strong>Sheet 2:</strong> Hierarchy (Department → Functional Objective → Key Result)</li>
                  <li>• <strong>Sheets 3-5:</strong> Indicators with Leading (Tier 1) and Lagging (Tier 2) columns</li>
                </ul>
                <div className="flex gap-2 mt-3 text-xs flex-wrap">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-medium">🟢 Green = Import</span>
                  <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">🟡 Yellow = Import</span>
                  <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 font-medium">🟠 Orange = Exclude</span>
                  <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium">⬜ No color = Exclude</span>
                </div>
              </div>

              {multiSheetStatus === 'idle' && (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-primary/50 rounded-lg cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Layers className="h-10 w-10 text-primary mb-3" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-primary">Click to upload</span> your multi-sheet OKR file
                    </p>
                    <p className="text-xs text-muted-foreground">.xlsx or .xls files (OKRs_v4.0 format)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleMultiSheetFileSelect}
                  />
                </label>
              )}

              {multiSheetStatus === 'parsing' && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Parsing {multiSheetFileName}...</p>
                </div>
              )}

              {multiSheetStatus === 'preview' && multiSheetPreview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Layers className="h-5 w-5" />
                    <span className="font-medium">{multiSheetFileName}</span>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">Import Preview:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Org Objectives:</span>
                        <span className="font-medium text-foreground">{multiSheetPreview.orgObjectives}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Departments:</span>
                        <span className="font-medium text-foreground">{multiSheetPreview.departments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Functional Objectives:</span>
                        <span className="font-medium text-foreground">{multiSheetPreview.functionalObjectives}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Key Results:</span>
                        <span className="font-medium text-foreground">{multiSheetPreview.keyResults}</span>
                      </div>
                    </div>
                  </div>

                  {/* Color breakdown table */}
                  <ColorBreakdownTable preview={multiSheetPreview} />

                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          {multiSheetPreview.totalToImport} indicators will be imported
                        </p>
                        {multiSheetPreview.totalToExclude > 0 && (
                          <p className="text-sm text-orange-600 dark:text-orange-400">
                            {multiSheetPreview.totalToExclude} indicators will be excluded based on cell color
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                          Tier 1: {multiSheetPreview.tier1Indicators}
                        </span>
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                          Tier 2: {multiSheetPreview.tier2Indicators}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleMultiSheetImport} className="flex-1 gap-2">
                      <Database className="h-4 w-4" />
                      Import {multiSheetPreview.totalToImport} Indicators
                    </Button>
                    <Button variant="outline" onClick={handleMultiSheetReset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {multiSheetStatus === 'uploading' && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Importing data...</p>
                </div>
              )}

              {multiSheetStatus === 'success' && importResult && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <p className="text-lg font-medium text-foreground">Import Complete!</p>
                    <p className="text-sm text-muted-foreground">
                      Imported {importResult.counts.indicators} indicators
                    </p>
                  </div>

                  {/* Show import statistics */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">Import Summary:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Org Objectives:</span>
                        <span className="font-medium text-foreground">{importResult.counts.orgObjectives}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Departments:</span>
                        <span className="font-medium text-foreground">{importResult.counts.departments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Functional Objectives:</span>
                        <span className="font-medium text-foreground">{importResult.counts.functionalObjectives}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Key Results:</span>
                        <span className="font-medium text-foreground">{importResult.counts.keyResults}</span>
                      </div>
                      <div className="flex justify-between col-span-2 pt-2 border-t">
                        <span className="text-muted-foreground">Indicators Imported:</span>
                        <span className="font-medium text-green-600">{importResult.counts.indicators}</span>
                      </div>
                    </div>
                  </div>

                  {/* Show excluded indicators */}
                  {importResult.excludedIndicators.length > 0 && (
                    <ExcludedIndicatorsList excluded={importResult.excludedIndicators} />
                  )}

                  <Button variant="outline" onClick={handleMultiSheetReset} className="w-full">
                    Upload Another File
                  </Button>
                </div>
              )}

              {multiSheetStatus === 'error' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <p className="text-lg font-medium text-foreground">Import Failed</p>
                    <p className="text-sm text-muted-foreground">Check the errors below</p>
                  </div>

                  {importResult && importResult.excludedIndicators.length > 0 && (
                    <ExcludedIndicatorsList excluded={importResult.excludedIndicators} />
                  )}

                  <Button variant="outline" onClick={handleMultiSheetReset} className="w-full">
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="space-y-6">
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Simplified Single-Sheet Template
              </CardTitle>
              <CardDescription>
                No manual linking required - hierarchy is auto-detected from your data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-foreground">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">1.</span>
                    Each row = one Indicator (the leaf of the hierarchy)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">2.</span>
                    Parent values (Org Objective, Department, etc.) repeat for each indicator
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">3.</span>
                    Use Ctrl+D to copy values down for the same parent
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">4.</span>
                    System auto-detects hierarchy from repeating values
                  </li>
                </ul>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">All columns in one sheet:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Identity:</strong> Color, Classification</p>
                  <p><strong>Hierarchy:</strong> Org Objective → Department → Functional Objective → Key Result → Indicator</p>
                  <p><strong>Metrics:</strong> Target, Current, Unit, Owner, Tier, Frequency</p>
                </div>
              </div>

              <Button onClick={handleDownloadTemplate} className="w-full gap-2">
                <Download className="h-4 w-4" />
                Download Simple Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Simple Format Excel File</CardTitle>
              <CardDescription>
                Upload your single-sheet Excel file - hierarchy is automatically detected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {uploadStatus === 'idle' && (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">.xlsx or .xls files</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                  />
                </label>
              )}

              {uploadStatus === 'parsing' && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Parsing {fileName}...</p>
                </div>
              )}

              {uploadStatus === 'preview' && preview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="font-medium">{fileName}</span>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">Import Preview:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Org Objectives:</span>
                        <span className="font-medium text-foreground">{preview.orgObjectives}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Departments:</span>
                        <span className="font-medium text-foreground">{preview.departments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Functional Objectives:</span>
                        <span className="font-medium text-foreground">{preview.functionalObjectives}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Key Results:</span>
                        <span className="font-medium text-foreground">{preview.keyResults}</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">Indicators:</span>
                        <span className="font-medium text-foreground">{preview.indicators}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleImport} className="flex-1 gap-2">
                      <Database className="h-4 w-4" />
                      Import to Database
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {uploadStatus === 'uploading' && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Importing data...</p>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <p className="text-sm font-medium text-foreground">Import Complete!</p>
                  <Button variant="outline" onClick={handleReset}>
                    Upload Another File
                  </Button>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="text-sm font-medium text-foreground">Import Failed</p>
                  <p className="text-xs text-muted-foreground">Check the errors above</p>
                  <Button variant="outline" onClick={handleReset}>
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Demo Data</CardTitle>
              <CardDescription>
                The system includes pre-loaded demo data for exploration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6">
                <h4 className="font-medium mb-3">Demo Data Includes:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 bg-card rounded-lg">
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-muted-foreground">Organizational Objectives</p>
                  </div>
                  <div className="p-4 bg-card rounded-lg">
                    <p className="text-2xl font-bold">16</p>
                    <p className="text-muted-foreground">Customers (India & UAE)</p>
                  </div>
                  <div className="p-4 bg-card rounded-lg">
                    <p className="text-2xl font-bold">17</p>
                    <p className="text-muted-foreground">Campaigns</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleUseDemoData} className="w-full md:w-auto">
                <Database className="h-4 w-4 mr-2" />
                Use Demo Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
