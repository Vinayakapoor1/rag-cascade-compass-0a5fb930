import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureRow {
  name: string;
  category: string | null;
  description: string | null;
  status: string;
}

export interface FeatureImportPreview {
  features: FeatureRow[];
  totalCount: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  warnings: string[];
}

export interface FeatureImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
}

// Column mapping
const COLUMN_MAP: Record<string, keyof FeatureRow> = {
  'feature name': 'name',
  'name': 'name',
  'feature': 'name',
  'category': 'category',
  'feature category': 'category',
  'description': 'description',
  'notes': 'description',
  'status': 'status',
  'feature status': 'status',
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_-]/g, ' ');
}

function normalizeStatus(status: string | null): string {
  if (!status) return 'Active';
  const normalized = status.trim().toLowerCase();
  if (normalized === 'inactive' || normalized === 'disabled' || normalized === 'off') {
    return 'Inactive';
  }
  if (normalized === 'deprecated' || normalized === 'retired') {
    return 'Deprecated';
  }
  return 'Active';
}

export async function getFeatureImportPreview(file: File): Promise<FeatureImportPreview> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
  
  const warnings: string[] = [];
  const features: FeatureRow[] = [];
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  
  // Track feature names to detect duplicates within the file
  const seenNames: Map<string, number> = new Map();

  // Get header mapping from first row keys
  const headerMap: Record<string, keyof FeatureRow> = {};
  if (jsonData.length > 0) {
    Object.keys(jsonData[0]).forEach(key => {
      const normalizedKey = normalizeHeader(key);
      if (COLUMN_MAP[normalizedKey]) {
        headerMap[key] = COLUMN_MAP[normalizedKey];
      }
    });
  }

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const feature: Partial<FeatureRow> = {};
    
    // Map columns
    Object.entries(row).forEach(([key, value]) => {
      const mappedKey = headerMap[key];
      if (mappedKey && value !== undefined && value !== null) {
        (feature as any)[mappedKey] = String(value).trim();
      }
    });

    // Validate required fields
    if (!feature.name || feature.name.trim() === '') {
      warnings.push(`Row ${i + 2}: Missing or empty feature name - row will be skipped`);
      continue;
    }

    const trimmedName = feature.name.trim();
    
    // Check for duplicates within the file
    const previousRow = seenNames.get(trimmedName.toLowerCase());
    if (previousRow !== undefined) {
      warnings.push(`Row ${i + 2}: Duplicate feature name "${trimmedName}" (first seen in row ${previousRow}) - will update the same record`);
    } else {
      seenNames.set(trimmedName.toLowerCase(), i + 2);
    }

    // Normalize
    const status = normalizeStatus(feature.status || null);
    const category = feature.category || 'Uncategorized';

    const featureRow: FeatureRow = {
      name: trimmedName,
      category: feature.category?.trim() || null,
      description: feature.description?.trim() || null,
      status,
    };

    features.push(featureRow);

    // Count by category
    byCategory[category] = (byCategory[category] || 0) + 1;
    
    // Count by status
    byStatus[status] = (byStatus[status] || 0) + 1;
  }

  return {
    features,
    totalCount: features.length,
    byCategory,
    byStatus,
    warnings,
  };
}

export async function importFeaturesToDatabase(features: FeatureRow[]): Promise<FeatureImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;

  for (const feature of features) {
    try {
      // Check if feature exists by name
      const { data: existing } = await supabase
        .from('features')
        .select('id')
        .eq('name', feature.name)
        .maybeSingle();

      if (existing) {
        // Update existing feature
        const { error } = await supabase
          .from('features')
          .update({
            category: feature.category,
            description: feature.description,
            status: feature.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
        updated++;
      } else {
        // Insert new feature
        const { error } = await supabase
          .from('features')
          .insert({
            name: feature.name,
            category: feature.category,
            description: feature.description,
            status: feature.status,
          });

        if (error) throw error;
        imported++;
      }
    } catch (error: any) {
      errors.push(`${feature.name}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    imported,
    updated,
    errors,
  };
}

export function generateFeatureTemplate(): void {
  const workbook = XLSX.utils.book_new();
  
  const data = [
    ['Feature Name', 'Category', 'Description', 'Status'],
    ['Dashboard Analytics', 'Reporting', 'Real-time analytics dashboard with charts', 'Active'],
    ['Email Notifications', 'Communication', 'Automated email alerts and notifications', 'Active'],
    ['API Integration', 'Integration', 'REST API for third-party integrations', 'Active'],
    ['User Management', 'Admin', 'User roles and permissions management', 'Active'],
    ['Data Export', 'Reporting', 'Export data to CSV and Excel formats', 'Inactive'],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  sheet['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 45 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Features');
  XLSX.writeFile(workbook, 'feature_import_template.xlsx');
}
