import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Download, Users, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getCustomerImportPreview,
  importCustomersToDatabase,
  generateCustomerTemplate,
  CustomerImportPreview
} from '@/lib/customerExcelImporter';

interface CustomerUploaderProps {
  onImportComplete?: () => void;
}

export function CustomerUploader({ onImportComplete }: CustomerUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CustomerImportPreview | null>(null);
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
      const previewData = await getCustomerImportPreview(selectedFile);
      setPreview(previewData);
      toast.success(`Found ${previewData.totalCount} customers in file`);
    } catch (error) {
      toast.error('Failed to parse Excel file');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.customers.length === 0) {
      toast.error('No customers to import');
      return;
    }

    setIsImporting(true);

    try {
      const result = await importCustomersToDatabase(preview.customers);

      if (result.success) {
        // Build success message with customer stats
        const customerStats = [];
        if (result.imported > 0) customerStats.push(`${result.imported} new`);
        if (result.updated > 0) customerStats.push(`${result.updated} updated`);

        const customerMessage = `Customers: ${customerStats.join(', ') || '0'}`;

        // Build feature stats message
        const featureStats = [];
        if (result.featuresCreated > 0) featureStats.push(`${result.featuresCreated} created`);
        if (result.featuresLinked > 0) featureStats.push(`${result.featuresLinked} linked`);

        const featureMessage = featureStats.length > 0
          ? `Features: ${featureStats.join(', ')}`
          : '';

        // Combine messages
        const messages = [customerMessage];
        if (featureMessage) messages.push(featureMessage);

        toast.success(
          <div className="space-y-1">
            <div className="font-semibold">Import Successful!</div>
            <div className="text-sm">{messages.join(' • ')}</div>
          </div>
        );

        resetForm();
        onImportComplete?.();
      } else {
        const errorSummary = result.errors.slice(0, 3).join(', ');
        toast.error(`Import completed with ${result.errors.length} error(s): ${errorSummary}`);
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
            <Users className="h-5 w-5" />
            Upload Customer Data
          </CardTitle>
          <CardDescription>
            Upload an Excel file with customer information. Columns: Company Name, Contact Person, Email, Region, Tier, Industry, CSM, Features, Additional Features, Managed Services, Deployment Type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
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
              <p className="text-sm text-muted-foreground">Total Customers</p>
            </div>

            {/* By Tier */}
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">By Tier:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.byTier).map(([tier, count]) => (
                  <Badge key={tier} variant="secondary">
                    {tier}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            {/* By Region */}
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">By Region:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.byRegion).map(([region, count]) => (
                  <Badge key={region} variant="outline">
                    {region}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            {/* By Industry */}
            {Object.keys(preview.byIndustry).length > 0 && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">By Industry:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.byIndustry).slice(0, 8).map(([industry, count]) => (
                    <Badge key={industry} variant="outline">
                      {industry}: {count}
                    </Badge>
                  ))}
                  {Object.keys(preview.byIndustry).length > 8 && (
                    <Badge variant="outline">+{Object.keys(preview.byIndustry).length - 8} more</Badge>
                  )}
                </div>
              </div>
            )}

            {/* CSM Mapping Summary */}
            {Object.keys(preview.byCSM).length > 0 && (
              <div className="border rounded-lg p-4 bg-primary/5">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  CSM Assignments:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.byCSM).map(([csm, count]) => (
                    <Badge key={csm} variant="secondary">
                      {csm}: {count} customer{count > 1 ? 's' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Unique Features */}
            {preview.uniqueFeatures.length > 0 && (
              <div className="border rounded-lg p-4 bg-primary/5">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-rag-green" />
                  Unique Features ({preview.uniqueFeatures.length}) · Avg {preview.avgFeaturesPerCustomer} per customer:
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {preview.uniqueFeatures.slice(0, 20).map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {preview.uniqueFeatures.length > 20 && (
                    <Badge variant="secondary" className="text-xs">
                      +{preview.uniqueFeatures.length - 20} more
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  These features will be automatically created and linked to customers
                </p>
              </div>
            )}
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
                Import {preview.totalCount} Customers
              </>
            )}
          </Button>
        </div>
      )}

      {/* Download Template */}
      <Card className="bg-muted/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Customer Template</CardTitle>
            <Button variant="outline" size="sm" onClick={generateCustomerTemplate}>
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
