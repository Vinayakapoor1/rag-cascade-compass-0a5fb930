import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Download, Puzzle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  getFeatureImportPreview, 
  importFeaturesToDatabase, 
  generateFeatureTemplate,
  FeatureImportPreview 
} from '@/lib/featureExcelImporter';

interface FeatureUploaderProps {
  onImportComplete?: () => void;
}

export function FeatureUploader({ onImportComplete }: FeatureUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FeatureImportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const previewData = await getFeatureImportPreview(selectedFile);
      setPreview(previewData);
      toast.success(`Found ${previewData.totalCount} features in file`);
    } catch (error) {
      toast.error('Failed to parse Excel file');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.features.length === 0) {
      toast.error('No features to import');
      return;
    }

    setIsImporting(true);

    try {
      const result = await importFeaturesToDatabase(preview.features);

      if (result.success) {
        toast.success(`Imported ${result.imported} new features, updated ${result.updated} existing`);
        resetForm();
        onImportComplete?.();
      } else {
        toast.error(`Import completed with errors: ${result.errors.slice(0, 3).join(', ')}`);
      }
    } catch (error) {
      toast.error('Import failed unexpectedly');
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Upload Feature Data
          </CardTitle>
          <CardDescription>
            Upload an Excel file with feature information. Columns: Feature Name, Category, Description, Status
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
                <Button variant="ghost" size="sm" onClick={resetForm}>
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

      {/* Preview */}
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

            {/* Summary */}
            <div className="p-6 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold">{preview.totalCount}</p>
              <p className="text-sm text-muted-foreground">Total Features</p>
            </div>

            {/* By Category */}
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">By Category:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.byCategory).map(([category, count]) => (
                  <Badge key={category} variant="secondary">
                    {category}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            {/* By Status */}
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">By Status:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.byStatus).map(([status, count]) => (
                  <Badge key={status} variant="outline">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {file && preview && preview.totalCount > 0 && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleImport}
            disabled={isImporting}
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
                Import {preview.totalCount} Features
              </>
            )}
          </Button>
        </div>
      )}

      {/* Download Template */}
      <Card className="bg-muted/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Feature Template</CardTitle>
            <Button variant="outline" size="sm" onClick={generateFeatureTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Download a template with the correct column headers and sample data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
