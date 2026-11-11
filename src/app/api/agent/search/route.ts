import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/search?q=...
 * Pencarian agen nasional untuk dropdown inspeksi atau pemilihan agen induk asisten.
 * Akses: SUPERADMIN, ADMIN, AUDIT.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi login tidak valid atau telah berakhir' },
        { status: 401 }
      );
    }

    const { role } = session;
    const isNationalRole = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'AUDIT';
    const isBranchRole = role === 'KACAB' || role === 'PIC_CABANG';

    if (!isNationalRole && !isBranchRole && role !== 'AGENT') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const branchFilter = isBranchRole ? sql`AND a.branch_id = ${session.branchId}::uuid` : sql``;

    if (!query) {
      // Kembalikan 20 agen pertama jika tidak ada query
      const result = await db.execute(sql`
        SELECT 
          a.id,
          a.agent_code AS "agentCode",
          a.name,
          a.peringkat,
          a.status_keagenan AS "statusKeagenan",
          COALESCE(b.name, a.raw_branch_name, 'Kantor Pusat') AS "branchName"
        FROM agents a
        LEFT JOIN branches b ON b.id = a.branch_id
        WHERE a.deleted_at IS NULL
          ${branchFilter}
        ORDER BY a.name ASC
        LIMIT 20;
      `);
      const agents = (result as any)?.rows || result || [];
      return NextResponse.json({ success: true, agents });
    }

    const wildcard = `%${query}%`;
    const result = await db.execute(sql`
      SELECT 
        a.id,
        a.agent_code AS "agentCode",
        a.name,
        a.peringkat,
        a.status_keagenan AS "statusKeagenan",
        COALESCE(b.name, a.raw_branch_name, 'Kantor Pusat') AS "branchName"
      FROM agents a
      LEFT JOIN branches b ON b.id = a.branch_id
      WHERE a.deleted_at IS NULL
        ${branchFilter}
        AND (
          a.agent_code ILIKE ${wildcard}
          OR a.name ILIKE ${wildcard}
          OR b.name ILIKE ${wildcard}
          OR a.raw_branch_name ILIKE ${wildcard}
        )
      ORDER BY 
        CASE WHEN a.agent_code ILIKE ${query + '%'} THEN 1 ELSE 2 END,
        a.name ASC
      LIMIT 25;
    `);

    const agents = (result as any)?.rows || result || [];
    return NextResponse.json({ success: true, agents });
  } catch (error: any) {
    console.error('Error searching agents:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mencari agen: ' + error.message },
      { status: 500 }
    );
  }
}
