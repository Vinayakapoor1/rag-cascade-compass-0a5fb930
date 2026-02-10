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
 * Customers appear as section headers, features as rows beneath.
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
  const totalCols = 1 + indicatorList.length; // Feature + KPIs

  const ws = wb.addWorksheet('Scores');

  // Hidden ID row (row 1) for parsing — maps column index to indicator ID
  const idRow = ws.addRow(['__IDS__', ...indicatorList.map(i => i.id)]);
  idRow.font = { color: { argb: 'FF999999' }, size: 8 };
  idRow.hidden = true;

  for (const section of customerSections) {
    // Customer header row (merged across all columns)
    const custHeaderRow = ws.addRow([section.name]);
    custHeaderRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    custHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    custHeaderRow.height = 28;
    ws.mergeCells(custHeaderRow.number, 1, custHeaderRow.number, totalCols);
    custHeaderRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Column headers for this section: Feature | KPI1 | KPI2 | ...
    const colHeaderRow = ws.addRow(['Feature', ...indicatorList.map(i => i.name)]);
    colHeaderRow.font = { bold: true, size: 10 };
    colHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    // Feature rows
    for (const feat of section.features) {
      const rowData: (string | number | null)[] = [feat.name];
      for (const ind of indicatorList) {
        const canEdit = section.indicatorFeatureMap[ind.id]?.has(feat.id) ?? false;
        if (!canEdit) {
          rowData.push(null);
        } else {
          const key = `${ind.id}::${section.id}::${feat.id}`;
          rowData.push(scores[key] ?? null);
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
 * Parse an uploaded Excel file with section-header format back into a scores map.
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

    // If IDs are missing, build name->id map from sections
    if (!indicatorIds[0] || indicatorIds[0] === '') {
      const indNameToId = new Map<string, string>();
      for (const s of customerSections) {
        for (const ind of s.indicators) {
          indNameToId.set(ind.name, ind.id);
        }
      }
      // We'll resolve names from column headers per-section as we parse
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
      if (rowNum === 1) return; // skip hidden ID row

      const firstCell = String(row.getCell(1).value || '').trim();
      if (!firstCell) return; // skip blank separator rows

      // Check if this is a customer header row (exists in lookup)
      if (custNameToId.has(firstCell) && !row.getCell(2).value) {
        currentCustomerId = custNameToId.get(firstCell) || null;
        return;
      }

      // Check if this is a column header row (starts with "Feature")
      if (firstCell.toLowerCase() === 'feature') {
        // If IDs were missing, resolve from these column headers
        if (!indicatorIds[0] || indicatorIds[0] === '' || indicatorIds[0] === '__IDS__') {
          indicatorIds.length = 0;
          for (let col = 2; col <= scoresSheet.columnCount; col++) {
            const name = String(row.getCell(col).value || '').trim();
            indicatorIds.push(indNameToId.get(name) || '');
          }
        }
        return;
      }

      // This is a data row (feature name + scores)
      if (!currentCustomerId) return;
      const featName = firstCell;
      const featId = featLookup.get(`${[...custNameToId.entries()].find(([, id]) => id === currentCustomerId)?.[0] || ''}::${featName}`);
      if (!featId) return;

      for (let col = 2; col <= 1 + indicatorIds.length; col++) {
        const indId = indicatorIds[col - 2];
        if (!indId) continue;
        const cellVal = row.getCell(col).value;
        if (cellVal === null || cellVal === undefined || cellVal === '' || cellVal === '—') continue;
        const num = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal));
        if (isNaN(num)) continue;
        const clamped = Math.min(100, Math.max(0, num));
        parsedScores[`${indId}::${currentCustomerId}::${featId}`] = clamped;
        count++;
      }
    });

    return { scores: parsedScores, count };
  } catch (err: any) {
    console.error('Error parsing matrix Excel:', err);
    throw err;
  }
}
