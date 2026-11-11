import ExcelJS from 'exceljs';
import { HierarchyNode } from '@/app/api/hierarchy/route';

export interface FlatHierarchyVisualNode extends HierarchyNode {
  level: number;
  treeStructureText: string;
}

/**
 * Meratakan pohon hirarki menjadi array terurut (Depth-First Pre-Order Traversal)
 * dengan menambahkan visualisasi garis sambung pohon (├──, └──, │) dan indentasi bertingkat.
 */
export function flattenHierarchyTree(
  nodes: HierarchyNode[],
  level = 0,
  ancestorPrefix = ''
): FlatHierarchyVisualNode[] {
  const result: FlatHierarchyVisualNode[] = [];

  nodes.forEach((node, idx) => {
    const isLast = idx === nodes.length - 1;
    let lineText = '';

    if (level === 0) {
      lineText = `● [${node.agentCode}] ${node.name}`;
    } else {
      const connector = isLast ? '└── ' : '├── ';
      lineText = `${ancestorPrefix}${connector}[${node.agentCode}] ${node.name}`;
    }

    result.push({
      ...node,
      level,
      treeStructureText: lineText,
    });

    if (node.children && node.children.length > 0) {
      const nextPrefix = level === 0 ? '  ' : ancestorPrefix + (isLast ? '    ' : '│   ');
      result.push(...flattenHierarchyTree(node.children, level + 1, nextPrefix));
    }
  });

  return result;
}

/**
 * Definisi palet warna background baris penuh (full row) berdasarkan kedalaman level.
 * Warna dirancang elegan, kontras tinggi, dan nyaman dibaca (soft pastel tones).
 */
export const LEVEL_EXCEL_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: 'FFE0E7FF', text: 'FF1E1B4B', label: 'Root Agensi' },       // Indigo 100 / Indigo 950
  1: { bg: 'FFE0F2FE', text: 'FF0C4A6E', label: 'Level 1 (Direct)' },   // Sky 100 / Sky 900
  2: { bg: 'FFFEF3C7', text: 'FF78350F', label: 'Level 2' },            // Amber 100 / Amber 900
  3: { bg: 'FFFFE4E6', text: 'FF881337', label: 'Level 3' },            // Rose 100 / Rose 900
  4: { bg: 'FFF3E8FF', text: 'FF581C87', label: 'Level 4' },            // Purple 100 / Purple 900
  5: { bg: 'FFCCFBF1', text: 'FF134E4A', label: 'Level 5' },            // Teal 100 / Teal 900
  6: { bg: 'FFFFEDD5', text: 'FF7C2D12', label: 'Level 6' },            // Orange 100 / Orange 900
  7: { bg: 'FFF1F5F9', text: 'FF334155', label: 'Level 7+' },           // Slate 100 / Slate 700
};

export async function generateHierarchyExcelWorkbook(
  tree: HierarchyNode[],
  options: {
    mode: string;
    agentCode?: string;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MitracaMSA Agency Management';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Pohon Hirarki Agensi', {
    views: [{ state: 'frozen', ySplit: 6, xSplit: 0 }], // Freeze di atas row 7 (header tabel)
  });

  // ── 1. Judul & Header Laporan ────────────────────────────────────────────────
  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'MITRACAMSA — LAPORAN STRUKTUR HIRARKI AGENSI';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 24;

  // Metadata Baris 2
  worksheet.mergeCells('A2:L2');
  const metaCell = worksheet.getCell('A2');
  metaCell.value = `Parameter: ${options.mode} | Target: ${options.agentCode || 'Semua'} | Diekspor pada: ${new Date().toLocaleString('id-ID')}`;
  metaCell.font = { size: 9, italic: true, color: { argb: 'FF64748B' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(2).height = 18;

  // ── 2. Color Legend (Keterangan Warna Level) Baris 4 ─────────────────────────
  worksheet.getCell('A4').value = 'Keterangan Warna Level:';
  worksheet.getCell('A4').font = { bold: true, size: 9, color: { argb: 'FF475569' } };
  worksheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'left' };

  const legendLevels = [
    { col: 2, level: 0, text: '● Root' },
    { col: 3, level: 1, text: 'Level 1' },
    { col: 4, level: 2, text: 'Level 2' },
    { col: 5, level: 3, text: 'Level 3' },
    { col: 6, level: 4, text: 'Level 4' },
    { col: 7, level: 5, text: 'Level 5' },
    { col: 8, level: 6, text: 'Level 6+' },
  ];

  legendLevels.forEach((lg) => {
    const cell = worksheet.getRow(4).getCell(lg.col);
    const color = LEVEL_EXCEL_COLORS[lg.level];
    cell.value = lg.text;
    cell.font = { bold: true, size: 8.5, color: { argb: color.text } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.bg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  worksheet.getRow(4).height = 18;
  worksheet.getRow(5).height = 8; // Spacer

  // ── 3. Definisi Kolom Tabel (Header di Baris 6) ──────────────────────────────
  const columns = [
    { header: 'STRUKTUR HIRARKI LENGKAP', key: 'treeStructureText', width: 46 },
    { header: 'Level', key: 'level', width: 14 },
    { header: 'Kode Agen', key: 'agentCode', width: 15 },
    { header: 'Nama Lengkap Agen', key: 'name', width: 30 },
    { header: 'Status Keagenan', key: 'statusKeagenan', width: 18 },
    { header: 'Status Hirarki', key: 'uplineStatus', width: 22 },
    { header: 'Kode Upline', key: 'uplineAgentCode', width: 16 },
    { header: 'Peringkat', key: 'peringkat', width: 20 },
    { header: 'Cabang', key: 'rawBranchName', width: 22 },
    { header: 'Total Premi (IDR)', key: 'totalProduction', width: 24 },
    { header: 'Polis', key: 'policyCount', width: 12 },
    { header: 'Downline', key: 'downlinesCount', width: 14 },
  ];

  const headerRow = worksheet.getRow(6);
  headerRow.height = 28;

  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Navy blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
    worksheet.getColumn(index + 1).width = col.width;
  });

  // ── 4. Render Data Baris dengan Pewarnaan Penuh Sesuai Level ──────────────────
  const flatNodes = flattenHierarchyTree(tree);

  let totalPremiAll = 0;
  let totalPolisAll = 0;

  flatNodes.forEach((node, idx) => {
    const rowNum = 7 + idx;
    const row = worksheet.getRow(rowNum);
    row.height = 22;

    const levelColor = LEVEL_EXCEL_COLORS[Math.min(node.level, 7)];
    const premiVal = parseFloat(node.totalProduction || '0');
    totalPremiAll += premiVal;
    totalPolisAll += Number(node.policyCount || 0);

    const levelBadge = node.level === 0 ? '● ROOT' : `Level ${node.level}`;

    // Nilai tiap sel
    row.getCell(1).value = node.treeStructureText;
    row.getCell(2).value = levelBadge;
    row.getCell(3).value = node.agentCode;
    row.getCell(4).value = node.name;
    row.getCell(5).value = node.statusKeagenan || '-';
    row.getCell(6).value = node.uplineStatus;
    row.getCell(7).value = node.uplineAgentCode || '-';
    row.getCell(8).value = node.peringkat || '-';
    row.getCell(9).value = node.rawBranchName || '-';
    row.getCell(10).value = premiVal;
    row.getCell(11).value = Number(node.policyCount || 0);
    row.getCell(12).value = Number(node.downlinesCount || 0);

    // Tipografi & Alignment
    row.getCell(1).font = { name: 'Consolas', size: 9.5, bold: node.level === 0, color: { argb: levelColor.text } };
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(2).font = { bold: true, size: 9, color: { argb: levelColor.text } };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(3).font = { name: 'Consolas', bold: true, size: 9.5, color: { argb: 'FF1E293B' } };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(4).font = { bold: node.level === 0, size: 9.5, color: { argb: 'FF0F172A' } };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).font = { name: 'Consolas', size: 9.5 };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(10).numFmt = '#,##0';
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(10).font = { bold: node.level === 0 };

    row.getCell(11).numFmt = '#,##0';
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(12).numFmt = '#,##0';
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(12).font = { bold: true };

    // Border untuk semua 12 kolom
    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    // Pewarnaan Latar HANYA untuk kolom Struktur Hirarki Lengkap (Kolom 1) & Level (Kolom 2)
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: levelColor.bg },
    };
    row.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: levelColor.bg },
    };

    // Pewarnaan Latar untuk Kolom Status Keagenan (Kolom 5)
    const statusKeagenanUpper = (node.statusKeagenan || '').toUpperCase();
    if (statusKeagenanUpper === 'CUT') {
      row.getCell(5).font = { bold: true, color: { argb: 'FFE11D48' } }; // Rose / Red
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
    } else if (statusKeagenanUpper === 'AKTIF') {
      row.getCell(5).font = { bold: true, color: { argb: 'FF065F46' } }; // Emerald Green
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    } else {
      row.getCell(5).font = { color: { argb: 'FF475569' } }; // Slate Gray
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    }
  });

  // ── 5. Baris Total / Summary di Bagian Bawah ──────────────────────────────────
  const summaryRowNum = 7 + flatNodes.length;
  const summaryRow = worksheet.getRow(summaryRowNum);
  summaryRow.height = 26;

  summaryRow.getCell(1).value = 'TOTAL KESELURUHAN';
  worksheet.mergeCells(`A${summaryRowNum}:I${summaryRowNum}`);
  summaryRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
  summaryRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  summaryRow.getCell(10).value = totalPremiAll;
  summaryRow.getCell(10).font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
  summaryRow.getCell(10).numFmt = '#,##0';
  summaryRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };

  summaryRow.getCell(11).value = totalPolisAll;
  summaryRow.getCell(11).font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
  summaryRow.getCell(11).numFmt = '#,##0';
  summaryRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };

  summaryRow.getCell(12).value = flatNodes.length;
  summaryRow.getCell(12).font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
  summaryRow.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 1; c <= 12; c++) {
    const cell = summaryRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
