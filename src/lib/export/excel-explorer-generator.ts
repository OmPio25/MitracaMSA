import ExcelJS from 'exceljs';
import { formatDate } from '@/lib/utils';

export async function generatePoliciesExcelWorkbook(policies: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MitracaMSA Agency Management';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Daftar Polis', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  // Header Title
  worksheet.mergeCells('A1:Q1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DATA EKSPLORASI DETAIL POLIS ASURANSI (MITRACA-MSA)';
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Deep Blue
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 28;

  // Columns definition
  worksheet.getRow(2).values = [
    'No. Polis',
    'No. SPAU',
    'Status Polis',
    'Periode Akuntansi',
    'Tanggal Terbit',
    'Mulai Polis',
    'Akhir Polis',
    'Nama Tertanggung',
    'Produk',
    'Coverage',
    'TSI (IDR)',
    'Nilai Premi (IDR)',
    'Nilai Komisi (IDR)',
    'Kode Agen',
    'Nama Agen',
    'Cabang',
    'Objek 1 (Kendaraan/Item)',
    'Objek 6 (No. Polisi/Plat)',
  ];

  const headerRow = worksheet.getRow(2);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  worksheet.columns = [
    { width: 24 }, // No Polis
    { width: 18 }, // No SPAU
    { width: 14 }, // Status
    { width: 16 }, // Periode
    { width: 14 }, // Terbit
    { width: 14 }, // Mulai
    { width: 14 }, // Akhir
    { width: 28 }, // Tertanggung
    { width: 18 }, // Produk
    { width: 22 }, // Coverage
    { width: 18 }, // TSI
    { width: 18 }, // Premi
    { width: 16 }, // Komisi
    { width: 14 }, // Kode Agen
    { width: 24 }, // Nama Agen
    { width: 20 }, // Cabang
    { width: 22 }, // Objek 1
    { width: 18 }, // Objek 6
  ];

  // Populate data
  policies.forEach((p, idx) => {
    const rowNum = idx + 3;
    const row = worksheet.getRow(rowNum);

    const objDetails = (p.objectDetails as Record<string, any>) || {};
    const obj1 = objDetails['object_1'] || objDetails['object_name'] || '-';
    const obj6 = objDetails['object_6'] || objDetails['license_plate'] || '-';

    row.values = [
      p.policyNo || '-',
      p.spauNo || '-',
      p.policyStatus || '-',
      p.period || p.bulan || '-',
      formatDate(p.issueDate),
      formatDate(p.startPeriod),
      formatDate(p.endPeriod),
      p.insuredName || '-',
      p.product || '-',
      p.coverage || '-',
      parseFloat(p.tsiInIdr || p.tsi || '0'),
      parseFloat(p.nilaiPremi || '0'),
      parseFloat(p.nilaiKomisi || '0'),
      p.sourceAgentId || p.agentRealCode || '-',
      p.agentName || p.agentRealName || '-',
      p.branchName || p.rawBranch || '-',
      String(obj1),
      String(obj6),
    ];

    row.height = 20;

    // Number formatting
    row.getCell(10).numFmt = '#,##0.00';
    row.getCell(11).numFmt = '#,##0.00';
    row.getCell(12).numFmt = '#,##0.00';

    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      };
    });

    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateClaimsExcelWorkbook(claimsList: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MitracaMSA Agency Management';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Daftar Klaim', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  // Header Title
  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DATA EKSPLORASI DETAIL KLAIM ASURANSI (MITRACA-MSA)';
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF991B1B' }, // Deep Red
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 28;

  // Columns definition
  worksheet.getRow(2).values = [
    'No. Klaim',
    'No. Polis Terkait',
    'Tanggal Settlement',
    'UW Year',
    'Periode Akuntansi',
    'Gross Claim (IDR)',
    'Indemnity (IDR)',
    'Deductible (IDR)',
    'Sebab Klaim (Cause of Loss)',
    'Nama Produk',
    'Kode Agen',
    'Nama Agen',
    'Cabang',
  ];

  const headerRow = worksheet.getRow(2);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  worksheet.columns = [
    { width: 24 }, // No Klaim
    { width: 24 }, // No Polis
    { width: 16 }, // Tanggal Settlement
    { width: 12 }, // UW Year
    { width: 16 }, // Periode
    { width: 20 }, // Gross Claim
    { width: 18 }, // Indemnity
    { width: 16 }, // Deductible
    { width: 30 }, // Cause of Loss
    { width: 20 }, // Nama Produk
    { width: 14 }, // Kode Agen
    { width: 24 }, // Nama Agen
    { width: 20 }, // Cabang
  ];

  // Populate data
  claimsList.forEach((c, idx) => {
    const rowNum = idx + 3;
    const row = worksheet.getRow(rowNum);

    row.values = [
      c.claimNo || '-',
      c.policyNo || '-',
      formatDate(c.dateOfSettlement),
      c.uwYear || '-',
      c.period || '-',
      parseFloat(c.grossClaim || '0'),
      parseFloat(c.indemnity || '0'),
      parseFloat(c.deductible || '0'),
      c.causeOfLoss || '-',
      c.namaProduk && c.namaProduk !== '[object Object]' ? c.namaProduk : '-',
      c.sourceAgentId || c.agentRealCode || '-',
      c.agentRealName || '-',
      c.branchName || c.rawBranch || '-',
    ];

    row.height = 20;

    // Number formatting
    row.getCell(6).numFmt = '#,##0.00';
    row.getCell(7).numFmt = '#,##0.00';
    row.getCell(8).numFmt = '#,##0.00';

    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      };
    });

    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
