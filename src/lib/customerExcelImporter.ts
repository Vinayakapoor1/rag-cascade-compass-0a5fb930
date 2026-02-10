import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerRow {
  companyName: string;
  contactPerson: string | null;
  email: string | null;
  region: string | null;
  tier: string;
  industry: string | null;
  csm: string | null;
  features: string | null;
  additionalFeatures: string | null;
  managedServices: boolean;
  deploymentType: string | null;
}

export interface CustomerImportPreview {
  customers: CustomerRow[];
  totalCount: number;
  byTier: Record<string, number>;
  byRegion: Record<string, number>;
  byIndustry: Record<string, number>;
  byCSM: Record<string, number>;
  uniqueFeatures: string[];
  avgFeaturesPerCustomer: number;
  warnings: string[];
}

export interface CustomerImportResult {
  success: boolean;
  imported: number;
  updated: number;
  featuresCreated: number;
  featuresLinked: number;
  errors: string[];
}

// Column mapping from Excel headers to our fields
const COLUMN_MAP: Record<string, keyof CustomerRow> = {
  'company name': 'companyName',
  'company': 'companyName',
  'name': 'companyName',
  'contact person': 'contactPerson',
  'contact': 'contactPerson',
  'email': 'email',
  'region': 'region',
  'tier': 'tier',
  'industry': 'industry',
  'csm': 'csm',
  'customer success manager': 'csm',
  'features': 'features',
  'additional features': 'additionalFeatures',
  'managed services': 'managedServices',
  'deployment type': 'deploymentType',
  'deployment': 'deploymentType',
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim();
}

function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'yes' || lower === 'true' || lower === '1';
  }
  return Boolean(value);
}

function normalizeTier(tier: string | null): string {
  if (!tier) return 'Tier1';
  const normalized = tier.replace(/\s+/g, '').toLowerCase();
  if (normalized.includes('1') || normalized.includes('one')) return 'Tier1';
  if (normalized.includes('2') || normalized.includes('two')) return 'Tier2';
  if (normalized.includes('3') || normalized.includes('three')) return 'Tier3';
  return 'Tier1';
}

export async function getCustomerImportPreview(file: File): Promise<CustomerImportPreview> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  const customers: CustomerRow[] = [];
  const warnings: string[] = [];
  const byTier: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const byIndustry: Record<string, number> = {};
  const byCSM: Record<string, number> = {};
  const allFeatures = new Set<string>();
  let totalFeatureCount = 0;

  // Get header mapping
  const headers = Object.keys(rows[0] || {});
  const headerMap: Record<string, keyof CustomerRow> = {};

  headers.forEach(h => {
    const normalized = normalizeHeader(h);
    if (COLUMN_MAP[normalized]) {
      headerMap[h] = COLUMN_MAP[normalized];
    }
  });

  if (!Object.values(headerMap).includes('companyName')) {
    warnings.push('No "Company Name" column found - looking for alternatives');
  }

  rows.forEach((row, index) => {
    const customer: Partial<CustomerRow> = {
      tier: 'Tier1',
      managedServices: false,
      deploymentType: null,
    };

    Object.entries(row).forEach(([header, value]) => {
      const field = headerMap[header];
      if (field && value !== undefined && value !== null && value !== '') {
        if (field === 'managedServices') {
          customer[field] = parseBoolean(value);
        } else if (field === 'tier') {
          customer[field] = normalizeTier(String(value));
        } else {
          (customer as any)[field] = String(value).trim();
        }
      }
    });

    if (!customer.companyName) {
      warnings.push(`Row ${index + 2}: Missing company name, skipping`);
      return;
    }

    const tier = customer.tier || 'Tier1';
    const region = customer.region || 'Unknown';
    const industry = customer.industry || 'Unknown';
    const csm = customer.csm || 'Unassigned';

    byTier[tier] = (byTier[tier] || 0) + 1;
    byRegion[region] = (byRegion[region] || 0) + 1;
    byIndustry[industry] = (byIndustry[industry] || 0) + 1;
    byCSM[csm] = (byCSM[csm] || 0) + 1;

    // Collect unique features
    if (customer.features) {
      const features = parseFeatures(customer.features);
      features.forEach(f => allFeatures.add(f));
      totalFeatureCount += features.length;
    }

    customers.push(customer as CustomerRow);
  });

  const avgFeaturesPerCustomer = customers.length > 0
    ? Math.round((totalFeatureCount / customers.length) * 10) / 10
    : 0;

  return {
    customers,
    totalCount: customers.length,
    byTier,
    byRegion,
    byIndustry,
    byCSM,
    uniqueFeatures: Array.from(allFeatures).sort(),
    avgFeaturesPerCustomer,
    warnings,
  };
}

/**
 * Parse features from a comma or semicolon-separated string
 */
function parseFeatures(featuresString: string | null): string[] {
  if (!featuresString) return [];

  return featuresString
    .split(/[,;]/) // Split by comma or semicolon
    .map(f => f.trim().toUpperCase()) // Normalize to uppercase
    .filter(f => f.length > 0) // Remove empty strings
    .filter((f, i, arr) => arr.indexOf(f) === i); // Remove duplicates
}

/**
 * Link customer to features, creating feature records if needed
 */
async function linkCustomerFeatures(
  customerId: string,
  featureNames: string[]
): Promise<{ created: number; linked: number; errors: string[] }> {
  let created = 0;
  let linked = 0;
  const errors: string[] = [];

  for (const featureName of featureNames) {
    try {
      // Check if feature exists
      let { data: feature } = await supabase
        .from('features')
        .select('id')
        .eq('name', featureName)
        .maybeSingle();

      // Create feature if it doesn't exist
      if (!feature) {
        const { data: newFeature, error: createError } = await supabase
          .from('features')
          .insert({
            name: featureName,
            status: 'Active',
            category: 'Imported from Customer Data'
          })
          .select('id')
          .single();

        if (createError) {
          errors.push(`Failed to create feature "${featureName}": ${createError.message}`);
          continue;
        }

        feature = newFeature;
        created++;
      }

      // Link customer to feature
      if (feature) {
        const { error: linkError } = await supabase
          .from('customer_features')
          .upsert({
            customer_id: customerId,
            feature_id: feature.id
          }, {
            onConflict: 'customer_id,feature_id'
          });

        if (linkError) {
          errors.push(`Failed to link feature "${featureName}": ${linkError.message}`);
        } else {
          linked++;
        }
      }
    } catch (err) {
      errors.push(`Error processing feature "${featureName}": ${String(err)}`);
    }
  }

  return { created, linked, errors };
}

export async function importCustomersToDatabase(
  customers: CustomerRow[]
): Promise<CustomerImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;
  let featuresCreated = 0;
  let featuresLinked = 0;

  // Get existing customers by name for duplicate detection
  const { data: existingCustomers } = await supabase
    .from('customers')
    .select('id, name');

  const existingByName = new Map(
    (existingCustomers || []).map(c => [c.name.toLowerCase(), c.id])
  );

  // Get/create CSMs
  const csmNames = [...new Set(customers.map(c => c.csm).filter(Boolean))] as string[];
  const csmMap = new Map<string, string>();

  for (const csmName of csmNames) {
    const { data: existing } = await supabase
      .from('csms')
      .select('id')
      .eq('name', csmName)
      .maybeSingle();

    if (existing) {
      csmMap.set(csmName, existing.id);
    } else {
      const { data: created, error } = await supabase
        .from('csms')
        .insert({ name: csmName })
        .select('id')
        .single();

      if (created) {
        csmMap.set(csmName, created.id);
      }
    }
  }

  // Import customers
  for (const customer of customers) {
    try {
      const existingId = existingByName.get(customer.companyName.toLowerCase());

      const customerData = {
        name: customer.companyName,
        contact_person: customer.contactPerson,
        email: customer.email,
        region: customer.region,
        tier: customer.tier,
        industry: customer.industry,
        csm_id: customer.csm ? csmMap.get(customer.csm) || null : null,
        additional_features: customer.additionalFeatures,
        managed_services: customer.managedServices,
        deployment_type: customer.deploymentType,
        metadata: customer.features ? { features: customer.features } : null,
      };

      let customerId: string | undefined;

      if (existingId) {
        // Update existing
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', existingId);

        if (error) {
          errors.push(`Failed to update ${customer.companyName}: ${error.message}`);
        } else {
          updated++;
          customerId = existingId;
        }
      } else {
        // Insert new
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert(customerData)
          .select('id')
          .single();

        if (error) {
          errors.push(`Failed to import ${customer.companyName}: ${error.message}`);
        } else {
          imported++;
          customerId = newCustomer?.id;
        }
      }

      // Parse and link features if customer was created/updated successfully
      if (customerId && customer.features) {
        const featureNames = parseFeatures(customer.features);

        if (featureNames.length > 0) {
          const featureResult = await linkCustomerFeatures(customerId, featureNames);
          featuresCreated += featureResult.created;
          featuresLinked += featureResult.linked;

          if (featureResult.errors.length > 0) {
            errors.push(...featureResult.errors.map(e => `${customer.companyName}: ${e}`));
          }
        }
      }
    } catch (err) {
      errors.push(`Error processing ${customer.companyName}: ${String(err)}`);
    }
  }

  return {
    success: errors.length === 0,
    imported,
    updated,
    featuresCreated,
    featuresLinked,
    errors,
  };
}

export function generateCustomerTemplate(): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Company Name',
    'Contact Person',
    'Email',
    'Region',
    'Tier',
    'Industry',
    'CSM',
    'Features',
    'Additional Features',
    'Managed Services',
    'Deployment Type',
  ];

  const sampleData = [
    ['Acme Corp', 'John Doe', 'john@acme.com', 'North America', 'Tier 1', 'Technology', 'Sahil Kapoor', 'Phishing Email, LMS, Gamification', 'Custom Dashboard', 'Yes', 'Cloud'],
    ['Beta Finance', 'Alice Brown', 'alice@beta.com', 'Europe', 'Tier 2', 'Finance', 'Pooja Singh', 'Phishing Email, Smishing', 'API Access', 'No', 'On-Premise'],
    ['Global Health Ltd', 'Raj Patel', 'raj@globalhealth.com', 'APAC', 'Tier 1', 'Healthcare', 'Sahil Kapoor', 'LMS, Gamification, Phishing Email, Smishing', '', 'Yes', 'Hybrid'],
    ['Delta Manufacturing', 'Maria Garcia', 'maria@delta.com', 'Latin America', 'Tier 3', 'Manufacturing', 'Pooja Singh', 'Phishing Email', '', 'No', 'Cloud'],
    ['Omega Retail', 'Chen Wei', 'chen@omega.com', 'APAC', 'Tier 2', 'Retail', 'Amit Sharma', 'LMS, Gamification', 'White Label', 'Yes', 'Cloud'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws['!cols'] = [
    { wch: 22 }, // Company Name
    { wch: 16 }, // Contact Person
    { wch: 24 }, // Email
    { wch: 16 }, // Region
    { wch: 10 }, // Tier
    { wch: 16 }, // Industry
    { wch: 16 }, // CSM
    { wch: 36 }, // Features (wider for comma-separated lists)
    { wch: 20 }, // Additional Features
    { wch: 16 }, // Managed Services
    { wch: 16 }, // Deployment Type
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, 'customer_import_template.xlsx');
}
