import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HierarchyNode } from '@/app/api/hierarchy/route';
import { flattenHierarchyTree } from './excel-hierarchy-generator';

export const LEVEL_PDF_COLORS: Record<number, { bg: [number, number, number]; text: [number, number, number]; label: string }> = {
  0: { bg: [224, 231, 255], text: [30, 27, 75], label: 'Root Agensi' },       // Indigo 100 / Indigo 950
  1: { bg: [224, 242, 254], text: [12, 74, 110], label: 'Level 1' },           // Sky 100 / Sky 900
  2: { bg: [254, 243, 199], text: [120, 53, 15], label: 'Level 2' },           // Amber 100 / Amber 900
  3: { bg: [255, 228, 230], text: [136, 19, 55], label: 'Level 3' },           // Rose 100 / Rose 900
  4: { bg: [243, 232, 255], text: [88, 28, 135], label: 'Level 4' },           // Purple 100 / Purple 900
  5: { bg: [204, 251, 241], text: [19, 78, 74], label: 'Level 5' },            // Teal 100 / Teal 900
  6: { bg: [255, 237, 213], text: [124, 45, 18], label: 'Level 6' },           // Orange 100 / Orange 900
  7: { bg: [241, 245, 249], text: [51, 65, 85], label: 'Level 7+' },          // Slate 100 / Slate 700
};

/**
 * Menggambar corner arrow ('↳') secara vektor murni presisi tinggi
 * Bebas dari font encoding glitch pada font Helvetica bawaan jsPDF.
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

export function exportHierarchyToPDF(
  tree: HierarchyNode[],
  options: {
    mode: string;
    agentCode?: string;
    branch?: string;
  }
) {
  // Landscape A4: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Document Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // Navy blue
  doc.text('MITRACAMSA — LAPORAN STRUKTUR HIRARKI AGENSI', 14, 13);

  // Subtitle / Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  const exportTime = new Date().toLocaleString('id-ID');
  const branchInfo = options.branch ? `   |   Cabang: ${options.branch}` : '';
  doc.text(
    `Mode: ${options.mode}${branchInfo}   |   Target: ${options.agentCode || 'Semua'}   |   Waktu Ekspor: ${exportTime}`,
    14,
    18
  );

  // Decorative header line (269 mm full printable width)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 20.5, pageWidth - 14, 20.5);

  // 2. Color Legend (Keterangan Warna Level)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('Keterangan Warna Level:', 14, 25);

  const legendItems = [
    { level: 0, text: 'Root' },
    { level: 1, text: 'Level 1' },
    { level: 2, text: 'Level 2' },
    { level: 3, text: 'Level 3' },
    { level: 4, text: 'Level 4' },
    { level: 5, text: 'Level 5' },
    { level: 6, text: 'Level 6+' },
  ];

  let legendX = 48;
  legendItems.forEach((lg) => {
    const col = LEVEL_PDF_COLORS[lg.level];
    const itemWidth = 18;
    const itemHeight = 4.5;

    // Draw background badge
    doc.setFillColor(col.bg[0], col.bg[1], col.bg[2]);
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.2);
    doc.roundedRect(legendX, 22, itemWidth, itemHeight, 1, 1, 'FD');

    if (lg.level === 0) {
      // Gambar lingkaran hitam vektor murni (Mencegah glitch %I pada font Helvetica)
      doc.setFillColor(30, 27, 75); // Dark Indigo
      doc.circle(legendX + 4.5, 24.25, 1.1, 'F');

      // Teks label di sebelah lingkaran
      doc.setTextColor(col.text[0], col.text[1], col.text[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('Root', legendX + 7.2, 25.2, { align: 'left' });
    } else {
      // Draw text inside badge
      doc.setTextColor(col.text[0], col.text[1], col.text[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(lg.text, legendX + itemWidth / 2, 25.2, { align: 'center' });
    }

    legendX += itemWidth + 2.5;
  });

  // Flatten nodes preserving hierarchy traversal
  const flatNodes = flattenHierarchyTree(tree);

  let totalPremi = 0;
  let totalPolis = 0;

  // 3. Format Data untuk 7 Kolom Diringkas
  const bodyData = flatNodes.map((node) => {
    const numPremi = parseFloat(node.totalProduction || '0');
    totalPremi += numPremi;
    totalPolis += Number(node.policyCount || 0);

    const formattedPremi = new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0,
    }).format(numPremi);

    // Col 0: Teks indentasi untuk nama agen
    // Level 0: 6 spasi (jarak aman ~1.97mm dari lingkaran hitam agar tidak menempel)
    // Level 1: 6 spasi (jarak tepat 1.57mm dari corner arrow)
    // Level N: 6 + (N - 1) * 5 spasi (sinkron linier 1:1 menjaga gap konstan 1.57mm di semua kedalaman level)
    const spaceCount = node.level === 0 ? 6 : 6 + (node.level - 1) * 5;
    const indentSpaces = ' '.repeat(spaceCount);
    const agentDisplay = `${indentSpaces}[${node.agentCode}] ${node.name}`;

    // Col 1: Level Badge Text
    const levelBadge = node.level === 0 ? 'Root' : `Level ${node.level}`;

    // Col 2: Peringkat & Ruang Baris untuk Badge Status Vektor
    const peringkatStatus = `${node.peringkat || 'Agent'}\n `;

    // Col 3: Upline & Status Hirarki (Multibaris)
    let uplineInfo = '-';
    if (node.level === 0) {
      uplineInfo = 'Root Agensi\n(Puncak Pohon)';
    } else if (node.uplineStatus === 'PENDING_UPLINE') {
      uplineInfo = `${node.uplineAgentCode || 'N/A'}\n(Pending Upline)`;
    } else {
      uplineInfo = `${node.uplineAgentCode || '-'}\n(Terhubung)`;
    }

    // Col 4: Cabang
    const cabang = node.rawBranchName || '-';

    // Col 5: Produksi Premi & Jumlah Polis (Multibaris)
    const produksiInfo = `Rp ${formattedPremi}\n${node.policyCount || 0} Polis MM`;

    // Col 6: Downline
    const downline = `${node.downlinesCount} Agen`;

    return [
      agentDisplay,
      levelBadge,
      peringkatStatus,
      uplineInfo,
      cabang,
      produksiInfo,
      downline,
    ];
  });

  // Summary Row (7 Kolom)
  const formattedTotalPremi = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(totalPremi);

  const summaryRow = [
    'TOTAL KESELURUHAN',
    '',
    `${flatNodes.length} Total Agen`,
    '',
    '',
    `Rp ${formattedTotalPremi}\n${totalPolis} Polis MM`,
    `${flatNodes.length} Agen`,
  ];

  // 4. AutoTable Render (Full Page Width: Tepat 269mm = 86 + 18 + 36 + 32 + 35 + 40 + 22)
  autoTable(doc, {
    startY: 28.5,
    margin: { left: 14, right: 14, top: 28.5, bottom: 15 },
    rowPageBreak: 'avoid',
    head: [
      [
        'STRUKTUR HIRARKI AGEN',
        'Level',
        'Peringkat & Status',
        'Upline & Hirarki',
        'Cabang',
        'Produksi Premi MM',
        'Downline',
      ],
    ],
    body: [...bodyData, summaryRow],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 58, 138], // Navy blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 86 },   // Struktur Hirarki + Corner Arrow (86mm)
      1: { halign: 'center', cellWidth: 18, fontStyle: 'bold' }, // Level (18mm)
      2: { halign: 'center', cellWidth: 36, valign: 'top' }, // Peringkat & Status (36mm) - valign top menjaga teks peringkat di atas dan badge di bawah
      3: { halign: 'center', cellWidth: 32 }, // Upline & Hirarki (32mm)
      4: { halign: 'left', cellWidth: 35 },   // Cabang (35mm)
      5: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },  // Produksi Premi & Polis (40mm)
      6: { halign: 'center', cellWidth: 22 }, // Downline (22mm)
      // Total cellWidth: 86 + 18 + 36 + 32 + 35 + 40 + 22 = 269mm (100% Full Page Width)
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        // Pewarnaan baris data agen
        if (data.row.index >= 0 && data.row.index < bodyData.length) {
          const node = flatNodes[data.row.index];
          if (node) {
            const color = LEVEL_PDF_COLORS[Math.min(node.level, 7)];
            if (data.column.index === 0 || data.column.index === 1) {
              // Pewarnaan latar berdasarkan Level pada kolom hirarki & level
              data.cell.styles.fillColor = color.bg;
              data.cell.styles.textColor = color.text;
            } else {
              // Kolom lainnya berlatar putih bersih
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.textColor = [30, 41, 59];
            }
          }
        } else if (data.row.index === bodyData.length) {
          // Baris Ringkasan Total Keseluruhan (Baris Terakhir)
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [226, 232, 240]; // Slate 200
          data.cell.styles.textColor = [15, 23, 42]; // Slate 900
        }
      }
    },
    didDrawCell: (data) => {
      // Gambar simbol geometris vektor murni di hook didDrawCell:
      if (data.section === 'body' && data.row.index >= 0 && data.row.index < flatNodes.length) {
        const node = flatNodes[data.row.index];
        if (!node) return;

        // 1. Gambar Corner Arrow atau Lingkaran pada Kolom 0 (Struktur Hirarki)
        if (data.column.index === 0) {
          const cellY = data.cell.y + data.cell.height / 2;

          if (node.level === 0) {
            // Gambar lingkaran hitam bulat murni di samping kode agen Root
            doc.setFillColor(30, 27, 75);
            doc.circle(data.cell.x + 3.0, cellY, 1.1, 'F');
          } else {
            // Gambar Corner Arrow ('↳') vektor murni disinkronkan linier (3.556mm = 5 spasi per level)
            const indentOffset = (node.level - 1) * 3.556;
            const arrowX = data.cell.x + 2.8 + indentOffset;
            drawCornerArrow(doc, arrowX, cellY, 1.7);
          }
        }

        // 2. Gambar lingkaran hitam pada Kolom 1 (Level) jika node adalah Root
        if (data.column.index === 1 && node.level === 0) {
          doc.setFillColor(30, 27, 75);
          doc.circle(data.cell.x + 3.8, data.cell.y + data.cell.height / 2, 1.0, 'F');
        }

        // 3. Gambar Badge Pill Status Vektor pada Kolom 2 (Peringkat & Status)
        if (data.column.index === 2) {
          const s = (node.statusKeagenan || 'AKTIF').trim().toUpperCase();

          let bg: [number, number, number] = [241, 245, 249]; // Slate 100
          let border: [number, number, number] = [203, 213, 225]; // Slate 300
          let textColor: [number, number, number] = [71, 85, 105]; // Slate 700
          let dotColor: [number, number, number] = [100, 116, 139]; // Slate 500

          if (s === 'AKTIF') {
            bg = [220, 252, 231]; // Emerald 100
            border = [134, 239, 172]; // Emerald 300
            textColor = [22, 101, 52]; // Emerald 800
            dotColor = [22, 163, 74]; // Emerald 600
          } else if (s === 'CUT') {
            bg = [254, 226, 226]; // Rose 100
            border = [252, 165, 165]; // Rose 300
            textColor = [153, 27, 27]; // Rose 800
            dotColor = [225, 29, 72]; // Rose 600
          }

          // Lebar badge pill dinamis berdasarkan panjang teks (misal: "AKTIF" vs "TIDAK AKTIF")
          const pillWidth = s.length > 6 ? 24 : 18;
          const pillHeight = 3.6;
          const pillX = data.cell.x + (data.cell.width - pillWidth) / 2;
          const pillY = data.cell.y + data.cell.height - pillHeight - 1.2;

          // Gambar latar rounded pill
          doc.setFillColor(bg[0], bg[1], bg[2]);
          doc.setDrawColor(border[0], border[1], border[2]);
          doc.setLineWidth(0.2);
          doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 0.9, 0.9, 'FD');

          // Gambar dot bulat indikator status
          doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
          doc.circle(pillX + 2.5, pillY + pillHeight / 2, 0.65, 'F');

          // Teks label status di dalam pill
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.2);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.text(s, pillX + pillWidth / 2 + 1.0, pillY + pillHeight / 2 + 0.85, { align: 'center' });
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const totalPages = (doc as any).internal.getNumberOfPages();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      doc.text(
        'MitracaMSA Agency Management · Dokumen Rahasia Perusahaan',
        14,
        pageHeight - 8
      );

      doc.text(
        `Halaman ${pageNumber} dari ${totalPages}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `Hirarki_Agen_${options.agentCode || options.branch || options.mode}_${dateStr}.pdf`;

  doc.save(filename);
}
