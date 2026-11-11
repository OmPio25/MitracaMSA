import ExcelJS from 'exceljs';
import { LossRatioBadgeInfo } from '@/lib/analytics/loss-ratio';

export interface AnalyticsExportData {
  isAgentRole?: boolean;
  filterInfo: {
    cutoffLabel: string;
    dateRange: string;
    branchName?: string;
    agentCode?: string;
    uwYear?: string;
  };
  kpi: {
    totalPremi: number;
    totalClaim: number;
    lossRatio: number | null;
    lossRatioEval: LossRatioBadgeInfo;
    netMargin: number;
    totalKomisi: number;
    totalPolicies: number;
    totalClaimsCount: number;
  };
  branchPerformance: Array<{
    branchCode: string;
    branchName: string;
    premi: number;
    policyCount: number;
    claim: number;
    claimCount: number;
    lossRatio: number | null;
    lossRatioEval: LossRatioBadgeInfo;
  }>;
  allAgentsPerformance?: Array<{
    agentCode: string;
    agentName: string;
    peringkat: string;
    branchName: string;
    premi: number;
    policyCount: number;
    claim: number;
    claimCount: number;
    lossRatio: number | null;
    lossRatioEval: LossRatioBadgeInfo;
  }>;
  agentPerformance: Array<{
    agentCode: string;
    agentName: string;
    peringkat: string;
    branchName: string;
    premi: number;
    policyCount: number;
    claim: number;
    claimCount: number;
    lossRatio: number | null;
    lossRatioEval: LossRatioBadgeInfo;
    isLeader?: boolean;
    relativeDepth?: number;
    uplineAgentCode?: string | null;
    uplineAgentName?: string | null;
  }>;
  personalPerformance?: {
    agentCode: string;
    agentName: string;
    peringkat: string;
    branchName: string;
    premi: number;
    policyCount: number;
    claim: number;
    claimCount: number;
    lossRatio: number | null;
    lossRatioEval: LossRatioBadgeInfo;
  } | null;
  topCausesOfLoss: Array<{
    cause: string;
    claim: number;
    claimCount: number;
    pctOfTotal: number;
    averagePerClaim: number;
  }>;
}

export async function generateAnalyticsExcelWorkbook(data: AnalyticsExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MitracaMSA Production & Loss Ratio System';
  workbook.created = new Date();

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 1: RINGKASAN EKSEKUTIF & KPI
  // ══════════════════════════════════════════════════════════════════════════════
  const wsKpi = workbook.addWorksheet('Ringkasan Eksekutif');
  wsKpi.views = [{ showGridLines: true }];

  // Judul
  wsKpi.mergeCells('A1:G1');
  const titleCell = wsKpi.getCell('A1');
  titleCell.value = 'MITRACAMSA — LAPORAN EKSEKUTIF ANALITIK PRODUKSI & LOSS RATIO';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  wsKpi.getRow(1).height = 25;

  // Metadata
  wsKpi.mergeCells('A2:G2');
  const metaCell = wsKpi.getCell('A2');
  metaCell.value = `Periode: ${data.filterInfo.cutoffLabel} (${data.filterInfo.dateRange}) | Cabang: ${data.filterInfo.branchName || 'Nasional'} | Diekspor: ${new Date().toLocaleString('id-ID')}`;
  metaCell.font = { size: 9, italic: true, color: { argb: 'FF64748B' } };
  wsKpi.getRow(2).height = 18;

  // Keterangan Parameter Loss Ratio
  wsKpi.getCell('A4').value = 'Standar Indikator Loss Ratio:';
  wsKpi.getCell('A4').font = { bold: true, size: 9 };
  wsKpi.getCell('B4').value = '🟢 Sehat (< 35%)';
  wsKpi.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  wsKpi.getCell('B4').font = { bold: true, color: { argb: 'FF065F46' }, size: 9 };
  wsKpi.getCell('C4').value = '🟡 Waspada (= 35%)';
  wsKpi.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  wsKpi.getCell('C4').font = { bold: true, color: { argb: 'FF78350F' }, size: 9 };
  wsKpi.getCell('D4').value = '🔴 Kritis (> 35%)';
  wsKpi.getCell('D4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
  wsKpi.getCell('D4').font = { bold: true, color: { argb: 'FFE11D48' }, size: 9 };

  // Tabel Metrik KPI
  const kpiRows = [
    ['Total Gross Written Premium (GWP)', data.kpi.totalPremi, 'IDR'],
    ['Total Gross Claim Diselesaikan', data.kpi.totalClaim, 'IDR'],
    ['Loss Ratio Keseluruhan', data.kpi.lossRatio !== null ? `${data.kpi.lossRatio.toFixed(2)}%` : '-', data.kpi.lossRatioEval.label],
    ['Estimasi Komisi Keagenan', data.kpi.totalKomisi, 'IDR'],
    ['Net Underwriting Margin', data.kpi.netMargin, 'IDR'],
    ['Total Polis Terdaftar', data.kpi.totalPolicies, 'Polis'],
    ['Total Klaim Terdaftar', data.kpi.totalClaimsCount, 'Kasus Klaim'],
  ];

  wsKpi.getCell('A6').value = 'METRIK FINANSIAL';
  wsKpi.getCell('B6').value = 'NILAI';
  wsKpi.getCell('C6').value = 'SATUAN / STATUS';
  ['A6', 'B6', 'C6'].forEach((ref) => {
    const c = wsKpi.getCell(ref);
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  kpiRows.forEach((item, idx) => {
    const rowNum = 7 + idx;
    const r = wsKpi.getRow(rowNum);
    r.getCell(1).value = item[0];
    r.getCell(2).value = item[1];
    r.getCell(3).value = item[2];

    if (typeof item[1] === 'number') {
      r.getCell(2).numFmt = '#,##0';
    }
    r.getCell(1).font = { bold: true, size: 9.5 };
    r.getCell(2).font = { bold: true, size: 10 };
    r.getCell(3).alignment = { horizontal: 'center' };

    // Highlight Loss Ratio row
    if (idx === 2) {
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: data.kpi.lossRatioEval.excelColor.bg } };
      r.getCell(2).font = { bold: true, size: 11, color: { argb: data.kpi.lossRatioEval.excelColor.text } };
      r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: data.kpi.lossRatioEval.excelColor.bg } };
      r.getCell(3).font = { bold: true, size: 9.5, color: { argb: data.kpi.lossRatioEval.excelColor.text } };
    }

    [1, 2, 3].forEach((col) => {
      r.getCell(col).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  wsKpi.getColumn(1).width = 38;
  wsKpi.getColumn(2).width = 28;
  wsKpi.getColumn(3).width = 24;

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 2: KINERJA PERSONAL (ROLE AGEN) ATAU KINERJA CABANG (ROLE LAIN)
  // ══════════════════════════════════════════════════════════════════════════════
  const isAgentMode = Boolean(data.isAgentRole);

  if (isAgentMode && data.personalPerformance) {
    const wsPersonal = workbook.addWorksheet('Kinerja Personal');
    wsPersonal.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

    wsPersonal.mergeCells('A1:I1');
    wsPersonal.getCell('A1').value = 'KINERJA PRODUKSI & LOSS RATIO PERSONAL (PRIBADI)';
    wsPersonal.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };

    const personalHeaders = [
      { header: 'Kode Agen', width: 14 },
      { header: 'Nama Lengkap Agen', width: 28 },
      { header: 'Peringkat', width: 18 },
      { header: 'Cabang Utama', width: 22 },
      { header: 'Total Premi Pribadi (IDR)', width: 24 },
      { header: 'Polis', width: 10 },
      { header: 'Total Klaim Pribadi (IDR)', width: 24 },
      { header: 'Loss Ratio (%)', width: 18 },
      { header: 'Status Underwriting', width: 20 },
    ];

    const pHeaderRow = wsPersonal.getRow(3);
    pHeaderRow.height = 24;
    personalHeaders.forEach((col, idx) => {
      const c = pHeaderRow.getCell(idx + 1);
      c.value = col.header;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }; // Amber 600
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      wsPersonal.getColumn(idx + 1).width = col.width;
    });

    const p = data.personalPerformance;
    const row = wsPersonal.getRow(4);
    row.height = 22;
    row.getCell(1).value = p.agentCode;
    row.getCell(2).value = p.agentName;
    row.getCell(3).value = p.peringkat;
    row.getCell(4).value = p.branchName;
    row.getCell(5).value = p.premi;
    row.getCell(6).value = p.policyCount;
    row.getCell(7).value = p.claim;
    row.getCell(8).value = p.lossRatio !== null ? p.lossRatio / 100 : '-';
    row.getCell(9).value = p.lossRatioEval.label;

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).numFmt = '#,##0';
    row.getCell(7).numFmt = '#,##0';
    if (p.lossRatio !== null) row.getCell(8).numFmt = '0.00%';
    row.getCell(8).alignment = { horizontal: 'right' };
    row.getCell(9).alignment = { horizontal: 'center' };

    row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.lossRatioEval.excelColor.bg } };
    row.getCell(8).font = { bold: true, color: { argb: p.lossRatioEval.excelColor.text } };
    row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.lossRatioEval.excelColor.bg } };
    row.getCell(9).font = { bold: true, color: { argb: p.lossRatioEval.excelColor.text } };

    for (let c = 1; c <= 9; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  } else {
    // Role Non-Agent: Kinerja Cabang
    const wsBranch = workbook.addWorksheet('Kinerja Cabang');
    wsBranch.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

    wsBranch.mergeCells('A1:H1');
    wsBranch.getCell('A1').value = 'KINERJA PRODUKSI & LOSS RATIO PER CABANG';
    wsBranch.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };

    const branchHeaders = [
      { header: 'Kode', width: 12 },
      { header: 'Nama Cabang', width: 28 },
      { header: 'Total Premi (IDR)', width: 24 },
      { header: 'Polis', width: 12 },
      { header: 'Total Klaim (IDR)', width: 24 },
      { header: 'Klaim', width: 12 },
      { header: 'Loss Ratio (%)', width: 18 },
      { header: 'Status Kesehatan', width: 20 },
    ];

    const bHeaderRow = wsBranch.getRow(3);
    bHeaderRow.height = 24;
    branchHeaders.forEach((col, idx) => {
      const c = bHeaderRow.getCell(idx + 1);
      c.value = col.header;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      wsBranch.getColumn(idx + 1).width = col.width;
    });

    data.branchPerformance.forEach((b, idx) => {
      const row = wsBranch.getRow(4 + idx);
      row.height = 20;
      row.getCell(1).value = b.branchCode;
      row.getCell(2).value = b.branchName;
      row.getCell(3).value = b.premi;
      row.getCell(4).value = b.policyCount;
      row.getCell(5).value = b.claim;
      row.getCell(6).value = b.claimCount;
      row.getCell(7).value = b.lossRatio !== null ? b.lossRatio / 100 : '-';
      row.getCell(8).value = b.lossRatioEval.label;

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).numFmt = '#,##0';
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0';
      row.getCell(6).numFmt = '#,##0';
      if (b.lossRatio !== null) {
        row.getCell(7).numFmt = '0.00%';
      }
      row.getCell(7).alignment = { horizontal: 'right' };
      row.getCell(8).alignment = { horizontal: 'center' };

      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: b.lossRatioEval.excelColor.bg } };
      row.getCell(7).font = { bold: true, color: { argb: b.lossRatioEval.excelColor.text } };
      row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: b.lossRatioEval.excelColor.bg } };
      row.getCell(8).font = { bold: true, color: { argb: b.lossRatioEval.excelColor.text } };

      for (let c = 1; c <= 8; c++) {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 3: KINERJA GROUP (ROLE AGEN) ATAU KINERJA AGEN (ROLE LAIN)
  // ══════════════════════════════════════════════════════════════════════════════
  if (isAgentMode) {
    const wsAgent = workbook.addWorksheet('Kinerja Group');
    wsAgent.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

    wsAgent.mergeCells('A1:K1');
    wsAgent.getCell('A1').value = 'KINERJA PRODUKSI & LOSS RATIO GROUP (LEADER & DOWNLINE)';
    wsAgent.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };

    const agentHeaders = [
      { header: 'Kode Agen', width: 14 },
      { header: 'Nama Lengkap & Hirarki', width: 34 },
      { header: 'Upline Langsung (Direct)', width: 28 },
      { header: 'Peran & Level', width: 20 },
      { header: 'Peringkat', width: 18 },
      { header: 'Cabang', width: 22 },
      { header: 'Total Premi (IDR)', width: 22 },
      { header: 'Polis', width: 10 },
      { header: 'Total Klaim (IDR)', width: 22 },
      { header: 'Loss Ratio (%)', width: 18 },
      { header: 'Status Kesehatan', width: 18 },
    ];

    const aHeaderRow = wsAgent.getRow(3);
    aHeaderRow.height = 24;
    agentHeaders.forEach((col, idx) => {
      const c = aHeaderRow.getCell(idx + 1);
      c.value = col.header;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      wsAgent.getColumn(idx + 1).width = col.width;
    });

    data.agentPerformance.forEach((ag: any, idx: number) => {
      const row = wsAgent.getRow(4 + idx);
      row.height = 20;

      const isLeader = ag.isLeader || (data.personalPerformance && ag.agentCode === data.personalPerformance.agentCode);
      const prefix = isLeader ? '👑 ' : ag.relativeDepth ? '   '.repeat(ag.relativeDepth) + '↳ ' : '';

      row.getCell(1).value = ag.agentCode;
      row.getCell(2).value = `${prefix}${ag.agentName}`;
      row.getCell(3).value = isLeader
        ? '- (Root Leader)'
        : ag.uplineAgentCode
        ? `${ag.uplineAgentName || 'Upline'} (${ag.uplineAgentCode})`
        : '-';
      row.getCell(4).value = isLeader ? '👑 Leader (Anda)' : `Level ${ag.relativeDepth || 1} Downline`;
      row.getCell(5).value = ag.peringkat;
      row.getCell(6).value = ag.branchName;
      row.getCell(7).value = ag.premi;
      row.getCell(8).value = ag.policyCount;
      row.getCell(9).value = ag.claim;
      row.getCell(10).value = ag.lossRatio !== null ? ag.lossRatio / 100 : '-';
      row.getCell(11).value = ag.lossRatioEval.label;

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(7).numFmt = '#,##0';
      row.getCell(8).numFmt = '#,##0';
      row.getCell(9).numFmt = '#,##0';
      if (ag.lossRatio !== null) row.getCell(10).numFmt = '0.00%';
      row.getCell(10).alignment = { horizontal: 'right' };
      row.getCell(11).alignment = { horizontal: 'center' };

      row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ag.lossRatioEval.excelColor.bg } };
      row.getCell(10).font = { bold: true, color: { argb: ag.lossRatioEval.excelColor.text } };
      row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ag.lossRatioEval.excelColor.bg } };
      row.getCell(11).font = { bold: true, color: { argb: ag.lossRatioEval.excelColor.text } };

      for (let c = 1; c <= 11; c++) {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }
    });
  } else {
    // Role Non-Agent: Sheet 3 Kinerja Seluruh Agen
    const wsAllAgents = workbook.addWorksheet('Kinerja Agen');
    wsAllAgents.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

    wsAllAgents.mergeCells('A1:I1');
    wsAllAgents.getCell('A1').value = 'DAFTAR KINERJA PRODUKSI & LOSS RATIO AGEN';
    wsAllAgents.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };

    const agentListHeaders = [
      { header: 'Kode Agen', width: 14 },
      { header: 'Nama Lengkap Agen', width: 28 },
      { header: 'Peringkat', width: 18 },
      { header: 'Cabang', width: 22 },
      { header: 'Total Premi (IDR)', width: 22 },
      { header: 'Polis', width: 10 },
      { header: 'Total Klaim (IDR)', width: 22 },
      { header: 'Loss Ratio (%)', width: 18 },
      { header: 'Status Kesehatan', width: 18 },
    ];

    const alHeaderRow = wsAllAgents.getRow(3);
    alHeaderRow.height = 24;
    agentListHeaders.forEach((col, idx) => {
      const c = alHeaderRow.getCell(idx + 1);
      c.value = col.header;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      wsAllAgents.getColumn(idx + 1).width = col.width;
    });

    const agentRows = data.allAgentsPerformance && data.allAgentsPerformance.length > 0
      ? data.allAgentsPerformance
      : data.agentPerformance;

    agentRows.forEach((ag: any, idx: number) => {
      const row = wsAllAgents.getRow(4 + idx);
      row.height = 20;
      row.getCell(1).value = ag.agentCode;
      row.getCell(2).value = ag.agentName;
      row.getCell(3).value = ag.peringkat;
      row.getCell(4).value = ag.branchName;
      row.getCell(5).value = ag.premi;
      row.getCell(6).value = ag.policyCount;
      row.getCell(7).value = ag.claim;
      row.getCell(8).value = ag.lossRatio !== null ? ag.lossRatio / 100 : '-';
      row.getCell(9).value = ag.lossRatioEval.label;

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(5).numFmt = '#,##0';
      row.getCell(6).numFmt = '#,##0';
      row.getCell(7).numFmt = '#,##0';
      if (ag.lossRatio !== null) row.getCell(8).numFmt = '0.00%';
      row.getCell(8).alignment = { horizontal: 'right' };
      row.getCell(9).alignment = { horizontal: 'center' };

      row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ag.lossRatioEval.excelColor.bg } };
      row.getCell(8).font = { bold: true, color: { argb: ag.lossRatioEval.excelColor.text } };
      row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ag.lossRatioEval.excelColor.bg } };
      row.getCell(9).font = { bold: true, color: { argb: ag.lossRatioEval.excelColor.text } };

      for (let c = 1; c <= 9; c++) {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }
    });

    // Jika ada agen target yang difilter: Tambahkan Sheet 4 Personal Target dan Sheet 5 Group Target
    if (data.personalPerformance) {
      // SHEET 4: PERSONAL TARGET
      const wsTargetPers = workbook.addWorksheet('Kinerja Agen (Target)');
      wsTargetPers.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

      wsTargetPers.mergeCells('A1:I1');
      wsTargetPers.getCell('A1').value = `KINERJA PERSONAL TARGET: [${data.personalPerformance.agentCode}] ${data.personalPerformance.agentName}`;
      wsTargetPers.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FFD97706' } };

      const tpHeaderRow = wsTargetPers.getRow(3);
      tpHeaderRow.height = 24;
      agentListHeaders.forEach((col, idx) => {
        const c = tpHeaderRow.getCell(idx + 1);
        c.value = col.header;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        wsTargetPers.getColumn(idx + 1).width = col.width;
      });

      const p = data.personalPerformance;
      const pRow = wsTargetPers.getRow(4);
      pRow.height = 22;
      pRow.getCell(1).value = p.agentCode;
      pRow.getCell(2).value = p.agentName;
      pRow.getCell(3).value = p.peringkat;
      pRow.getCell(4).value = p.branchName;
      pRow.getCell(5).value = p.premi;
      pRow.getCell(6).value = p.policyCount;
      pRow.getCell(7).value = p.claim;
      pRow.getCell(8).value = p.lossRatio !== null ? p.lossRatio / 100 : '-';
      pRow.getCell(9).value = p.lossRatioEval.label;

      pRow.getCell(1).alignment = { horizontal: 'center' };
      pRow.getCell(5).numFmt = '#,##0';
      pRow.getCell(6).numFmt = '#,##0';
      pRow.getCell(7).numFmt = '#,##0';
      if (p.lossRatio !== null) pRow.getCell(8).numFmt = '0.00%';
      pRow.getCell(8).alignment = { horizontal: 'right' };
      pRow.getCell(9).alignment = { horizontal: 'center' };

      pRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.lossRatioEval.excelColor.bg } };
      pRow.getCell(8).font = { bold: true, color: { argb: p.lossRatioEval.excelColor.text } };
      pRow.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.lossRatioEval.excelColor.bg } };
      pRow.getCell(9).font = { bold: true, color: { argb: p.lossRatioEval.excelColor.text } };

      for (let c = 1; c <= 9; c++) {
        pRow.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }

      // SHEET 5: GROUP TARGET (TREEVIEW)
      const wsTargetGrp = workbook.addWorksheet('Kinerja Group (Target)');
      wsTargetGrp.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

      wsTargetGrp.mergeCells('A1:K1');
      wsTargetGrp.getCell('A1').value = `KINERJA GROUP TARGET (TREEVIEW): [${data.personalPerformance.agentCode}] ${data.personalPerformance.agentName}`;
      wsTargetGrp.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF4338CA' } };

      const tgHeaders = [
        { header: 'Kode Agen', width: 14 },
        { header: 'Nama Lengkap & Hirarki', width: 34 },
        { header: 'Upline Langsung (Direct)', width: 28 },
        { header: 'Peran & Level', width: 20 },
        { header: 'Peringkat', width: 18 },
        { header: 'Cabang', width: 22 },
        { header: 'Total Premi (IDR)', width: 22 },
        { header: 'Polis', width: 10 },
        { header: 'Total Klaim (IDR)', width: 22 },
        { header: 'Loss Ratio (%)', width: 18 },
        { header: 'Status Kesehatan', width: 18 },
      ];

      const tgHeaderRow = wsTargetGrp.getRow(3);
      tgHeaderRow.height = 24;
      tgHeaders.forEach((col, idx) => {
        const c = tgHeaderRow.getCell(idx + 1);
        c.value = col.header;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        wsTargetGrp.getColumn(idx + 1).width = col.width;
      });

      data.agentPerformance.forEach((ag: any, idx: number) => {
        const row = wsTargetGrp.getRow(4 + idx);
        row.height = 20;

        const isLeader = ag.isLeader || (data.personalPerformance && ag.agentCode === data.personalPerformance.agentCode);
        const prefix = isLeader ? '👑 ' : ag.relativeDepth ? '   '.repeat(ag.relativeDepth) + '↳ ' : '';

        row.getCell(1).value = ag.agentCode;
        row.getCell(2).value = `${prefix}${ag.agentName}`;
        row.getCell(3).value = isLeader
          ? '- (Root Leader)'
          : ag.uplineAgentCode
          ? `${ag.uplineAgentName || 'Upline'} (${ag.uplineAgentCode})`
          : '-';
        row.getCell(4).value = isLeader ? '👑 Leader Target' : `Level ${ag.relativeDepth || 1} Downline`;
        row.getCell(5).value = ag.peringkat;
        row.getCell(6).value = ag.branchName;
        row.getCell(7).value = ag.premi;
        row.getCell(8).value = ag.policyCount;
        row.getCell(9).value = ag.claim;
        row.getCell(10).value = ag.lossRatio !== null ? ag.lossRatio / 100 : '-';
        row.getCell(11).value = ag.lossRatioEval.label;

        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(7).numFmt = '#,##0';
        row.getCell(8).numFmt = '#,##0';
        row.getCell(9).numFmt = '#,##0';
        if (ag.lossRatio !== null) row.getCell(10).numFmt = '0.00%';
        row.getCell(10).alignment = { horizontal: 'right' };
        row.getCell(11).alignment = { horizontal: 'center' };

        row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ag.lossRatioEval.excelColor.bg } };
        row.getCell(10).font = { bold: true, color: { argb: ag.lossRatioEval.excelColor.text } };
        row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ag.lossRatioEval.excelColor.bg } };
        row.getCell(11).font = { bold: true, color: { argb: ag.lossRatioEval.excelColor.text } };

        for (let c = 1; c <= 11; c++) {
          row.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        }
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 4: TOP PENYEBAB KLAIM (CAUSE OF LOSS)
  // ══════════════════════════════════════════════════════════════════════════════
  const wsCause = workbook.addWorksheet('Penyebab Klaim');
  wsCause.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

  wsCause.mergeCells('A1:E1');
  wsCause.getCell('A1').value = 'ANALISIS TOP PENYEBAB KLAIM (CAUSE OF LOSS)';
  wsCause.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };

  const causeHeaders = [
    { header: 'Penyebab Klaim (Cause of Loss)', width: 34 },
    { header: 'Jumlah Kasus', width: 14 },
    { header: 'Total Klaim (IDR)', width: 24 },
    { header: '% Kontribusi', width: 16 },
    { header: 'Rata-rata per Kasus (IDR)', width: 24 },
  ];

  const cHeaderRow = wsCause.getRow(3);
  cHeaderRow.height = 24;
  causeHeaders.forEach((col, idx) => {
    const c = cHeaderRow.getCell(idx + 1);
    c.value = col.header;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    wsCause.getColumn(idx + 1).width = col.width;
  });

  data.topCausesOfLoss.forEach((cause, idx) => {
    const row = wsCause.getRow(4 + idx);
    row.height = 20;
    row.getCell(1).value = cause.cause;
    row.getCell(2).value = cause.claimCount;
    row.getCell(3).value = cause.claim;
    row.getCell(4).value = cause.pctOfTotal / 100;
    row.getCell(5).value = cause.averagePerClaim;

    row.getCell(2).numFmt = '#,##0';
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).numFmt = '0.0%';
    row.getCell(5).numFmt = '#,##0';

    for (let c = 1; c <= 5; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
