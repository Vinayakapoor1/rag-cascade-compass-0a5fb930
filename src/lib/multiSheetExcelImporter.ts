import * as XLSX from 'xlsx-js-style';
import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

// ==================== COLOR FILTERING TYPES ====================

export interface ExcludedIndicator {
  name: string;
  keyResult: string;
  functionalObjective: string;
  tier: 'tier1' | 'tier2';
  cellColor: string | null;
  colorName: string;
  reason: string;
  rowNumber: number;
}

export interface ColorStats {
  green: number;
  yellow: number;
  orange: number;
  red: number;
  noColor: number;
  other: number;
}

export interface FailedIndicatorMatch {
  indicatorName: string;
  keyResultName: string;
  functionalObjective: string;
  tier: string;
}

export interface MultiSheetImportResult {
  success: boolean;
  counts: {
    orgObjectives: number;
    departments: number;
    functionalObjectives: number;
    keyResults: number;
    indicators: number;
  };
  errors: string[];
  failedMatches: FailedIndicatorMatch[];
  matchStats: {
    exact: number;
    normalized: number;
    fuzzy: number;
    dbLookup: number;
    failed: number;
  };
  excludedIndicators: ExcludedIndicator[];
  colorStats: ColorStats;
}

interface OrgObjectiveRow {
  name: string;
  significance: string;
  classification: 'CORE' | 'Enabler';
  color: string;
}

interface HierarchyRow {
  orgObjectiveName: string;
  department: string;
  functionalObjective: string;
  keyResult: string;
}

interface IndicatorRow {
  functionalObjective: string;
  keyResult: string;
  name: string;
  formula: string;
  frequency: string;
  tier: 'tier1' | 'tier2';
}

interface IndicatorRowWithColor extends IndicatorRow {
  cellColor: string | null;
  colorCategory: 'green' | 'yellow' | 'orange' | 'red' | 'noColor' | 'other';
  colorName: string;
  rowNumber: number;
}

export interface ParsedMultiSheetData {
  orgObjectives: OrgObjectiveRow[];
  hierarchy: HierarchyRow[];
  indicators: IndicatorRow[];
  indicatorsWithColors: IndicatorRowWithColor[];
  colorStats: ColorStats;
}

const ORG_OBJECTIVE_COLORS: Record<string, string> = {
  'Maximize Customer Success': 'green',
  'Optimize Business Operations': 'blue',
  'Accelerate Growth': 'purple',
  'Drive Innovation': 'yellow',
  'Strengthen Security': 'orange',
};

// ==================== COLOR DETECTION USING EXCELJS ====================

// Standard Excel theme colors (approximate RGB values)
const THEME_COLORS: Record<number, string> = {
  0: 'FFFFFF', // Background 1
  1: '000000', // Text 1
  2: 'E7E6E6', // Background 2
  3: '44546A', // Text 2
  4: '4472C4', // Accent 1
  5: 'ED7D31', // Accent 2 (Orange)
  6: 'A5A5A5', // Accent 3
  7: 'FFC000', // Accent 4 (Yellow/Gold)
  8: '5B9BD5', // Accent 5
  9: '70AD47', // Accent 6 (Green)
};

function classifyColorFromArgb(argb: string | undefined): { name: string; category: 'green' | 'yellow' | 'orange' | 'red' | 'noColor' | 'other' } {
  if (!argb) {
    return { name: 'No color', category: 'noColor' };
  }
  
  // Remove alpha channel if present (ARGB -> RGB)
  const hex = argb.length === 8 ? argb.substring(2).toLowerCase() : argb.toLowerCase();
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // White or very light colors (treat as no color)
  if (r > 240 && g > 240 && b > 240) {
    return { name: 'No color', category: 'noColor' };
  }
  
  // Calculate HSL for better color detection
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) * 60;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) * 60;
        break;
    }
  }
  
  // Very low saturation = gray/no color
  if (s < 0.15 && l > 0.7) {
    return { name: 'No color', category: 'noColor' };
  }
  
  // Classify by hue
  // Green: 80-160
  if (h >= 80 && h < 160) {
    return { name: 'Green', category: 'green' };
  }
  
  // Yellow: 45-80
  if (h >= 45 && h < 80) {
    return { name: 'Yellow', category: 'yellow' };
  }
  
  // Orange: 15-45
  if (h >= 15 && h < 45) {
    return { name: 'Orange', category: 'orange' };
  }
  
  // Red: 0-15 or 340-360
  if (h < 15 || h >= 340) {
    return { name: 'Red', category: 'red' };
  }
  
  // Everything else
  return { name: `Other (#${hex})`, category: 'other' };
}

function getCellColorFromExcelJS(cell: ExcelJS.Cell): { argb: string | null; colorInfo: ReturnType<typeof classifyColorFromArgb> } {
  try {
    const fill = cell.fill as ExcelJS.FillPattern;
    
    if (!fill || fill.type !== 'pattern' || !fill.fgColor) {
      return { argb: null, colorInfo: { name: 'No color', category: 'noColor' } };
    }
    
    const fgColor = fill.fgColor;
    let argb: string | null = null;
    
    // Handle different color formats
    if (fgColor.argb) {
      argb = fgColor.argb;
    } else if (fgColor.theme !== undefined) {
      // Theme color - use approximate values
      const themeColor = THEME_COLORS[fgColor.theme];
      if (themeColor) {
        argb = 'FF' + themeColor;
      }
    } else if ((fgColor as any).indexed !== undefined) {
      // Indexed color - common Excel palette
      const indexed = (fgColor as any).indexed;
      // Map common indexed colors
      const indexedColors: Record<number, string> = {
        10: 'FF00FF00', // Green
        11: 'FF00FF00', // Green
        13: 'FFFFFF00', // Yellow
        51: 'FFFFC000', // Gold/Yellow
        52: 'FFFF9900', // Orange
        53: 'FFFF6600', // Orange
      };
      argb = indexedColors[indexed] || null;
    }
    
    const colorInfo = classifyColorFromArgb(argb || undefined);
    return { argb, colorInfo };
  } catch (error) {
    console.error('Error reading cell color:', error);
    return { argb: null, colorInfo: { name: 'No color', category: 'noColor' } };
  }
}

// ==================== FUZZY MATCHING HELPERS ====================

function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s%\-']/g, '')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
  
  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);
  
  return intersection.length / union.size;
}

function findBestKeyResultMatch(
  indicatorKR: string, 
  krMap: Map<string, string>,
  threshold: number = 0.5
): { krId: string | null; matchType: string } {
  if (!indicatorKR) return { krId: null, matchType: 'none' };
  
  if (krMap.has(indicatorKR)) {
    return { krId: krMap.get(indicatorKR)!, matchType: 'exact' };
  }
  
  const normalizedTarget = normalizeString(indicatorKR);
  for (const [krName, krId] of krMap.entries()) {
    if (normalizeString(krName) === normalizedTarget) {
      return { krId, matchType: 'normalized' };
    }
  }
  
  let bestMatch: { krId: string; score: number; krName: string } | null = null;
  
  for (const [krName, krId] of krMap.entries()) {
    const score = calculateSimilarity(indicatorKR, krName);
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { krId, score, krName };
    }
  }
  
  if (bestMatch) {
    return { krId: bestMatch.krId, matchType: `fuzzy(${(bestMatch.score * 100).toFixed(0)}%)` };
  }
  
  return { krId: null, matchType: 'none' };
}

function getCellValue(sheet: XLSX.WorkSheet, cell: string): string {
  const cellData = sheet[cell];
  if (!cellData) return '';
  return String(cellData.v || '').trim();
}

function extractClassification(name: string): { cleanName: string; classification: 'CORE' | 'Enabler' } {
  if (name.includes('(CORE)')) {
    return { cleanName: name.replace('(CORE)', '').trim(), classification: 'CORE' };
  }
  if (name.includes('(Enabler)')) {
    return { cleanName: name.replace('(Enabler)', '').trim(), classification: 'Enabler' };
  }
  return { cleanName: name, classification: 'CORE' };
}

function extractOrgObjectiveInfo(department: string): { cleanDept: string; orgObjName: string } {
  const normalized = department.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n').map(l => l.trim()).filter(l => l);
  
  if (lines.length >= 1) {
    const deptName = lines[0];
    
    let orgObjName = '';
    let foundNumber = false;
    for (const line of lines) {
      if (/^\(\d+\)$/.test(line)) {
        foundNumber = true;
        continue;
      }
      if (foundNumber && line && !line.startsWith('(')) {
        orgObjName = line;
        break;
      }
    }
    
    if (!orgObjName && lines.length >= 2) {
      for (let i = lines.length - 1; i >= 1; i--) {
        if (!/^\(\d+\)$/.test(lines[i]) && lines[i]) {
          orgObjName = lines[i];
          break;
        }
      }
    }
    
    return { cleanDept: deptName, orgObjName };
  }
  
  return { cleanDept: normalized, orgObjName: '' };
}

function findOrgObjectiveByName(searchName: string, orgObjectiveMap: Map<string, string>): string {
  if (!searchName) return '';
  
  const searchLower = searchName.toLowerCase();
  
  for (const [name, id] of orgObjectiveMap) {
    if (name.toLowerCase() === searchLower) {
      return id;
    }
  }
  
  for (const [name, id] of orgObjectiveMap) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes(searchLower) || searchLower.includes(nameLower)) {
      return id;
    }
  }
  
  const searchWords = searchLower.split(/\s+/).filter(w => w.length > 3);
  for (const [name, id] of orgObjectiveMap) {
    const nameLower = name.toLowerCase();
    const matchCount = searchWords.filter(word => nameLower.includes(word)).length;
    if (matchCount >= 2 || (searchWords.length === 1 && matchCount === 1)) {
      return id;
    }
  }
  
  return '';
}

function assignColor(name: string, index: number): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('customer') || nameLower.includes('success')) return 'green';
  if (nameLower.includes('business') || nameLower.includes('operation')) return 'blue';
  if (nameLower.includes('growth') || nameLower.includes('revenue')) return 'purple';
  if (nameLower.includes('innovation') || nameLower.includes('product')) return 'yellow';
  if (nameLower.includes('security') || nameLower.includes('risk')) return 'orange';
  
  const colors = ['green', 'purple', 'blue', 'yellow', 'orange'];
  return colors[index % colors.length];
}

function parseOrgObjectivesSheet(sheet: XLSX.WorkSheet): OrgObjectiveRow[] {
  const orgObjectives: OrgObjectiveRow[] = [];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  let headerRowIndex = -1;
  let orgObjColIndex = -1;
  let significanceColIndex = -1;
  
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i] || [];
    for (let j = 0; j < row.length; j++) {
      const cellValue = String(row[j] || '').toLowerCase();
      if (cellValue.includes('org') && cellValue.includes('objective')) {
        headerRowIndex = i;
        orgObjColIndex = j;
      }
      if (cellValue.includes('significance') || cellValue.includes('description')) {
        significanceColIndex = j;
      }
    }
    if (headerRowIndex >= 0) break;
  }
  
  if (headerRowIndex < 0) {
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] || [];
      const firstCell = String(row[0] || '').trim();
      if (/^\d+\./.test(firstCell)) {
        const { cleanName, classification } = extractClassification(firstCell.replace(/^\d+\.\s*/, ''));
        if (cleanName) {
          orgObjectives.push({
            name: cleanName,
            significance: String(row[1] || ''),
            classification,
            color: assignColor(cleanName, orgObjectives.length),
          });
        }
      }
    }
    return orgObjectives;
  }
  
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] || [];
    const nameCell = String(row[orgObjColIndex] || '').trim();
    
    if (!nameCell || nameCell.toLowerCase().includes('objective')) continue;
    
    const { cleanName, classification } = extractClassification(nameCell);
    
    if (cleanName) {
      orgObjectives.push({
        name: cleanName,
        significance: significanceColIndex >= 0 ? String(row[significanceColIndex] || '') : '',
        classification,
        color: assignColor(cleanName, orgObjectives.length),
      });
    }
  }
  
  return orgObjectives;
}

function parseHierarchySheet(sheet: XLSX.WorkSheet): HierarchyRow[] {
  const hierarchy: HierarchyRow[] = [];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  let deptColIndex = -1;
  let foColIndex = -1;
  let krColIndex = -1;
  let headerRowIndex = -1;
  
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i] || [];
    for (let j = 0; j < row.length; j++) {
      const cellValue = String(row[j] || '').toLowerCase();
      if (cellValue.includes('department') || cellValue.includes('dept')) {
        deptColIndex = j;
        headerRowIndex = i;
      }
      if (cellValue.includes('functional') && cellValue.includes('objective')) {
        foColIndex = j;
      }
      if (cellValue.includes('key') && cellValue.includes('result')) {
        krColIndex = j;
      }
    }
    if (headerRowIndex >= 0) break;
  }
  
  if (headerRowIndex < 0 || deptColIndex < 0) {
    console.warn('Could not find hierarchy header row');
    return hierarchy;
  }
  
  let currentDept = '';
  let currentOrgObjName = '';
  let currentFO = '';
  
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] || [];
    
    const deptCell = String(row[deptColIndex] || '').trim();
    const foCell = foColIndex >= 0 ? String(row[foColIndex] || '').trim() : '';
    const krCell = krColIndex >= 0 ? String(row[krColIndex] || '').trim() : '';
    
    if (deptCell) {
      const { cleanDept, orgObjName } = extractOrgObjectiveInfo(deptCell);
      currentDept = cleanDept;
      currentOrgObjName = orgObjName;
    }
    
    if (foCell) {
      currentFO = foCell;
    }
    
    if (krCell && currentDept) {
      hierarchy.push({
        orgObjectiveName: currentOrgObjName,
        department: currentDept,
        functionalObjective: currentFO || currentDept,
        keyResult: krCell,
      });
    }
  }
  
  return hierarchy;
}

// Extended indicator row with department info
interface IndicatorRowWithDepartment extends IndicatorRow {
  department: string;
  sheetName: string;
}

interface IndicatorRowWithColorAndDept extends IndicatorRowWithColor {
  department: string;
  sheetName: string;
}

// Extended hierarchy row for department sheets
interface DepartmentSheetData {
  sheetName: string;
  department: string;
  functionalObjectives: string[];
  keyResults: string[];
  hierarchyRows: HierarchyRow[];
  indicators: IndicatorRowWithDepartment[];
  indicatorsWithColors: IndicatorRowWithColorAndDept[];
}

// Parse department-specific OKR sheets using ExcelJS for accurate color detection
async function parseDepartmentSheetsWithExcelJS(
  arrayBuffer: ArrayBuffer,
  orgObjectiveSheetName: string,
  singleSheetDepartmentName?: string // For single-sheet files, use file name as department
): Promise<{ 
  departmentSheets: DepartmentSheetData[];
  hierarchy: HierarchyRow[];
  indicators: IndicatorRow[]; 
  indicatorsWithColors: IndicatorRowWithColor[]; 
  colorStats: ColorStats 
}> {
  const departmentSheets: DepartmentSheetData[] = [];
  const allHierarchy: HierarchyRow[] = [];
  const allIndicators: IndicatorRow[] = [];
  const allIndicatorsWithColors: IndicatorRowWithColor[] = [];
  const colorStats: ColorStats = { green: 0, yellow: 0, orange: 0, red: 0, noColor: 0, other: 0 };
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const sheetNames = workbook.worksheets.map(ws => ws.name);
  console.log('ExcelJS Sheet names:', sheetNames);
  console.log('Org Objective sheet:', orgObjectiveSheetName);
  console.log('Single sheet department name:', singleSheetDepartmentName);
  
  // Process all sheets (or just the single sheet for single-sheet files)
  for (const worksheet of workbook.worksheets) {
    if (!worksheet) continue;
    
    // Skip the org objectives sheet (only if it exists)
    if (orgObjectiveSheetName && (
        worksheet.name.toLowerCase() === orgObjectiveSheetName.toLowerCase() ||
        (worksheet.name.toLowerCase().includes('org') && worksheet.name.toLowerCase().includes('objective'))
    )) {
      console.log(`Skipping org objectives sheet: ${worksheet.name}`);
      continue;
    }
    
    console.log(`Processing department sheet: ${worksheet.name}`);
    
    // For single-sheet files, use the provided department name from file name
    // For multi-sheet files, the sheet name IS the department name
    const departmentName = singleSheetDepartmentName || worksheet.name.trim();
    
    const sheetData: DepartmentSheetData = {
      sheetName: worksheet.name,
      department: departmentName,
      functionalObjectives: [],
      keyResults: [],
      hierarchyRows: [],
      indicators: [],
      indicatorsWithColors: [],
    };
    
    // Find header row and column indices
    let foColIndex = -1;
    let krColIndex = -1;
    let leadingIndColIndex = -1;
    let leadingFormulaColIndex = -1;
    let laggingIndColIndex = -1;
    let laggingFormulaColIndex = -1;
    let headerRowIndex = -1;
    
    // Search first 15 rows for header (increased from 10)
    for (let rowNum = 1; rowNum <= Math.min(15, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const cellValue = String(cell.value || '').toLowerCase();
        
        if ((cellValue.includes('func') && cellValue.includes('objective')) || 
            cellValue === 'fo' || cellValue.includes('functional obj')) {
          foColIndex = colNumber;
          headerRowIndex = rowNum;
        }
        if (cellValue.includes('key') && cellValue.includes('result')) {
          krColIndex = colNumber;
        }
        if ((cellValue.includes('leading') || (cellValue.includes('tier') && cellValue.includes('1'))) && 
            cellValue.includes('indicator') && !cellValue.includes('formula') && !cellValue.includes('freq')) {
          leadingIndColIndex = colNumber;
        }
        if ((cellValue.includes('leading') || cellValue.includes('tier 1')) && cellValue.includes('formula')) {
          leadingFormulaColIndex = colNumber;
        }
        if ((cellValue.includes('lagging') || (cellValue.includes('tier') && cellValue.includes('2'))) && 
            cellValue.includes('indicator') && !cellValue.includes('formula') && !cellValue.includes('freq')) {
          laggingIndColIndex = colNumber;
        }
        if ((cellValue.includes('lagging') || cellValue.includes('tier 2')) && cellValue.includes('formula')) {
          laggingFormulaColIndex = colNumber;
        }
      });
      if (headerRowIndex >= 0) break;
    }
    
    if (headerRowIndex < 0) {
      console.log(`No header found in sheet: ${worksheet.name}, skipping`);
      continue;
    }
    
    console.log(`Found headers at row ${headerRowIndex}:`, { 
      foColIndex, krColIndex, leadingIndColIndex, laggingIndColIndex, 
      department: departmentName 
    });
    
    let currentFO = '';
    let currentKR = '';
    const foSet = new Set<string>();
    const krSet = new Set<string>();
    
    // Process data rows
    for (let rowNum = headerRowIndex + 1; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Get FO and KR values
      if (foColIndex > 0) {
        const foValue = String(row.getCell(foColIndex).value || '').trim();
        if (foValue && !foValue.toLowerCase().includes('functional') && !foValue.toLowerCase().includes('objective')) {
          currentFO = foValue;
          foSet.add(foValue);
        }
      }
      if (krColIndex > 0) {
        const krValue = String(row.getCell(krColIndex).value || '').trim();
        if (krValue && !krValue.toLowerCase().includes('key') && !krValue.toLowerCase().includes('result')) {
          currentKR = krValue;
          krSet.add(krValue);
          
          // Add hierarchy row
          if (currentFO && currentKR) {
            const hierarchyRow: HierarchyRow = {
              orgObjectiveName: '', // Will be resolved later
              department: departmentName,
              functionalObjective: currentFO,
              keyResult: currentKR,
            };
            sheetData.hierarchyRows.push(hierarchyRow);
            allHierarchy.push(hierarchyRow);
          }
        }
      }
      
      // Parse Tier 1 (Leading) indicator with actual color
      if (leadingIndColIndex > 0) {
        const cell = row.getCell(leadingIndColIndex);
        const indName = String(cell.value || '').trim();
        
        if (indName && !indName.toLowerCase().includes('indicator') && indName.length > 1) {
          // Get actual cell color using ExcelJS
          const { argb, colorInfo } = getCellColorFromExcelJS(cell);
          
          // Track color stats
          colorStats[colorInfo.category]++;
          
          const baseIndicator: IndicatorRowWithDepartment = {
            functionalObjective: currentFO,
            keyResult: currentKR,
            name: indName,
            formula: leadingFormulaColIndex > 0 ? String(row.getCell(leadingFormulaColIndex).value || '').trim() : '',
            frequency: 'Monthly',
            tier: 'tier1',
            department: departmentName,
            sheetName: worksheet.name,
          };
          
          sheetData.indicators.push(baseIndicator);
          allIndicators.push(baseIndicator);
          
          const indicatorWithColor: IndicatorRowWithColorAndDept = {
            ...baseIndicator,
            cellColor: argb,
            colorCategory: colorInfo.category,
            colorName: colorInfo.name,
            rowNumber: rowNum,
          };
          sheetData.indicatorsWithColors.push(indicatorWithColor);
          allIndicatorsWithColors.push(indicatorWithColor);
        }
      }
      
      // Parse Tier 2 (Lagging) indicator with actual color
      if (laggingIndColIndex > 0) {
        const cell = row.getCell(laggingIndColIndex);
        const indName = String(cell.value || '').trim();
        
        if (indName && !indName.toLowerCase().includes('indicator') && indName.length > 1) {
          // Get actual cell color using ExcelJS
          const { argb, colorInfo } = getCellColorFromExcelJS(cell);
          
          colorStats[colorInfo.category]++;
          
          const baseIndicator: IndicatorRowWithDepartment = {
            functionalObjective: currentFO,
            keyResult: currentKR,
            name: indName,
            formula: laggingFormulaColIndex > 0 ? String(row.getCell(laggingFormulaColIndex).value || '').trim() : '',
            frequency: 'Monthly',
            tier: 'tier2',
            department: departmentName,
            sheetName: worksheet.name,
          };
          
          sheetData.indicators.push(baseIndicator);
          allIndicators.push(baseIndicator);
          
          const indicatorWithColor: IndicatorRowWithColorAndDept = {
            ...baseIndicator,
            cellColor: argb,
            colorCategory: colorInfo.category,
            colorName: colorInfo.name,
            rowNumber: rowNum,
          };
          sheetData.indicatorsWithColors.push(indicatorWithColor);
          allIndicatorsWithColors.push(indicatorWithColor);
        }
      }
    }
    
    sheetData.functionalObjectives = Array.from(foSet);
    sheetData.keyResults = Array.from(krSet);
    
    if (sheetData.hierarchyRows.length > 0 || sheetData.indicators.length > 0) {
      departmentSheets.push(sheetData);
      console.log(`Parsed department "${departmentName}":`, {
        fos: sheetData.functionalObjectives.length,
        krs: sheetData.keyResults.length,
        indicators: sheetData.indicators.length,
      });
    }
  }
  
  console.log('Color stats from ExcelJS:', colorStats);
  console.log('Total department sheets parsed:', departmentSheets.length);
  console.log('Total hierarchy rows:', allHierarchy.length);
  console.log('Total indicators:', allIndicators.length);
  
  return { 
    departmentSheets, 
    hierarchy: allHierarchy, 
    indicators: allIndicators, 
    indicatorsWithColors: allIndicatorsWithColors, 
    colorStats 
  };
}

export async function parseMultiSheetExcel(file: File): Promise<ParsedMultiSheetData> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  
  // Use XLSX for org objectives sheet identification
  const workbook = XLSX.read(data, { 
    type: 'array',
    cellStyles: true,
  });
  
  console.log('Sheet names:', workbook.SheetNames);
  console.log('Total sheets:', workbook.SheetNames.length);
  
  // Detect if this is a single-sheet file (single department) or multi-sheet file
  const isSingleSheet = workbook.SheetNames.length === 1;
  
  // Find org objectives sheet (only in multi-sheet files)
  let orgObjSheetName = '';
  let orgObjectives: OrgObjectiveRow[] = [];
  
  if (!isSingleSheet) {
    orgObjSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('org') && name.toLowerCase().includes('objective')
    ) || workbook.SheetNames.find(name => 
      name.toLowerCase().includes('org obj')
    ) || '';
    
    if (orgObjSheetName) {
      orgObjectives = parseOrgObjectivesSheet(workbook.Sheets[orgObjSheetName]);
    }
  }
  
  // Use ExcelJS for department sheets with indicator parsing (accurate color detection)
  // For single-sheet files: use file name as department name
  // For multi-sheet files: each sheet (except org objectives) is a department
  const { 
    departmentSheets, 
    hierarchy, 
    indicators, 
    indicatorsWithColors, 
    colorStats 
  } = await parseDepartmentSheetsWithExcelJS(
    arrayBuffer, 
    orgObjSheetName,
    isSingleSheet ? extractDepartmentFromFileName(file.name) : undefined
  );
  
  console.log('Parsed:', { 
    orgObjectives: orgObjectives.length, 
    departments: departmentSheets.length,
    hierarchy: hierarchy.length, 
    indicators: indicators.length,
    colorStats,
    isSingleSheet,
  });
  
  return { orgObjectives, hierarchy, indicators, indicatorsWithColors, colorStats };
}

// Extract department name from file name
function extractDepartmentFromFileName(fileName: string): string {
  // Remove extension
  let name = fileName.replace(/\.(xlsx|xls)$/i, '');
  
  // Try to extract meaningful department name
  // Pattern: "OKR_v5_CS_-_Formula_Updates" -> "CS" or "Customer Success"
  const patterns = [
    /OKR[_\s]*v?\d*[_\s]*([A-Za-z]+)[_\s]*[-_]/i, // OKR_v5_CS_-
    /([A-Za-z]+)[_\s]*OKR/i, // CS_OKR
    /^([A-Za-z\s]+)$/i, // Just the name
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      const dept = match[1].trim();
      // Expand common abbreviations
      const abbreviations: Record<string, string> = {
        'CS': 'Customer Success',
        'HR': 'Human Resources',
        'ENG': 'Engineering',
        'PM': 'Product Management',
        'MKT': 'Marketing',
        'OPS': 'Operations',
        'FIN': 'Finance',
        'IT': 'Information Technology',
      };
      return abbreviations[dept.toUpperCase()] || dept;
    }
  }
  
  // Fallback: clean up the file name
  return name.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown Department';
}

export interface MultiSheetPreview {
  orgObjectives: number;
  departments: number;
  functionalObjectives: number;
  keyResults: number;
  indicators: number;
  tier1Indicators: number;
  tier2Indicators: number;
  colorBreakdown: {
    willImport: { green: number; yellow: number };
    willExclude: { orange: number; red: number; noColor: number; other: number };
  };
  totalToImport: number;
  totalToExclude: number;
}

export function getMultiSheetPreview(data: ParsedMultiSheetData): MultiSheetPreview {
  const departments = new Set(data.hierarchy.map(h => h.department));
  const functionalObjectives = new Set(data.hierarchy.map(h => h.functionalObjective));
  const keyResults = new Set(data.hierarchy.map(h => h.keyResult));
  
  const tier1Count = data.indicators.filter(i => i.tier === 'tier1').length;
  const tier2Count = data.indicators.filter(i => i.tier === 'tier2').length;
  
  // Use actual color stats from ExcelJS parsing
  const colorStats = data.colorStats || { green: 0, yellow: 0, orange: 0, red: 0, noColor: 0, other: 0 };
  
  const willImport = {
    green: colorStats.green,
    yellow: colorStats.yellow,
  };
  
  const willExclude = {
    orange: colorStats.orange,
    red: colorStats.red,
    noColor: colorStats.noColor,
    other: colorStats.other,
  };
  
  return {
    orgObjectives: data.orgObjectives.length,
    departments: departments.size,
    functionalObjectives: functionalObjectives.size,
    keyResults: keyResults.size,
    indicators: data.indicators.length,
    tier1Indicators: tier1Count,
    tier2Indicators: tier2Count,
    colorBreakdown: { willImport, willExclude },
    totalToImport: willImport.green + willImport.yellow,
    totalToExclude: willExclude.orange + willExclude.red + willExclude.noColor + willExclude.other,
  };
}

// Filter indicators by color - only green and yellow are imported
function filterIndicatorsByColor(
  indicatorsWithColors: IndicatorRowWithColor[],
  allowedColors: ('green' | 'yellow')[] = ['green', 'yellow']
): { toImport: IndicatorRowWithColor[]; excluded: ExcludedIndicator[] } {
  const toImport: IndicatorRowWithColor[] = [];
  const excluded: ExcludedIndicator[] = [];
  
  for (const ind of indicatorsWithColors) {
    if (allowedColors.includes(ind.colorCategory as 'green' | 'yellow')) {
      toImport.push(ind);
    } else {
      excluded.push({
        name: ind.name,
        keyResult: ind.keyResult,
        functionalObjective: ind.functionalObjective,
        tier: ind.tier,
        cellColor: ind.cellColor,
        colorName: ind.colorName,
        reason: `Excluded: ${ind.colorName} cell not in allowed colors (Green, Yellow)`,
        rowNumber: ind.rowNumber,
      });
    }
  }
  
  return { toImport, excluded };
}

export async function importMultiSheetToDatabase(data: ParsedMultiSheetData): Promise<MultiSheetImportResult> {
  const errors: string[] = [];
  const counts = {
    orgObjectives: 0,
    departments: 0,
    functionalObjectives: 0,
    keyResults: 0,
    indicators: 0,
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      counts,
      errors: ['You must be logged in to import data.'],
      failedMatches: [],
      matchStats: { exact: 0, normalized: 0, fuzzy: 0, dbLookup: 0, failed: 0 },
      excludedIndicators: [],
      colorStats: data.colorStats || { green: 0, yellow: 0, orange: 0, red: 0, noColor: 0, other: 0 },
    };
  }

  // Filter indicators by color - only import green and yellow
  const { toImport: indicatorsToImport, excluded: excludedIndicators } = filterIndicatorsByColor(
    data.indicatorsWithColors || [],
    ['green', 'yellow']
  );
  
  console.log(`Color filtering: ${indicatorsToImport.length} to import, ${excludedIndicators.length} excluded`);

  const orgObjectiveMap = new Map<string, string>();
  const orgObjectiveByIndex = new Map<number, string>();
  const departmentMap = new Map<string, string>();
  const foMap = new Map<string, string>();
  const krMap = new Map<string, string>();

  try {
    // 1. Import Org Objectives
    for (let i = 0; i < data.orgObjectives.length; i++) {
      const obj = data.orgObjectives[i];
      
      const { data: existing } = await supabase
        .from('org_objectives')
        .select('id')
        .eq('name', obj.name)
        .maybeSingle();
      
      if (existing) {
        orgObjectiveMap.set(obj.name, existing.id);
        orgObjectiveByIndex.set(i + 1, existing.id);
      } else {
        const { data: inserted, error } = await supabase
          .from('org_objectives')
          .insert({
            name: obj.name,
            description: obj.significance,
            classification: obj.classification,
            color: obj.color,
            business_outcome: '3X Revenue',
          })
          .select('id')
          .single();
        
        if (error) {
          errors.push(`Org Objective "${obj.name}": ${error.message}`);
          continue;
        }
        
        orgObjectiveMap.set(obj.name, inserted.id);
        orgObjectiveByIndex.set(i + 1, inserted.id);
        counts.orgObjectives++;
      }
    }
    
    // 2. Import Hierarchy (Departments, FOs, KRs)
    // First process explicit hierarchy
    for (const row of data.hierarchy) {
      let orgObjId = '';
      if (row.orgObjectiveName) {
        orgObjId = findOrgObjectiveByName(row.orgObjectiveName, orgObjectiveMap);
      }
      if (!orgObjId && data.orgObjectives.length > 0) {
        orgObjId = orgObjectiveByIndex.get(1) || '';
        console.warn(`Could not match org objective for "${row.orgObjectiveName}", defaulting to first`);
      }
      
      const deptKey = row.department;
      if (!departmentMap.has(deptKey) && row.department) {
        const { data: existing } = await supabase
          .from('departments')
          .select('id')
          .eq('name', row.department)
          .maybeSingle();
        
        if (existing) {
          departmentMap.set(deptKey, existing.id);
        } else {
          const { data: inserted, error } = await supabase
            .from('departments')
            .insert({
              name: row.department,
              org_objective_id: orgObjId || null,
            })
            .select('id')
            .single();
          
          if (error) {
            errors.push(`Department "${row.department}": ${error.message}`);
            continue;
          }
          departmentMap.set(deptKey, inserted.id);
          counts.departments++;
        }
      }
      
      const foKey = row.functionalObjective;
      if (!foMap.has(foKey) && row.functionalObjective) {
        const { data: existing } = await supabase
          .from('functional_objectives')
          .select('id')
          .eq('name', row.functionalObjective)
          .maybeSingle();
        
        if (existing) {
          foMap.set(foKey, existing.id);
        } else {
          const { data: inserted, error } = await supabase
            .from('functional_objectives')
            .insert({
              name: row.functionalObjective,
              department_id: departmentMap.get(deptKey) || null,
            })
            .select('id')
            .single();
          
          if (error) {
            errors.push(`Functional Objective "${row.functionalObjective}": ${error.message}`);
            continue;
          }
          foMap.set(foKey, inserted.id);
          counts.functionalObjectives++;
        }
      }
      
      const krKey = row.keyResult;
      if (!krMap.has(krKey) && row.keyResult) {
        const { data: existing } = await supabase
          .from('key_results')
          .select('id')
          .eq('name', row.keyResult)
          .maybeSingle();
        
        if (existing) {
          krMap.set(krKey, existing.id);
        } else {
          const { data: inserted, error } = await supabase
            .from('key_results')
            .insert({
              name: row.keyResult,
              functional_objective_id: foMap.get(foKey) || null,
              target_value: 100,
              current_value: 0,
              unit: '%',
            })
            .select('id')
            .single();
          
          if (error) {
            errors.push(`Key Result "${row.keyResult}": ${error.message}`);
            continue;
          }
          krMap.set(krKey, inserted.id);
          counts.keyResults++;
        }
      }
    }
    
    // 2b. Auto-create FOs and KRs from indicator data if hierarchy was empty
    // This handles cases where the Excel doesn't have explicit hierarchy columns
    if (data.hierarchy.length === 0 && indicatorsToImport.length > 0) {
      console.log('No explicit hierarchy found, auto-creating from indicator data...');
      
      // Get default org objective and department
      const defaultOrgObjId = orgObjectiveByIndex.get(1) || '';
      let defaultDeptId = '';
      
      // Create a default department if needed
      if (departmentMap.size === 0) {
        const deptName = 'General';
        const { data: existing } = await supabase
          .from('departments')
          .select('id')
          .eq('name', deptName)
          .maybeSingle();
        
        if (existing) {
          defaultDeptId = existing.id;
          departmentMap.set(deptName, existing.id);
        } else {
          const { data: inserted, error } = await supabase
            .from('departments')
            .insert({
              name: deptName,
              org_objective_id: defaultOrgObjId || null,
            })
            .select('id')
            .single();
          
          if (!error && inserted) {
            defaultDeptId = inserted.id;
            departmentMap.set(deptName, inserted.id);
            counts.departments++;
          }
        }
      } else {
        defaultDeptId = Array.from(departmentMap.values())[0];
      }
      
      // Extract unique FOs and KRs from indicators
      const foKrPairs = new Map<string, Set<string>>(); // FO -> Set of KRs
      
      for (const ind of indicatorsToImport) {
        const foName = ind.functionalObjective || 'General Objective';
        const krName = ind.keyResult;
        
        if (!foKrPairs.has(foName)) {
          foKrPairs.set(foName, new Set());
        }
        if (krName) {
          foKrPairs.get(foName)!.add(krName);
        }
      }
      
      // Create FOs and their KRs
      for (const [foName, krNames] of foKrPairs) {
        // Create FO if not exists
        if (!foMap.has(foName)) {
          const { data: existing } = await supabase
            .from('functional_objectives')
            .select('id')
            .eq('name', foName)
            .maybeSingle();
          
          if (existing) {
            foMap.set(foName, existing.id);
          } else {
            const { data: inserted, error } = await supabase
              .from('functional_objectives')
              .insert({
                name: foName,
                department_id: defaultDeptId || null,
              })
              .select('id')
              .single();
            
            if (!error && inserted) {
              foMap.set(foName, inserted.id);
              counts.functionalObjectives++;
            }
          }
        }
        
        const foId = foMap.get(foName);
        
        // Create KRs for this FO
        for (const krName of krNames) {
          if (!krMap.has(krName)) {
            const { data: existing } = await supabase
              .from('key_results')
              .select('id')
              .eq('name', krName)
              .maybeSingle();
            
            if (existing) {
              krMap.set(krName, existing.id);
            } else {
              const { data: inserted, error } = await supabase
                .from('key_results')
                .insert({
                  name: krName,
                  functional_objective_id: foId || null,
                  target_value: 100,
                  current_value: 0,
                  unit: '%',
                })
                .select('id')
                .single();
              
              if (!error && inserted) {
                krMap.set(krName, inserted.id);
                counts.keyResults++;
              }
            }
          }
        }
      }
      
      console.log('Auto-created hierarchy:', { 
        fos: counts.functionalObjectives, 
        krs: counts.keyResults 
      });
    }
    
    // 3. Import only filtered indicators (green/yellow) with FUZZY MATCHING
    const matchStats = { exact: 0, normalized: 0, fuzzy: 0, foFallback: 0, dbLookup: 0, failed: 0 };
    const failedMatches: FailedIndicatorMatch[] = [];
    
    for (const ind of indicatorsToImport) {
      let krId: string | null = null;
      let matchType = 'none';
      
      const match = findBestKeyResultMatch(ind.keyResult, krMap, 0.5);
      krId = match.krId;
      matchType = match.matchType;
      
      if (!krId && ind.functionalObjective) {
        const matchingHierarchies = data.hierarchy.filter(h => {
          if (!h.keyResult) return false;
          return calculateSimilarity(h.functionalObjective, ind.functionalObjective) > 0.6;
        });
        
        for (const matchedHierarchy of matchingHierarchies) {
          const foMatch = findBestKeyResultMatch(matchedHierarchy.keyResult, krMap, 0.5);
          if (foMatch.krId) {
            krId = foMatch.krId;
            matchType = 'fo-fallback';
            matchStats.foFallback++;
            break;
          }
        }
      }
      
      if (!krId && ind.keyResult) {
        const searchWords = normalizeString(ind.keyResult).split(' ').filter(w => w.length > 3).slice(0, 3);
        if (searchWords.length > 0) {
          const searchPattern = `%${searchWords.join('%')}%`;
          const { data: dbKr } = await supabase
            .from('key_results')
            .select('id, name')
            .ilike('name', searchPattern)
            .limit(1)
            .maybeSingle();
          
          if (dbKr) {
            krId = dbKr.id;
            krMap.set(dbKr.name, dbKr.id);
            matchType = 'db-lookup';
            matchStats.dbLookup++;
          }
        }
      }
      
      if (matchType === 'exact') matchStats.exact++;
      else if (matchType === 'normalized') matchStats.normalized++;
      else if (matchType.startsWith('fuzzy')) matchStats.fuzzy++;
      
      if (!krId) {
        matchStats.failed++;
        failedMatches.push({
          indicatorName: ind.name,
          keyResultName: ind.keyResult,
          functionalObjective: ind.functionalObjective,
          tier: ind.tier,
        });
        console.warn(`FAILED MATCH - Indicator: "${ind.name}" | Key Result: "${ind.keyResult}" | FO: "${ind.functionalObjective}"`);
        errors.push(`Indicator "${ind.name}": Could not find parent Key Result "${ind.keyResult}"`);
        continue;
      }
      
      const { data: existing } = await supabase
        .from('indicators')
        .select('id')
        .eq('name', ind.name)
        .eq('key_result_id', krId)
        .maybeSingle();
      
      if (!existing) {
        const { error } = await supabase
          .from('indicators')
          .insert({
            name: ind.name,
            key_result_id: krId,
            tier: ind.tier,
            formula: ind.formula || null,
            frequency: ind.frequency || 'Monthly',
            target_value: 100,
            current_value: 0,
          });
        
        if (error) {
          errors.push(`Indicator "${ind.name}": ${error.message}`);
          continue;
        }
        counts.indicators++;
      }
    }
    
    console.log('Indicator Import Match Stats:', matchStats);
    
    return {
      success: errors.length === 0,
      counts,
      errors,
      failedMatches,
      matchStats: {
        exact: matchStats.exact,
        normalized: matchStats.normalized,
        fuzzy: matchStats.fuzzy,
        dbLookup: matchStats.dbLookup,
        failed: matchStats.failed,
      },
      excludedIndicators,
      colorStats: data.colorStats || { green: 0, yellow: 0, orange: 0, red: 0, noColor: 0, other: 0 },
    };
  } catch (error) {
    return {
      success: false,
      counts,
      errors: [...errors, `Import failed: ${error}`],
      failedMatches: [],
      matchStats: { exact: 0, normalized: 0, fuzzy: 0, dbLookup: 0, failed: 0 },
      excludedIndicators,
      colorStats: data.colorStats || { green: 0, yellow: 0, orange: 0, red: 0, noColor: 0, other: 0 },
    };
  }
}
