import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { generateComprehensiveTemplate } from '@/lib/comprehensiveExcelTemplate';
import { getUnifiedPreview, importUnifiedExcel, UnifiedImportPreview } from '@/lib/unifiedExcelImporter';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RAGMatrixCard } from './RAGMatrixCard';

const DEPARTMENT_COLORS = [
  { name: 'Green', value: 'green', class: 'bg-org-green' },
  { name: 'Purple', value: 'purple', class: 'bg-org-purple' },
  { name: 'Blue', value: 'blue', class: 'bg-org-blue' },
  { name: 'Yellow', value: 'yellow', class: 'bg-org-yellow' },
  { name: 'Orange', value: 'orange', class: 'bg-org-orange' },
];

export function DepartmentUploader({ onImportComplete }: { onImportComplete?: () => void }) {
  const [selectedColor, setSelectedColor] = useState('green');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UnifiedImportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Collapsible sections
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  const [showHierarchy, setShowHierarchy] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const previewData = await getUnifiedPreview(selectedFile);
      setPreview(previewData);

      toast.success(`Parsed ${previewData.indicatorCount} indicators from ${previewData.orgObjectives.length} org objectives`);
    } catch (error) {
      toast.error('Failed to parse Excel file');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) {
      toast.error('Please select a file');
      return;
    }

    if (preview.orgObjectives.length === 0) {
      toast.error('No organizational objectives found in the file. Please ensure the "Organizational Objective" column is filled.');
      return;
    }

    setIsImporting(true);

    try {
      const result = await importUnifiedExcel(file, {
        departmentColor: selectedColor,
      });

      if (result.success) {
        toast.success(
          `Imported: ${result.counts.orgObjectives} Org Objectives, ${result.counts.departments} Departments, ${result.counts.functionalObjectives} FOs, ${result.counts.keyResults} KRs, ${result.counts.indicators} Indicators`
        );
        
        // Reset form
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        onImportComplete?.();
      } else {
        toast.error(`Import failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error('Import failed unexpectedly');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.match(/\.(xlsx|xls)$/i)) {
      const fakeEvent = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileSelect(fakeEvent);
    }
  };

  const canImport = file && preview && preview.orgObjectives.length > 0;

  return (
    <div className="space-y-6">
      {/* RAG Matrix Reference */}
      <RAGMatrixCard />

      {/* Department Color (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Department Color (Optional)</CardTitle>
          <CardDescription>
            Choose a color theme for imported departments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Color Theme</Label>
            <div className="flex gap-2">
              {DEPARTMENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-10 h-10 rounded-full ${color.class} transition-all ${
                    selectedColor === color.value
                      ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Excel Sheet</CardTitle>
          <CardDescription>
            Upload your OKR template with 8 columns: Department, Owner, Organizational Objective, Functional Objective, Key Result, Indicator Name, Formula, Target Value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-10 w-10 text-primary" />
                <p className="font-medium">{file.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop an Excel file, or click to browse
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select File
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-rag-green" />
              Import Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-rag-amber/10 border border-rag-amber/30">
                <div className="flex items-center gap-2 text-rag-amber font-medium mb-2">
                  <AlertCircle className="h-4 w-4" />
                  {preview.warnings.length} Warning(s)
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {preview.warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                  {preview.warnings.length > 5 && (
                    <li>...and {preview.warnings.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{preview.orgObjectives.length}</p>
                <p className="text-sm text-muted-foreground">Org Objectives</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{preview.departments.length}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{preview.functionalObjectives.length}</p>
                <p className="text-sm text-muted-foreground">Func. Objectives</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{preview.keyResults.length}</p>
                <p className="text-sm text-muted-foreground">Key Results</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{preview.indicatorCount}</p>
                <p className="text-sm text-muted-foreground">Indicators</p>
              </div>
            </div>

            {/* Universal RAG Notice */}
            <div className="p-4 rounded-lg bg-rag-green/10 border border-rag-green/30">
              <p className="font-medium text-rag-green flex items-center gap-2">
                Universal RAG Thresholds Applied
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                All indicators will use: <span className="text-rag-red">1-50 Red</span> | <span className="text-rag-amber">51-75 Amber</span> | <span className="text-rag-green">76-100 Green</span>
              </p>
            </div>

            {/* Formulas Section */}
            <Collapsible open={showFormulaDetails} onOpenChange={setShowFormulaDetails}>
              <CollapsibleTrigger asChild>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/15 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-500 flex items-center gap-2">
                        Formulas
                        <Badge className="bg-blue-500/20 text-blue-500">
                          {preview.formulasConfigured} configured
                        </Badge>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click to see formula details per indicator
                      </p>
                    </div>
                    {showFormulaDetails ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Indicator</th>
                        <th className="text-left p-2">Formula</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.formulaDetails.slice(0, 10).map((f, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-medium">{f.indicatorName}</td>
                          <td className="p-2 font-mono text-xs">{f.formula}</td>
                        </tr>
                      ))}
                      {preview.formulaDetails.length > 10 && (
                        <tr className="border-t">
                          <td colSpan={2} className="p-2 text-center text-muted-foreground">
                            ...and {preview.formulaDetails.length - 10} more
                          </td>
                        </tr>
                      )}
                      {preview.formulasConfigured === 0 && (
                        <tr>
                          <td colSpan={2} className="p-2 text-center text-muted-foreground">
                            No formulas found in the Excel file
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Hierarchy Section */}
            <Collapsible open={showHierarchy} onOpenChange={setShowHierarchy}>
              <CollapsibleTrigger asChild>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 cursor-pointer hover:bg-purple-500/15 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-purple-500 flex items-center gap-2">
                        OKR Hierarchy Details
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click to see org objectives, departments, FOs, KRs
                      </p>
                    </div>
                    {showHierarchy ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3">
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Organizational Objectives:</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.orgObjectives.map((o, i) => (
                      <Badge key={i} variant="default">{o}</Badge>
                    ))}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Departments:</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.departments.map((d, i) => (
                      <Badge key={i} variant="outline">{d}</Badge>
                    ))}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Functional Objectives:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {preview.functionalObjectives.slice(0, 5).map((fo, i) => (
                      <li key={i}>• {fo}</li>
                    ))}
                    {preview.functionalObjectives.length > 5 && (
                      <li>...and {preview.functionalObjectives.length - 5} more</li>
                    )}
                  </ul>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Key Results:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {preview.keyResults.slice(0, 5).map((kr, i) => (
                      <li key={i}>• {kr}</li>
                    ))}
                    {preview.keyResults.length > 5 && (
                      <li>...and {preview.keyResults.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {file && preview && (
        <div className="flex justify-end gap-2">
          {!canImport && (
            <div className="flex items-center gap-2 text-amber-500 mr-auto">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No organizational objectives found in file</span>
            </div>
          )}
          <Button
            onClick={handleImport}
            disabled={!canImport || isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import All Data
              </>
            )}
          </Button>
        </div>
      )}

      {/* Download Template */}
      <Card className="bg-muted/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Excel Template</CardTitle>
            <Button variant="outline" size="sm" onClick={generateComprehensiveTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-3 text-muted-foreground">
            <p className="font-medium text-foreground">8-Column Template:</p>
            <div className="bg-background rounded p-2 font-mono overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-1">Dept</th>
                    <th className="p-1">Owner</th>
                    <th className="p-1">Org Objective</th>
                    <th className="p-1">Func. Obj</th>
                    <th className="p-1">Key Result</th>
                    <th className="p-1">Indicator</th>
                    <th className="p-1">Formula</th>
                    <th className="p-1">Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-1">CS</td>
                    <td className="p-1">Tanvi</td>
                    <td className="p-1">Max CS</td>
                    <td className="p-1">Adoption</td>
                    <td className="p-1">+25% usage</td>
                    <td className="p-1">Adoption Rate</td>
                    <td className="p-1">(a/b)*100</td>
                    <td className="p-1">80</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2">
              <strong>Universal RAG:</strong> 1-50 Red | 51-75 Amber | 76-100 Green
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
