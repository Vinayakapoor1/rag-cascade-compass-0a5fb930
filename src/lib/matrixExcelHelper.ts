import ExcelJS from 'exceljs';

interface CustomerSection {
  id: string;
  name: string;
  features: { id: string; name: string }[];
  indicators: { id: string; name: string; kr_name: string; fo_name: string }[];
  indicatorFeatureMap: Record<string, Set<string>>;
}

interface KPIBand {
  band_label: string;
  rag_color: string;
  rag_numeric: number;
  sort_order: number;
}

type BandMap = Record<string, KPIBand[]>;

// Default bands when no KPI-specific bands exist
const DEFAULT_BANDS: KPIBand[] = [
  { band_label: 'Green', rag_color: 'green', rag_numeric: 1, sort_order: 1 },
  { band_label: 'Amber', rag_color: 'amber', rag_numeric: 0.5, sort_order: 2 },
  { band_label: 'Red', rag_color: 'red', rag_numeric: 0, sort_order: 3 },
];

function valueToBandLabel(val: number | null, bands: KPIBand[]): string {
  if (val === null || val === undefined) return '';
  const band = bands.find(b => b.rag_numeric === val);
  return band?.band_label || '';
}

function parseBandValue(cellVal: any, bands: KPIBand[]): number | null {
  if (cellVal === null || cellVal === undefined || cellVal === '' || cellVal === '—') return null;
  // Try matching by band label (case-insensitive)
  if (typeof cellVal === 'string') {
    const lower = cellVal.trim().toLowerCase();
    const match = bands.find(b => b.band_label.toLowerCase() === lower);
    if (match) return match.rag_numeric;
    // Fallback: generic labels
    if (lower === 'green') return 1;
    if (lower === 'amber') return 0.5;
    if (lower === 'red') return 0;
  }
  // Try as numeric weight
  const num = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal));
  if (isNaN(num)) return null;
  if (num === 0 || num === 0.5 || num === 1) return num;
  return null;
}

/**
 * Generate an Excel template for the customer-feature matrix.
 * Cells contain KPI-specific band labels.
 */
export async function generateMatrixTemplate(
  customerSections: CustomerSection[],
  period: string,
  scores: Record<string, number | null>,
  kpiBands: BandMap = {},
) {
  const wb = new ExcelJS.Workbook();

  const allIndicators = new Map<string, { id: string; name: string }>();
  for (const section of customerSections) {
    for (const ind of section.indicators) {
      allIndicators.set(ind.id, { id: ind.id, name: ind.name });
    }
  }
  const indicatorList = Array.from(allIndicators.values());
  const totalCols = 1 + indicatorList.length;

  const ws = wb.addWorksheet('Scores');

  // Hidden ID row
  const idRow = ws.addRow(['__IDS__', ...indicatorList.map(i => i.id)]);
  idRow.font = { color: { argb: 'FF999999' }, size: 8 };
  idRow.hidden = true;

  for (const section of customerSections) {
    const custHeaderRow = ws.addRow([section.name]);
    custHeaderRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    custHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    custHeaderRow.height = 28;
    ws.mergeCells(custHeaderRow.number, 1, custHeaderRow.number, totalCols);
    custHeaderRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const colHeaderRow = ws.addRow(['Feature', ...indicatorList.map(i => i.name)]);
    colHeaderRow.font = { bold: true, size: 10 };
    colHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    for (const feat of section.features) {
      const rowData: (string | null)[] = [feat.name];
      for (const ind of indicatorList) {
        const canEdit = section.indicatorFeatureMap[ind.id]?.has(feat.id) ?? false;
        if (!canEdit) {
          rowData.push(null);
        } else {
          const key = `${ind.id}::${section.id}::${feat.id}`;
          const bands = kpiBands[ind.id] || DEFAULT_BANDS;
          rowData.push(valueToBandLabel(scores[key] ?? null, bands));
        }
      }
      const dataRow = ws.addRow(rowData);

      for (let colIdx = 0; colIdx < indicatorList.length; colIdx++) {
        const ind = indicatorList[colIdx];
        const canEdit = section.indicatorFeatureMap[ind.id]?.has(feat.id) ?? false;
        const cell = dataRow.getCell(colIdx + 2);
        if (!canEdit) {
          cell.value = '—';
          cell.font = { color: { argb: 'FFAAAAAA' } };
        } else {
          const bands = kpiBands[ind.id] || DEFAULT_BANDS;
          const label = String(cell.value || '').toLowerCase();
          const band = bands.find(b => b.band_label.toLowerCase() === label);
          if (band) {
            const colorMap: Record<string, string> = { green: 'FF16A34A', amber: 'FFD97706', red: 'FFDC2626' };
            cell.font = { color: { argb: colorMap[band.rag_color] || 'FF000000' }, bold: true };
          }
        }
        cell.alignment = { horizontal: 'center' };
      }
    }

    ws.addRow([]);
  }

  ws.columns.forEach(col => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: true }, cell => {
      const len = String(cell.value || '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 30);
  });

  // Lookup sheet
  const lookupWs = wb.addWorksheet('_Lookup');
  lookupWs.state = 'hidden';
  lookupWs.addRow(['CustomerName', 'CustomerId', 'FeatureName', 'FeatureId']);
  for (const section of customerSections) {
    for (const feat of section.features) {
      lookupWs.addRow([section.name, section.id, feat.name, feat.id]);
    }
  }

  // Legend sheet with per-KPI bands
  const legendWs = wb.addWorksheet('Legend');
  legendWs.addRow(['KPI', 'Band Label', 'RAG Color', 'Weight']);
  legendWs.getRow(1).font = { bold: true };
  for (const ind of indicatorList) {
    const bands = kpiBands[ind.id] || DEFAULT_BANDS;
    for (const b of bands) {
      legendWs.addRow([ind.name, b.band_label, b.rag_color, b.rag_numeric]);
    }
  }
  legendWs.addRow([]);
  legendWs.addRow(['Aggregation:', '', '', 'AVG of weights × 100 = percentage']);
  legendWs.addRow(['Example:', '', '', '3 Green + 2 Amber = (1+1+1+0.5+0.5)/5 = 0.8 = 80%']);
  legendWs.getColumn(1).width = 30;
  legendWs.getColumn(2).width = 25;
  legendWs.getColumn(3).width = 12;
  legendWs.getColumn(4).width = 50;

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
  kpiBands: BandMap = {},
): Promise<{ scores: Record<string, number | null>; count: number } | null> {
  try {
    const wb = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await wb.xlsx.load(arrayBuffer);

    const scoresSheet = wb.getWorksheet('Scores');
    if (!scoresSheet) {
      throw new Error('Missing "Scores" sheet in uploaded file');
    }

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

    const idRow = scoresSheet.getRow(1);
    const indicatorIds: string[] = [];
    for (let col = 2; col <= scoresSheet.columnCount; col++) {
      indicatorIds.push(String(idRow.getCell(col).value || '').trim());
    }

    const parsedScores: Record<string, number | null> = {};
    let count = 0;
    let currentCustomerId: string | null = null;

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
        const bands = kpiBands[indId] || DEFAULT_BANDS;
        const weight = parseBandValue(cellVal, bands);
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
