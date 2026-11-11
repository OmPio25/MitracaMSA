import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, branches } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';
import { executeSelfHealingPass } from '@/lib/ingestion/self-healing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/agents
 * Mengambil daftar master agen dengan filter, search, paginasi, dan KPI ringkasan
 * Akses: SUPERADMIN & ADMIN
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN dan ADMIN yang berhak mengakses Master Agen' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const search = (searchParams.get('search') || '').trim();
    const branchId = searchParams.get('branchId') || 'ALL';
    const statusKeagenan = searchParams.get('statusKeagenan') || 'ALL';
    const uplineStatus = searchParams.get('uplineStatus') || 'ALL';
    const isPlaceholder = searchParams.get('isPlaceholder') || 'ALL';

    // 1. Hitung Statistik Ringkasan KPI
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*)::int AS "totalAgents",
        COUNT(CASE WHEN UPPER(TRIM(status_keagenan)) = 'AKTIF' AND deleted_at IS NULL THEN 1 END)::int AS "activeCount",
        COUNT(CASE WHEN UPPER(TRIM(status_keagenan)) IN ('NON AKTIF', 'NONAKTIF', 'TIDAK AKTIF') AND deleted_at IS NULL THEN 1 END)::int AS "inactiveCount",
        COUNT(CASE WHEN UPPER(TRIM(status_keagenan)) = 'CUT' AND deleted_at IS NULL THEN 1 END)::int AS "cutCount",
        COUNT(CASE WHEN is_placeholder = true AND deleted_at IS NULL THEN 1 END)::int AS "placeholderAgents",
        COUNT(CASE WHEN upline_status = 'PENDING_UPLINE' AND deleted_at IS NULL THEN 1 END)::int AS "pendingUplineAgents"
      FROM agents
      WHERE deleted_at IS NULL
    `);
    const statsRows = (statsResult as any)?.rows || statsResult || [];
    const stats = statsRows[0] || {
      totalAgents: 0,
      activeCount: 0,
      inactiveCount: 0,
      cutCount: 0,
      placeholderAgents: 0,
      pendingUplineAgents: 0,
    };

    // 2. Hitung Total Baris Hasil Filter
    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM agents a
      WHERE a.deleted_at IS NULL
        ${search ? sql`AND (a.agent_code ILIKE ${'%' + search + '%'} OR a.name ILIKE ${'%' + search + '%'} OR a.prof_id ILIKE ${'%' + search + '%'} OR a.upline_agent_code ILIKE ${'%' + search + '%'})` : sql``}
        ${branchId !== 'ALL' && branchId ? sql`AND a.branch_id = ${branchId}::uuid` : sql``}
        ${statusKeagenan === 'AKTIF' ? sql`AND UPPER(TRIM(a.status_keagenan)) = 'AKTIF'` : sql``}
        ${statusKeagenan === 'NON_AKTIF' ? sql`AND UPPER(TRIM(a.status_keagenan)) IN ('NON AKTIF', 'NONAKTIF', 'TIDAK AKTIF')` : sql``}
        ${statusKeagenan === 'CUT' ? sql`AND UPPER(TRIM(a.status_keagenan)) = 'CUT'` : sql``}
        ${uplineStatus !== 'ALL' && uplineStatus ? sql`AND a.upline_status = ${uplineStatus}::upline_status` : sql``}
        ${isPlaceholder === 'true' ? sql`AND a.is_placeholder = true` : sql``}
        ${isPlaceholder === 'false' ? sql`AND a.is_placeholder = false` : sql``}
    `);
    const countRows = (countResult as any)?.rows || countResult || [];
    const totalCount = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // 3. Ambil Data Agen dengan Detail Cabang, Upline, dan Downlines Count
    const dataResult = await db.execute(sql`
      SELECT 
        a.id,
        a.agent_code AS "agentCode",
        a.name,
        a.prof_id AS "profId",
        a.status_keagenan AS "statusKeagenan",
        a.upline_agent_code AS "uplineAgentCode",
        a.peringkat,
        a.raw_branch_name AS "rawBranchName",
        a.parent_id AS "parentId",
        a.upline_status AS "uplineStatus",
        a.materialized_path AS "materializedPath",
        a.depth,
        a.branch_id AS "branchId",
        b.code AS "branchCode",
        b.name AS "branchName",
        a.email,
        a.phone,
        a.is_placeholder AS "isPlaceholder",
        a.is_active AS "isActive",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        upline.name AS "uplineName",
        COALESCE(dl.downlines_count, 0)::int AS "downlinesCount",
        COALESCE(pr.prod_count, 0)::int AS "prodCount"
      FROM agents a
      LEFT JOIN branches b ON b.id = a.branch_id
      LEFT JOIN agents upline ON upline.id = a.parent_id
      LEFT JOIN (
        SELECT parent_id, COUNT(*) AS downlines_count
        FROM agents
        WHERE parent_id IS NOT NULL AND deleted_at IS NULL
        GROUP BY parent_id
      ) dl ON dl.parent_id = a.id
      LEFT JOIN (
        SELECT agent_id, COUNT(*) AS prod_count
        FROM production_records
        WHERE agent_id IS NOT NULL AND deleted_at IS NULL
        GROUP BY agent_id
      ) pr ON pr.agent_id = a.id
      WHERE a.deleted_at IS NULL
        ${search ? sql`AND (a.agent_code ILIKE ${'%' + search + '%'} OR a.name ILIKE ${'%' + search + '%'} OR a.prof_id ILIKE ${'%' + search + '%'} OR a.upline_agent_code ILIKE ${'%' + search + '%'})` : sql``}
        ${branchId !== 'ALL' && branchId ? sql`AND a.branch_id = ${branchId}::uuid` : sql``}
        ${statusKeagenan === 'AKTIF' ? sql`AND UPPER(TRIM(a.status_keagenan)) = 'AKTIF'` : sql``}
        ${statusKeagenan === 'NON_AKTIF' ? sql`AND UPPER(TRIM(a.status_keagenan)) IN ('NON AKTIF', 'NONAKTIF', 'TIDAK AKTIF')` : sql``}
        ${statusKeagenan === 'CUT' ? sql`AND UPPER(TRIM(a.status_keagenan)) = 'CUT'` : sql``}
        ${uplineStatus !== 'ALL' && uplineStatus ? sql`AND a.upline_status = ${uplineStatus}::upline_status` : sql``}
        ${isPlaceholder === 'true' ? sql`AND a.is_placeholder = true` : sql``}
        ${isPlaceholder === 'false' ? sql`AND a.is_placeholder = false` : sql``}
      ORDER BY a.agent_code ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const agentsList = (dataResult as any)?.rows || dataResult || [];

    return NextResponse.json({
      success: true,
      agents: agentsList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching master agents:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat daftar master agen' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/agents
 * Menambah agen baru secara manual dengan penautan hirarki otomatis & audit logging
 * Akses: SUPERADMIN & ADMIN
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN dan ADMIN yang berhak menambah agen' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const agentCode = String(body.agentCode || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const profId = body.profId ? String(body.profId).trim() : null;
    const statusKeagenan = String(body.statusKeagenan || 'Aktif').trim();
    const uplineAgentCode = body.uplineAgentCode ? String(body.uplineAgentCode).trim().toUpperCase() : null;
    const peringkat = body.peringkat ? String(body.peringkat).trim() : 'Partner';
    const branchId = body.branchId ? String(body.branchId).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const isActive = statusKeagenan.toLowerCase() === 'aktif';

    // 1. Validasi Input Wajib
    if (!agentCode) {
      return NextResponse.json({ success: false, error: 'Kode agen wajib diisi' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama agen wajib diisi' }, { status: 400 });
    }

    // 2. Cek Keunikan Kode Agen
    const [existing] = await db
      .select({ id: agents.id, agentCode: agents.agentCode })
      .from(agents)
      .where(eq(agents.agentCode, agentCode))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Kode agen '${agentCode}' sudah terdaftar dalam sistem.` },
        { status: 400 }
      );
    }

    // 3. Ambil data cabang jika dipilih
    let rawBranchName: string | null = null;
    if (branchId) {
      const [branch] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, branchId))
        .limit(1);
      if (branch) {
        rawBranchName = branch.name;
      }
    }

    // 4. Resolusi Upline & Materialized Path
    let parentId: string | null = null;
    let uplineStatus: 'LINKED' | 'PENDING_UPLINE' | 'ROOT' = 'ROOT';
    let materializedPath = `/${agentCode}`;
    let depth = 0;

    if (uplineAgentCode) {
      if (uplineAgentCode === agentCode) {
        return NextResponse.json(
          { success: false, error: 'Agen tidak dapat memilih dirinya sendiri sebagai upline.' },
          { status: 400 }
        );
      }

      const [upline] = await db
        .select({
          id: agents.id,
          agentCode: agents.agentCode,
          materializedPath: agents.materializedPath,
          depth: agents.depth,
        })
        .from(agents)
        .where(eq(agents.agentCode, uplineAgentCode))
        .limit(1);

      if (upline) {
        parentId = upline.id;
        uplineStatus = 'LINKED';
        const parentPath = upline.materializedPath || `/${upline.agentCode}`;
        materializedPath = `${parentPath}/${agentCode}`;
        depth = (upline.depth ?? 0) + 1;
      } else {
        // Self-Healing Core Rule: Upline belum terdaftar, tetap simpan dengan status PENDING_UPLINE
        parentId = null;
        uplineStatus = 'PENDING_UPLINE';
        materializedPath = `/${agentCode}`;
        depth = 0;
      }
    }

    // 5. Simpan Agen Baru ke Database
    const [newAgent] = await db
      .insert(agents)
      .values({
        agentCode,
        name,
        profId,
        statusKeagenan,
        uplineAgentCode,
        peringkat,
        rawBranchName,
        branchId: branchId || null,
        parentId,
        uplineStatus,
        materializedPath,
        depth,
        email,
        phone,
        isPlaceholder: false,
        isActive,
        createdBy: session.userId,
        updatedBy: session.userId,
      })
      .returning();

    // 6. Jalankan pass self-healing (siapa tahu ada downline yang sedang menunggu agen baru ini)
    try {
      await executeSelfHealingPass();
    } catch (healErr) {
      console.warn('Self-healing pass notice after agent creation:', healErr);
    }

    // 7. Catat Audit Log
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'AGENT_CREATED',
      category: 'SYSTEM',
      status: 'SUCCESS',
      description: `Tambah agen baru: '${newAgent.agentCode}' - ${newAgent.name} (${newAgent.peringkat || 'AGENT'}, Status: ${newAgent.statusKeagenan})`,
      req,
      metadata: {
        agentId: newAgent.id,
        agentCode: newAgent.agentCode,
        name: newAgent.name,
        uplineAgentCode: newAgent.uplineAgentCode,
        uplineStatus: newAgent.uplineStatus,
        branchId: newAgent.branchId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Agen '${newAgent.agentCode}' - ${newAgent.name} berhasil ditambahkan!`,
      agent: newAgent,
    });
  } catch (error: any) {
    console.error('Error creating master agent:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menambahkan agen baru' },
      { status: 500 }
    );
  }
}
