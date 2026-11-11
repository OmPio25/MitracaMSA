import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalyticsExportData } from './excel-analytics-generator';

/**
 * Format mata uang Rupiah standar Indonesia
 */
function formatIDR(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(val || 0);
}

/**
 * Menggambar panah siku (corner arrow '↳') secara vektor murni
 * Menghindari encoding glitch pada font bawaan PDF (Helvetica).
 */
function drawCornerArrow(doc: jsPDF, x: number, y: number, size = 1.8) {
  doc.setDrawColor(100, 116, 139); // Slate 500
  doc.setLineWidth(0.3);
  // Garis vertikal: dari atas ke siku
  doc.line(x, y - size, x, y);
  // Garis horizontal: dari siku ke kanan
  doc.line(x, y, x + size, y);
  // Kepala panah kecil di ujung kanan
  doc.line(x + size - 0.6, y - 0.6, x + size, y);
  doc.line(x + size - 0.6, y + 0.6, x + size, y);
}

/**
 * Generator Laporan Eksekutif PDF untuk Modul Analitik & Loss Ratio
 * Menghasilkan file PDF Landscape A4 resmi dengan format siap cetak.
 */
export async function generateAnalyticsPdf(data: AnalyticsExportData): Promise<Buffer> {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. KOP SURAT / DOKUMEN HEADER
  // ══════════════════════════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // Navy 900
  doc.text('MITRACAMSA — EXECUTIVE ANALYTICS & LOSS RATIO REPORT', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(
    'Sistem Pemantauan Risiko Underwriting, Rasio Klaim & Portofolio Bisnis Keagenan',
    margin,
    17.5
  );

  // Metadata Bar (Periode, Cabang, Target, Waktu Cetak)
  const exportTime = new Date().toLocaleString('id-ID');
  const targetAgentText = data.filterInfo.agentCode
    ? `Target: [${data.filterInfo.agentCode}]`
    : 'Target: Semua Agen';
  const branchText = `Cabang: ${data.filterInfo.branchName || 'Nasional'}`;
  const periodText = `Periode: ${data.filterInfo.cutoffLabel} (${data.filterInfo.dateRange})`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.text(`${periodText}   |   ${branchText}   |   ${targetAgentText}   |   Waktu Cetak: ${exportTime}`, margin, 22.5);

  // Garis Pembatas Header
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.4);
  doc.line(margin, 25, pageWidth - margin, 25);

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. KARTU RINGKASAN KPI EKSEKUTIF (5 KOTAK METRIK UTAMA)
  // ══════════════════════════════════════════════════════════════════════════════
  const cardY = 28;
  const cardHeight = 19;
  const cardGap = 3;
  const cardCount = 5;
  const cardWidth = (contentWidth - cardGap * (cardCount - 1)) / cardCount;

  const kpiCards = [
    {
      title: 'TOTAL PREMI BRUTO',
      value: `Rp ${formatIDR(data.kpi.totalPremi)}`,
      sub: `${data.kpi.totalPolicies} Polis Aktif`,
      color: [30, 58, 138], // Navy
      bg: [239, 246, 255],  // Blue 50
      border: [191, 219, 254], // Blue 200
    },
    {
      title: 'TOTAL BEBAN KLAIM',
      value: `Rp ${formatIDR(data.kpi.totalClaim)}`,
      sub: `${data.kpi.totalClaimsCount} Kasus Klaim`,
      color: [190, 18, 60], // Rose
      bg: [255, 241, 242],  // Rose 50
      border: [254, 205, 211], // Rose 200
    },
    {
      title: 'LOSS RATIO & EVALUASI',
      value: data.kpi.lossRatioEval.ratioFormatted,
      sub: data.kpi.lossRatioEval.label,
      color: data.kpi.lossRatioEval.pdfColor.text,
      bg: data.kpi.lossRatioEval.pdfColor.bg,
      border: [203, 213, 225],
    },
    {
      title: 'NET UNDERWRITING MARGIN',
      value: `Rp ${formatIDR(data.kpi.netMargin)}`,
      sub: 'Premi - Klaim - Komisi',
      color: data.kpi.netMargin >= 0 ? [15, 118, 110] : [190, 18, 60],
      bg: data.kpi.netMargin >= 0 ? [240, 253, 250] : [255, 241, 242],
      border: [203, 213, 225],
    },
    {
      title: 'TOTAL KOMISI AGENSI',
      value: `Rp ${formatIDR(data.kpi.totalKomisi)}`,
      sub: 'Beban Akuisisi Agensi',
      color: [100, 116, 139],
      bg: [248, 250, 252],
      border: [226, 232, 240],
    },
  ];

  kpiCards.forEach((c, idx) => {
    const x = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Judul Kartu
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title, x + 3, cardY + 4.5);

    // Nilai Utama
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 3, cardY + 11);

    // Sub-keterangan
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(c.sub, x + 3, cardY + 16);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. BARIS AMBANG BATAS UNDERWRITING (LOSS RATIO BENCHMARK LEGEND)
  // ══════════════════════════════════════════════════════════════════════════════
  const legendY = cardY + cardHeight + 3;
  const legendHeight = 6.5;

  // Background box pembungkus
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, legendY, contentWidth, legendHeight, 1.2, 1.2, 'FD');

  // Label Judul Ambang Batas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.text('Ambang Batas Underwriting:', margin + 3.5, legendY + 4.3);

  const itemY = legendY + 1.2;
  const badgeH = 4.1;
  const circleY = legendY + 3.25;

  // 1. Status Sehat (Hijau)
  const sehatX = margin + 45;
  const sehatW = 34;
  doc.setFillColor(209, 250, 229); // Emerald 100
  doc.roundedRect(sehatX, itemY, sehatW, badgeH, 0.8, 0.8, 'F');
  // Lingkaran Vektor Hijau
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.circle(sehatX + 3.2, circleY, 1.1, 'F');
  // Teks Ringkas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text('Sehat: LR < 35,00%', sehatX + 6, legendY + 4.2);

  // 2. Status Waspada (Amber)
  const waspadaX = sehatX + sehatW + 4;
  const waspadaW = 36;
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.roundedRect(waspadaX, itemY, waspadaW, badgeH, 0.8, 0.8, 'F');
  // Lingkaran Vektor Amber
  doc.setFillColor(245, 158, 11); // Amber 500
  doc.circle(waspadaX + 3.2, circleY, 1.1, 'F');
  // Teks Ringkas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(120, 53, 15); // Amber 800
  doc.text('Waspada: LR = 35,00%', waspadaX + 6, legendY + 4.2);

  // 3. Status Kritis (Merah/Rose)
  const kritisX = waspadaX + waspadaW + 4;
  const kritisW = 34;
  doc.setFillColor(255, 228, 230); // Rose 100
  doc.roundedRect(kritisX, itemY, kritisW, badgeH, 0.8, 0.8, 'F');
  // Lingkaran Vektor Merah
  doc.setFillColor(225, 29, 72); // Rose 600
  doc.circle(kritisX + 3.2, circleY, 1.1, 'F');
  // Teks Ringkas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(190, 18, 60); // Rose 800
  doc.text('Kritis: LR > 35,00%', kritisX + 6, legendY + 4.2);

  // Ruang jarak seragam (8mm) antara info ambang batas dan judul tabel pertama
  let currentY = legendY + legendHeight + 8;

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. TABEL-TABEL DETAIL ANALITIK
  // ══════════════════════════════════════════════════════════════════════════════

  // Footer helper callback untuk seluruh halaman
  const drawPageFooter = () => {
    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    const totalPages = (doc as any).internal.getNumberOfPages();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(148, 163, 184);

    doc.text(
      'MitracaMSA Business Intelligence & Loss Ratio Monitoring System · Dokumen Rahasia Perusahaan (Confidential)',
      margin,
      pageHeight - 6
    );

    doc.text(
      `Halaman ${pageNumber} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );
  };

  // ── A. ROLE AGEN: TABEL PERSONAL & TABEL GROUP ──────────────────────────────
  if (data.isAgentRole) {
    // 1. Box Kinerja Personal (Ringkas 5 Kolom Konsisten dengan UI Web)
    if (data.personalPerformance) {
      const p = data.personalPerformance;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text('1. PORTOFOLIO KINERJA PRIBADI (PERSONAL)', margin, currentY);
      currentY += 3;

      autoTable(doc, {
        startY: currentY,
        tableWidth: contentWidth,
        margin: { left: margin, right: margin, bottom: 12 },
        head: [
          [
            'Profil Agen Pribadi',
            'Peringkat & Cabang',
            'Total Premi (Polis)',
            'Total Klaim (Kasus)',
            'Loss Ratio & Status',
          ],
        ],
        body: [
          [
            `${p.agentName}\nKode: ${p.agentCode} • Portofolio Pribadi Anda`,
            `${p.peringkat || '-'}\n${p.branchName || '-'}`,
            `Rp ${formatIDR(p.premi)}\n${p.policyCount} Polis Aktif`,
            `Rp ${formatIDR(p.claim)}\n${p.claimCount} Kasus Klaim`,
            `${p.lossRatioEval.ratioFormatted}\n${p.lossRatioEval.label}`,
          ],
        ],
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.2,
          cellPadding: 2.2,
          valign: 'middle',
          lineColor: [226, 232, 240],
        },
        headStyles: {
          fillColor: [217, 119, 6], // Amber 600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 8,
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 85 },
          1: { halign: 'left', cellWidth: 46 },
          2: { halign: 'right', cellWidth: 46 },
          3: { halign: 'right', cellWidth: 46 },
          4: { halign: 'center', cellWidth: 46 },
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 4) {
            cellData.cell.styles.fillColor = p.lossRatioEval.pdfColor.bg;
            cellData.cell.styles.textColor = p.lossRatioEval.pdfColor.text;
            cellData.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawPage: drawPageFooter,
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 2. Tabel Kinerja Group (Hierarki TreeView ↳ Ringkas 5 Kolom)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text(`2. KINERJA GROUP KEAGENAN (LEADER & DOWNLINE) — ${data.agentPerformance.length} AGEN`, margin, currentY);
    currentY += 3;

    const groupBody = data.agentPerformance.map((ag) => {
      const isLeader = ag.isLeader || (data.personalPerformance && ag.agentCode === data.personalPerformance.agentCode);
      const depth = ag.relativeDepth || 0;

      let col0Line1 = '';
      let col0Line2 = '';

      if (isLeader) {
        col0Line1 = `${ag.agentName}  [Leader (Anda)]`;
        col0Line2 = `Kode: ${ag.agentCode} • Root Leader Jaringan`;
      } else {
        const spaces = '    '.repeat(depth);
        const upline = ag.uplineAgentCode
          ? `${ag.uplineAgentName || 'Upline'} (${ag.uplineAgentCode})`
          : 'Upline Terdaftar';
        const activityTag = (!ag.premi && !ag.claim) ? ' (Jembatan Hirarki)' : '';
        col0Line1 = `${spaces}${ag.agentName}  [Level ${depth}]${activityTag}`;
        col0Line2 = `${spaces}Kode: ${ag.agentCode} • Upline: ${upline}`;
      }

      return [
        `${col0Line1}\n${col0Line2}`,
        `${ag.peringkat || '-'}\n${ag.branchName || '-'}`,
        `Rp ${formatIDR(ag.premi)}\n${ag.policyCount} Polis Aktif`,
        `Rp ${formatIDR(ag.claim)}\n${ag.claimCount} Kasus Klaim`,
        `${ag.lossRatioEval.ratioFormatted}\n${ag.lossRatioEval.label}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      tableWidth: contentWidth,
      margin: { left: margin, right: margin, bottom: 12 },
      head: [
        [
          'Agen & Silsilah Jaringan',
          'Peringkat & Cabang',
          'Total Premi (Polis)',
          'Total Klaim (Kasus)',
          'Loss Ratio & Status',
        ],
      ],
      body: groupBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 2,
        valign: 'middle',
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 85 },
        1: { halign: 'left', cellWidth: 46 },
        2: { halign: 'right', cellWidth: 46 },
        3: { halign: 'right', cellWidth: 46 },
        4: { halign: 'center', cellWidth: 46 },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index < data.agentPerformance.length) {
          const item = data.agentPerformance[cellData.row.index];
          const isLeader = item.isLeader || (data.personalPerformance && item.agentCode === data.personalPerformance.agentCode);

          if (isLeader) {
            cellData.cell.styles.fillColor = [254, 249, 235]; // Highlight baris Leader dengan amber lembut
          }

          if (cellData.column.index === 4) {
            cellData.cell.styles.fillColor = item.lossRatioEval.pdfColor.bg;
            cellData.cell.styles.textColor = item.lossRatioEval.pdfColor.text;
            cellData.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 0 && cellData.row.index < data.agentPerformance.length) {
          const item = data.agentPerformance[cellData.row.index];
          const isLeader = item.isLeader || (data.personalPerformance && item.agentCode === data.personalPerformance.agentCode);
          const depth = item.relativeDepth || 0;

          if (!isLeader && depth > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            const prefixBeforeArrow = '    '.repeat(depth - 1);
            const prefixWidth = doc.getTextWidth(prefixBeforeArrow);
            const arrowX = cellData.cell.x + 2.0 + prefixWidth + 0.3;
            const arrowY = cellData.cell.y + 3.8;
            drawCornerArrow(doc, arrowX, arrowY, 1.8);
          }
        }
      },
      didDrawPage: drawPageFooter,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  } else {
    // ── B. ROLE NON-AGENT: TABEL CABANG & TABEL AGEN NASIONAL / CABANG ─────────

    // 1. Tabel Kinerja Cabang (Ringkas 4 Kolom Konsisten dengan UI Web)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text(`1. KINERJA PRODUKSI & LOSS RATIO CABANG — ${data.branchPerformance.length} CABANG`, margin, currentY);
    currentY += 3;

    const branchBody = data.branchPerformance.map((b) => [
      `${b.branchName}\nKode Cabang: ${b.branchCode}`,
      `Rp ${formatIDR(b.premi)}\n${b.policyCount} Polis Aktif`,
      `Rp ${formatIDR(b.claim)}\n${b.claimCount} Kasus Klaim`,
      `${b.lossRatioEval.ratioFormatted}\n${b.lossRatioEval.label}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      tableWidth: contentWidth,
      margin: { left: margin, right: margin, bottom: 12 },
      head: [
        [
          'Cabang & Wilayah',
          'Total Premi (Polis)',
          'Total Klaim (Kasus)',
          'Loss Ratio & Status',
        ],
      ],
      body: branchBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.2,
        cellPadding: 2.2,
        valign: 'middle',
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 95 },
        1: { halign: 'right', cellWidth: 58 },
        2: { halign: 'right', cellWidth: 58 },
        3: { halign: 'center', cellWidth: 58 },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index < data.branchPerformance.length) {
          const item = data.branchPerformance[cellData.row.index];
          if (cellData.column.index === 3) {
            cellData.cell.styles.fillColor = item.lossRatioEval.pdfColor.bg;
            cellData.cell.styles.textColor = item.lossRatioEval.pdfColor.text;
            cellData.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawPage: drawPageFooter,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 2. Tabel Kinerja Seluruh Agen (Ringkas 5 Kolom Konsisten dengan UI Web)
    const agentList = data.allAgentsPerformance && data.allAgentsPerformance.length > 0
      ? data.allAgentsPerformance
      : data.agentPerformance;

    // Jika tabel berikutnya akan terlalu mepet ke bawah, tambah halaman baru
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text(`2. DAFTAR KINERJA PRODUKSI & LOSS RATIO AGEN (${agentList.length} AGEN)`, margin, currentY);
    currentY += 3;

    const agentListBody = agentList.map((ag) => [
      `${ag.agentName}\nKode: ${ag.agentCode}`,
      `${ag.peringkat || '-'}\n${ag.branchName || '-'}`,
      `Rp ${formatIDR(ag.premi)}\n${ag.policyCount} Polis Aktif`,
      `Rp ${formatIDR(ag.claim)}\n${ag.claimCount} Kasus Klaim`,
      `${ag.lossRatioEval.ratioFormatted}\n${ag.lossRatioEval.label}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      tableWidth: contentWidth,
      margin: { left: margin, right: margin, bottom: 12 },
      head: [
        [
          'Profil Agen',
          'Peringkat & Cabang',
          'Total Premi (Polis)',
          'Total Klaim (Kasus)',
          'Loss Ratio & Status',
        ],
      ],
      body: agentListBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 2,
        valign: 'middle',
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 85 },
        1: { halign: 'left', cellWidth: 46 },
        2: { halign: 'right', cellWidth: 46 },
        3: { halign: 'right', cellWidth: 46 },
        4: { halign: 'center', cellWidth: 46 },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index < agentList.length) {
          const item = agentList[cellData.row.index];
          if (cellData.column.index === 4) {
            cellData.cell.styles.fillColor = item.lossRatioEval.pdfColor.bg;
            cellData.cell.styles.textColor = item.lossRatioEval.pdfColor.text;
            cellData.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawPage: drawPageFooter,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 3. Jika ada Target Agen yang difilter: Tampilkan Group Target TreeView (Ringkas 5 Kolom + Vektor ↳)
    if (data.personalPerformance && data.agentPerformance.length > 0) {
      if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(67, 56, 202); // Indigo 700
      doc.text(
        `3. SILSILAH JARINGAN GROUP TARGET: [${data.personalPerformance.agentCode}] ${data.personalPerformance.agentName} (${data.agentPerformance.length} DOWNLINE)`,
        margin,
        currentY
      );
      currentY += 3;

      const targetGroupBody = data.agentPerformance.map((ag) => {
        const isLeader = ag.isLeader || (data.personalPerformance && ag.agentCode === data.personalPerformance.agentCode);
        const depth = ag.relativeDepth || 0;

        let col0Line1 = '';
        let col0Line2 = '';

        if (isLeader) {
          col0Line1 = `${ag.agentName}  [Leader Target]`;
          col0Line2 = `Kode: ${ag.agentCode} • Root Leader Jaringan`;
        } else {
          const spaces = '    '.repeat(depth);
          const upline = ag.uplineAgentCode
            ? `${ag.uplineAgentName || 'Upline'} (${ag.uplineAgentCode})`
            : 'Upline Terdaftar';
          const activityTag = (!ag.premi && !ag.claim) ? ' (Jembatan Hirarki)' : '';
          col0Line1 = `${spaces}${ag.agentName}  [Level ${depth}]${activityTag}`;
          col0Line2 = `${spaces}Kode: ${ag.agentCode} • Upline: ${upline}`;
        }

        return [
          `${col0Line1}\n${col0Line2}`,
          `${ag.peringkat || '-'}\n${ag.branchName || '-'}`,
          `Rp ${formatIDR(ag.premi)}\n${ag.policyCount} Polis Aktif`,
          `Rp ${formatIDR(ag.claim)}\n${ag.claimCount} Kasus Klaim`,
          `${ag.lossRatioEval.ratioFormatted}\n${ag.lossRatioEval.label}`,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        tableWidth: contentWidth,
        margin: { left: margin, right: margin, bottom: 12 },
        head: [
          [
            'Agen & Silsilah Jaringan',
            'Peringkat & Cabang',
            'Total Premi (Polis)',
            'Total Klaim (Kasus)',
            'Loss Ratio & Status',
          ],
        ],
        body: targetGroupBody,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7,
          cellPadding: 2,
          valign: 'middle',
          lineColor: [226, 232, 240],
        },
        headStyles: {
          fillColor: [67, 56, 202], // Indigo 700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 8,
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 85 },
          1: { halign: 'left', cellWidth: 46 },
          2: { halign: 'right', cellWidth: 46 },
          3: { halign: 'right', cellWidth: 46 },
          4: { halign: 'center', cellWidth: 46 },
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.row.index < data.agentPerformance.length) {
            const item = data.agentPerformance[cellData.row.index];
            const isLeader = item.isLeader || (data.personalPerformance && item.agentCode === data.personalPerformance.agentCode);

            if (isLeader) {
              cellData.cell.styles.fillColor = [238, 242, 255]; // Highlight Leader Target dengan indigo lembut
            }

            if (cellData.column.index === 4) {
              cellData.cell.styles.fillColor = item.lossRatioEval.pdfColor.bg;
              cellData.cell.styles.textColor = item.lossRatioEval.pdfColor.text;
              cellData.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 0 && cellData.row.index < data.agentPerformance.length) {
            const item = data.agentPerformance[cellData.row.index];
            const isLeader = item.isLeader || (data.personalPerformance && item.agentCode === data.personalPerformance.agentCode);
            const depth = item.relativeDepth || 0;

            if (!isLeader && depth > 0) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              const prefixBeforeArrow = '    '.repeat(depth - 1);
              const prefixWidth = doc.getTextWidth(prefixBeforeArrow);
              const arrowX = cellData.cell.x + 2.0 + prefixWidth + 0.3;
              const arrowY = cellData.cell.y + 3.8;
              drawCornerArrow(doc, arrowX, arrowY, 1.8);
            }
          }
        },
        didDrawPage: drawPageFooter,
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // ── C. TABEL ANALISIS TOP PENYEBAB KLAIM (CAUSE OF LOSS) ────────────────────
  if (data.topCausesOfLoss && data.topCausesOfLoss.length > 0) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    const sectionIndex = data.isAgentRole ? '3' : data.personalPerformance ? '4' : '3';
    doc.text(`${sectionIndex}. ANALISIS TOP PENYEBAB KLAIM (CAUSE OF LOSS)`, margin, currentY);
    currentY += 3;

    const causesBody = data.topCausesOfLoss.map((c) => [
      c.cause,
      c.claimCount.toString(),
      formatIDR(c.claim),
      `${c.pctOfTotal.toFixed(1)}%`,
      formatIDR(c.averagePerClaim),
    ]);

    autoTable(doc, {
      startY: currentY,
      tableWidth: contentWidth,
      margin: { left: margin, right: margin, bottom: 12 },
      head: [
        [
          'Penyebab Klaim (Cause of Loss)',
          'Kasus Klaim',
          'Total Beban Klaim (IDR)',
          '% Kontribusi',
          'Rata-rata per Kasus (IDR)',
        ],
      ],
      body: causesBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.2,
        cellPadding: 1.8,
        valign: 'middle',
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 95 },
        1: { halign: 'center', cellWidth: 26 },
        2: { halign: 'right', cellWidth: 58 },
        3: { halign: 'right', cellWidth: 32 },
        4: { halign: 'right', cellWidth: 58 },
      },
      didDrawPage: drawPageFooter,
    });
  }

  // Generate buffer
  const buffer = doc.output('arraybuffer');
  return Buffer.from(buffer);
}