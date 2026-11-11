import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { sql, desc, and, gte, lte, or, ilike, eq } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Hanya SUPERADMIN, AUDIT, dan ADMIN yang berhak mengakses audit trail
    const allowedRoles = ['SUPERADMIN', 'AUDIT', 'ADMIN'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda tidak memiliki hak akses audit trail' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

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

    // 1. Hitung Total Data Sesuai Filter
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);

    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // 2. Ambil Data Halaman Ini
    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        userEmail: auditLogs.userEmail,
        userRole: auditLogs.userRole,
        action: auditLogs.action,
        category: auditLogs.category,
        status: auditLogs.status,
        description: auditLogs.description,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // 3. Hitung Statistik Ringkasan (KPI Cards)
    const [statsResult] = await db.execute<{
      total_all: string;
      today_count: string;
      auth_count: string;
      upload_count: string;
      failed_count: string;
    }>(sql`
      SELECT 
        COUNT(*)::text AS total_all,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::text AS today_count,
        COUNT(CASE WHEN category = 'AUTH' THEN 1 END)::text AS auth_count,
        COUNT(CASE WHEN category = 'UPLOAD' THEN 1 END)::text AS upload_count,
        COUNT(CASE WHEN status IN ('FAILED', 'WARNING') THEN 1 END)::text AS failed_count
      FROM audit_logs
    `);

    const stats = {
      totalAll: parseInt(statsResult?.total_all || '0', 10),
      todayCount: parseInt(statsResult?.today_count || '0', 10),
      authCount: parseInt(statsResult?.auth_count || '0', 10),
      uploadCount: parseInt(statsResult?.upload_count || '0', 10),
      failedCount: parseInt(statsResult?.failed_count || '0', 10),
    };

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      stats,
    });
  } catch (err: any) {
    console.error('Error fetching audit logs:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memuat log audit' },
      { status: 500 }
    );
  }
}
