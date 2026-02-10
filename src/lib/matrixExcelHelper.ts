import ExcelJS from 'exceljs';

interface CustomerSection {
  id: string;
  name: string;
  features: { id: string; name: string }[];
  indicators: { id: string; name: string; kr_name: string; fo_name: string }[];
  indicatorFeatureMap: Record<string, Set<string>>;
}

// ============= Vector Weight Constants =============
const VECTOR_WEIGHTS: Record<string, number> = { green: 1, amber: 0.5, red: 0 };
const WEIGHT_TO_BAND: Record<number, string> = { 1: 'Green', 0.5: 'Amber', 0: 'Red' };
const BAND_TO_WEIGHT: Record<string, number> = { green: 1, amber: 0.5, red: 0 };

function valueToBandLabel(val: number | null): string {
  if (val === null || val === undefined) return '';
  if (val >= 1) return 'Green';
  if (val >= 0.5) return 'Amber';
  return 'Red';
}

function parseBandValue(cellVal: any): number | null {
  if (cellVal === null || cellVal === undefined || cellVal === '' || cellVal === '—') return null;
  // Try as band label
  if (typeof cellVal === 'string') {
    const lower = cellVal.trim().toLowerCase();
    if (lower in BAND_TO_WEIGHT) return BAND_TO_WEIGHT[lower];
  }
  // Try as numeric weight
  const num = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal));
  if (isNaN(num)) return null;
  // Accept 0, 0.5, 1 directly as weights
  if (num === 0 || num === 0.5 || num === 1) return num;
  // Legacy: if someone enters a percentage, convert it
  if (num > 1 && num <= 100) {
    if (num >= 76) return 1;
    if (num >= 51) return 0.5;
    return 0;
  }
  return null;
}

/**
 * Generate an Excel template for the customer-feature matrix.
 * Cells contain band labels (Green/Amber/Red) instead of raw numbers.
 */
export async function generateMatrixTemplate(
  customerSections: CustomerSection[],
  period: string,
  scores: Record<string, number | null>,
) {
  const wb = new ExcelJS.Workbook();

  // Collect all unique indicators across all customers
  const allIndicators = new Map<string, { id: string; name: string }>();
  for (const section of customerSections) {
    for (const ind of section.indicators) {
      allIndicators.set(ind.id, { id: ind.id, name: ind.name });
    }
  }
  const indicatorList = Array.from(allIndicators.values());
  const totalCols = 1 + indicatorList.length;

  const ws = wb.addWorksheet('Scores');

  // Hidden ID row (row 1) for parsing
  const idRow = ws.addRow(['__IDS__', ...indicatorList.map(i => i.id)]);
  idRow.font = { color: { argb: 'FF999999' }, size: 8 };
  idRow.hidden = true;

  for (const section of customerSections) {
    // Customer header row
    const custHeaderRow = ws.addRow([section.name]);
    custHeaderRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    custHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    custHeaderRow.height = 28;
    ws.mergeCells(custHeaderRow.number, 1, custHeaderRow.number, totalCols);
    custHeaderRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Column headers
    const colHeaderRow = ws.addRow(['Feature', ...indicatorList.map(i => i.name)]);
    colHeaderRow.font = { bold: true, size: 10 };
    colHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    // Feature rows with band labels
    for (const feat of section.features) {
      const rowData: (string | null)[] = [feat.name];
      for (const ind of indicatorList) {
        const canEdit = section.indicatorFeatureMap[ind.id]?.has(feat.id) ?? false;
        if (!canEdit) {
          rowData.push(null);
        } else {
          const key = `${ind.id}::${section.id}::${feat.id}`;
          rowData.push(valueToBandLabel(scores[key] ?? null));
        }
      }
      const dataRow = ws.addRow(rowData);

      // Style cells
      for (let colIdx = 0; colIdx < indicatorList.length; colIdx++) {
        const ind = indicatorList[colIdx];
        const canEdit = section.indicatorFeatureMap[ind.id]?.has(feat.id) ?? false;
        const cell = dataRow.getCell(colIdx + 2);
        if (!canEdit) {
          cell.value = '—';
          cell.font = { color: { argb: 'FFAAAAAA' } };
        } else {
          // Color-code the band labels
          const label = String(cell.value || '').toLowerCase();
          if (label === 'green') {
            cell.font = { color: { argb: 'FF16A34A' }, bold: true };
          } else if (label === 'amber') {
            cell.font = { color: { argb: 'FFD97706' }, bold: true };
          } else if (label === 'red') {
            cell.font = { color: { argb: 'FFDC2626' }, bold: true };
          }
        }
        cell.alignment = { horizontal: 'center' };
      }
    }

    // Separator row
    ws.addRow([]);
  }

  // Auto-width columns
  ws.columns.forEach(col => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: true }, cell => {
      const len = String(cell.value || '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 30);
  });

  // Hidden lookup sheet for IDs
  const lookupWs = wb.addWorksheet('_Lookup');
  lookupWs.state = 'hidden';
  lookupWs.addRow(['CustomerName', 'CustomerId', 'FeatureName', 'FeatureId']);
  for (const section of customerSections) {
    for (const feat of section.features) {
      lookupWs.addRow([section.name, section.id, feat.name, feat.id]);
    }
  }

  // Legend sheet
  const legendWs = wb.addWorksheet('Legend');
  legendWs.addRow(['Band', 'Weight', 'Description']);
  legendWs.addRow(['Green', 1, 'On Track — fully meeting expectations']);
  legendWs.addRow(['Amber', 0.5, 'At Risk — partially meeting expectations']);
  legendWs.addRow(['Red', 0, 'Critical — not meeting expectations']);
  legendWs.addRow([]);
  legendWs.addRow(['How to fill in:', '', 'Type Green, Amber, or Red in each cell']);
  legendWs.addRow(['Aggregation:', '', 'AVG of weights × 100 = percentage']);
  legendWs.addRow(['Example:', '', '3 Green + 2 Amber = (1+1+1+0.5+0.5)/5 = 0.8 = 80%']);
  legendWs.getColumn(1).width = 15;
  legendWs.getColumn(2).width = 10;
  legendWs.getColumn(3).width = 50;
  legendWs.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `feature-matrix-${period}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse an uploaded Excel file with band labels back into vector weights.
 */
export async function parseMatrixExcel(
  file: File,
  customerSections: CustomerSection[],
): Promise<{ scores: Record<string, number | null>; count: number } | null> {
  try {
    const wb = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await wb.xlsx.load(arrayBuffer);

    const scoresSheet = wb.getWorksheet('Scores');
    if (!scoresSheet) {
      throw new Error('Missing "Scores" sheet in uploaded file');
    }

    // Read the lookup sheet for name -> ID mapping
    const lookupSheet = wb.getWorksheet('_Lookup');
    const custNameToId = new Map<string, string>();
    const featLookup = new Map<string, string>();
    if (lookupSheet) {
      lookupSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const custName = String(row.getCell(1).value || '').trim();
        const custId = String(row.getCell(2).value || '').trim();
        const featName = String(row.getCell(3).value || '').trim();
        const featId = String(row.getCell(4).value || '').trim();
        if (custId) custNameToId.set(custName, custId);
        if (featId) featLookup.set(`${custName}::${featName}`, featId);
      });
    } else {
      for (const s of customerSections) {
        custNameToId.set(s.name, s.id);
        for (const f of s.features) {
          featLookup.set(`${s.name}::${f.name}`, f.id);
        }
      }
    }

    // Read indicator IDs from hidden row 1
    const idRow = scoresSheet.getRow(1);
    const indicatorIds: string[] = [];
    for (let col = 2; col <= scoresSheet.columnCount; col++) {
      indicatorIds.push(String(idRow.getCell(col).value || '').trim());
    }

    const parsedScores: Record<string, number | null> = {};
    let count = 0;
    let currentCustomerId: string | null = null;

    // Build indicator name -> id map as fallback
    const indNameToId = new Map<string, string>();
    for (const s of customerSections) {
      for (const ind of s.indicators) {
        indNameToId.set(ind.name, ind.id);
      }
    }

    scoresSheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;

      const firstCell = String(row.getCell(1).value || '').trim();
      if (!firstCell) return;

      if (custNameToId.has(firstCell) && !row.getCell(2).value) {
        currentCustomerId = custNameToId.get(firstCell) || null;
        return;
      }

      if (firstCell.toLowerCase() === 'feature') {
        if (!indicatorIds[0] || indicatorIds[0] === '' || indicatorIds[0] === '__IDS__') {
          indicatorIds.length = 0;
          for (let col = 2; col <= scoresSheet.columnCount; col++) {
            const name = String(row.getCell(col).value || '').trim();
            indicatorIds.push(indNameToId.get(name) || '');
          }
        }
        return;
      }

      if (!currentCustomerId) return;
      const featName = firstCell;
      const featId = featLookup.get(`${[...custNameToId.entries()].find(([, id]) => id === currentCustomerId)?.[0] || ''}::${featName}`);
      if (!featId) return;

      for (let col = 2; col <= 1 + indicatorIds.length; col++) {
        const indId = indicatorIds[col - 2];
        if (!indId) continue;
        const cellVal = row.getCell(col).value;
        const weight = parseBandValue(cellVal);
        if (weight === null) continue;
        parsedScores[`${indId}::${currentCustomerId}::${featId}`] = weight;
        count++;
      }
    });

    return { scores: parsedScores, count };
  } catch (err: any) {
    console.error('Error parsing matrix Excel:', err);
    throw err;
  }
}
