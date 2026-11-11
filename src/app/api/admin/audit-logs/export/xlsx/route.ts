import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { desc, and, gte, lte, or, ilike, eq } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['SUPERADMIN', 'AUDIT', 'ADMIN'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN dan AUDIT yang berwenang mengekspor log audit' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const category = searchParams.get('category') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.description, `%${search}%`),
          ilike(auditLogs.userName, `%${search}%`),
          ilike(auditLogs.userEmail, `%${search}%`),
          ilike(auditLogs.action, `%${search}%`),
          ilike(auditLogs.ipAddress, `%${search}%`)
        )
      );
    }

    if (category && category !== 'ALL') {
      conditions.push(eq(auditLogs.category, category));
    }

    if (status && status !== 'ALL') {
      conditions.push(eq(auditLogs.status, status));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(`${startDate}T00:00:00`)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(`${endDate}T23:59:59`)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Ambil maksimal 5000 log terbaru untuk ekspor spreadsheet
    const logs = await db
      .select({
        id: auditLogs.id,
        userName: auditLogs.userName,
        userEmail: auditLogs.userEmail,
        userRole: auditLogs.userRole,
        action: auditLogs.action,
        category: auditLogs.category,
        status: auditLogs.status,
        description: auditLogs.description,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(5000);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MitracaMSA Audit & Compliance System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Log Aktivitas Sistem', {
      views: [{ state: 'frozen', ySplit: 4 }],
    });

    // 1. Title Block
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'MITRACAMSA — LOG AKTIVITAS & AUDIT TRAIL SISTEM';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Navy 900
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.getRow(1).height = 28;

    sheet.mergeCells('A2:J2');
    const subCell = sheet.getCell('A2');
    const exportTime = new Date().toLocaleString('id-ID');
    subCell.value = `Dicetak oleh: ${session.name} (${session.role})   |   Waktu Cetak: ${exportTime}   |   Total Data: ${logs.length} Baris`;
    subCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.getRow(2).height = 20;

    sheet.addRow([]); // Blank line 3

    // 2. Table Headers (Row 4)
    const headerRow = sheet.addRow([
      'No',
      'Waktu Aktivitas (WIB)',
      'Nama Pengguna',
      'Email',
      'Peran (Role)',
      'Kategori',
      'Aksi Sistem',
      'Status',
      'Deskripsi Aktivitas',
      'IP Address',
    ]);
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });

    // 3. Data Rows
    logs.forEach((item, idx) => {
      const timeStr = new Date(item.createdAt).toLocaleString('id-ID');
      const row = sheet.addRow([
        idx + 1,
        timeStr,
        item.userName || '-',
        item.userEmail || '-',
        item.userRole || '-',
        item.category,
        item.action,
        item.status,
        item.description,
        item.ipAddress || '-',
      ]);
      row.height = 20;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (colNumber === 1 || colNumber === 5 || colNumber === 6 || colNumber === 8 || colNumber === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Highlight Status
        if (colNumber === 8) {
          if (item.status === 'SUCCESS') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
          } else if (item.status === 'FAILED') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          } else {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          }
        }
      });
    });

    // 4. Auto Column Widths
    sheet.columns = [
      { width: 6 },  // No
      { width: 22 }, // Waktu
      { width: 25 }, // Nama
      { width: 28 }, // Email
      { width: 16 }, // Role
      { width: 18 }, // Kategori
      { width: 26 }, // Aksi
      { width: 14 }, // Status
      { width: 45 }, // Deskripsi
      { width: 18 }, // IP
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Log_Aktivitas_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Error exporting audit logs to Excel:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal mengekspor log audit ke Excel' },
      { status: 500 }
    );
  }
}
