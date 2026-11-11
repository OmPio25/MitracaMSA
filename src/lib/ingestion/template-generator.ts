/**
 * Excel Template Generator
 * 
 * Generates downloadable .xlsx files with exact fixed headers and sample rows
 * for each of the 3 templates: DataAgent, MasterProduksi, MasterClaim.
 */

import ExcelJS from 'exceljs';
import { TEMPLATE_DEFINITIONS, TemplateType } from './template-definitions';

export async function generateTemplateWorkbook(type: TemplateType): Promise<Buffer> {
  const definition = TEMPLATE_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Template type "${type}" tidak ditemukan.`);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MitracaMSA Insurance System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(definition.title, {
    views: [{ state: 'frozen', ySplit: 1 }], // Freeze header row
  });

  // Setup Columns
  worksheet.columns = definition.columns.map((col) => ({
    header: col.header,
    key: col.header,
    width: Math.max(col.header.length + 4, 15),
  }));

  // Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    const colDef = definition.columns[colNumber - 1];
    const isRequired = colDef?.required;

    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
      name: 'Calibri',
    };

    // Navy Blue background for header; Dark Amber for required columns indicator
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isRequired ? 'FF1E3A8A' : 'FF2563EB' },
    };

    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // Add Sample Data Row (Row 2)
  const sampleValues = definition.columns.reduce((acc, col) => {
    acc[col.header] = col.exampleValue;
    return acc;
  }, {} as Record<string, unknown>);

  const dataRow = worksheet.addRow(sampleValues);
  dataRow.height = 20;
  dataRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
