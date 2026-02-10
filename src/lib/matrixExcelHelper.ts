import ExcelJS from 'exceljs';

interface CustomerSection {
  id: string;
  name: string;
  features: { id: string; name: string }[];
  indicators: { id: string; name: string; kr_name: string; fo_name: string }[];
  indicatorFeatureMap: Record<string, Set<string>>;
}

/**
 * Generate an Excel template for the customer-feature matrix.
 * One sheet per customer, features as rows, KPIs as columns.
 */
export async function generateMatrixTemplate(
  customerSections: CustomerSection[],
  period: string,
  scores: Record<string, number | null>,
) {
  const wb = new ExcelJS.Workbook();

  // Collect all unique indicators across all customers (for a unified column order)
  const allIndicators = new Map<string, { id: string; name: string }>();
  for (const section of customerSections) {
    for (const ind of section.indicators) {
      allIndicators.set(ind.id, { id: ind.id, name: ind.name });
    }
  }
  const indicatorList = Array.from(allIndicators.values());

  // Single sheet with all customers
  const ws = wb.addWorksheet('Scores');

  // Header row: Customer | Feature | KPI1 | KPI2 | ...
  const headerRow = ['Customer', 'Feature', ...indicatorList.map(i => i.name)];
  const header = ws.addRow(headerRow);
  header.font = { bold: true, size: 11 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  // Hidden ID row for parsing
  const idRow = ws.addRow(['__IDS__', '__IDS__', ...indicatorList.map(i => i.id)]);
  idRow.font = { color: { argb: 'FF999999' }, size: 8 };
  idRow.hidden = true;

  for (const section of customerSections) {
    for (const feat of section.features) {
      const row: (string | number | null)[] = [section.name, feat.name];
      for (const ind of indicatorList) {
        const canEdit = section.indicatorFeatureMap[ind.id]?.has(feat.id) ?? false;
        if (!canEdit) {
          row.push(null); // N/A cell
        } else {
          const key = `${ind.id}::${section.id}::${feat.id}`;
          row.push(scores[key] ?? null);
        }
      }
      const dataRow = ws.addRow(row);

      // Style N/A cells with gray
      for (let colIdx = 2; colIdx < 2 + indicatorList.length; colIdx++) {
        const ind = indicatorList[colIdx - 2];
        const canEdit = section.indicatorFeatureMap[ind.id]?.has(feat.id) ?? false;
        if (!canEdit) {
          const cell = dataRow.getCell(colIdx + 1);
          cell.value = '—';
          cell.font = { color: { argb: 'FFAAAAAA' } };
          cell.alignment = { horizontal: 'center' };
        } else {
          const cell = dataRow.getCell(colIdx + 1);
          cell.alignment = { horizontal: 'center' };
        }
      }
    }
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

  // Add a lookup sheet with customer/feature IDs (hidden)
  const lookupWs = wb.addWorksheet('_Lookup');
  lookupWs.state = 'hidden';
  lookupWs.addRow(['CustomerName', 'CustomerId', 'FeatureName', 'FeatureId']);
  for (const section of customerSections) {
    for (const feat of section.features) {
      lookupWs.addRow([section.name, section.id, feat.name, feat.id]);
    }
  }

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
 * Parse an uploaded Excel file back into a scores map.
 * Returns a map of cellKey -> value.
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
    const featLookup = new Map<string, string>(); // "custName::featName" -> featId
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
      // Fall back: build lookup from customerSections
      for (const s of customerSections) {
        custNameToId.set(s.name, s.id);
        for (const f of s.features) {
          featLookup.set(`${s.name}::${f.name}`, f.id);
        }
      }
    }

    // Read indicator IDs from hidden row 2
    const idRow = scoresSheet.getRow(2);
    const indicatorIds: string[] = [];
    for (let col = 3; col <= scoresSheet.columnCount; col++) {
      indicatorIds.push(String(idRow.getCell(col).value || '').trim());
    }

    // If IDs are missing, try matching by name from header row
    const headerRow = scoresSheet.getRow(1);
    if (!indicatorIds[0] || indicatorIds[0] === '') {
      // Build name -> id map from customerSections
      const indNameToId = new Map<string, string>();
      for (const s of customerSections) {
        for (const ind of s.indicators) {
          indNameToId.set(ind.name, ind.id);
        }
      }
      for (let col = 3; col <= scoresSheet.columnCount; col++) {
        const name = String(headerRow.getCell(col).value || '').trim();
        indicatorIds[col - 3] = indNameToId.get(name) || '';
      }
    }

    const parsedScores: Record<string, number | null> = {};
    let count = 0;

    scoresSheet.eachRow((row, rowNum) => {
      if (rowNum <= 2) return; // skip header + ID row
      const custName = String(row.getCell(1).value || '').trim();
      const featName = String(row.getCell(2).value || '').trim();
      const custId = custNameToId.get(custName);
      const featId = featLookup.get(`${custName}::${featName}`);
      if (!custId || !featId) return;

      for (let col = 3; col <= 2 + indicatorIds.length; col++) {
        const indId = indicatorIds[col - 3];
        if (!indId) continue;
        const cellVal = row.getCell(col).value;
        if (cellVal === null || cellVal === undefined || cellVal === '' || cellVal === '—') continue;
        const num = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal));
        if (isNaN(num)) continue;
        const clamped = Math.min(100, Math.max(0, num));
        parsedScores[`${indId}::${custId}::${featId}`] = clamped;
        count++;
      }
    });

    return { scores: parsedScores, count };
  } catch (err: any) {
    console.error('Error parsing matrix Excel:', err);
    throw err;
  }
}
