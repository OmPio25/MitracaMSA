import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, branches, users, productionRecords, claims } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import { getCurrentCutoffYear, getCutoffPeriod } from '@/lib/analytics/loss-ratio';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/profile
 * Mengambil profil keagenan mandiri, informasi upline & cabang,
 * serta KPI performa personal & tim untuk Portal Mandiri Agen.
 * 
 * Akses:
 * - AGENT: Mengambil data diri sendiri (session.agentId)
 * - OFFICER_AGENT: Mengambil data agen pemilik tempat ia bertugas (session.parentAgentId)
 * - SUPERADMIN / ADMIN: Dapat melihat data agen manapun via query ?agentId=...
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
    const { searchParams } = new URL(req.url);
    const queryAgentId = searchParams.get('agentId');

    const isNationalRole = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'AUDIT';
    const isBranchRole = role === 'KACAB' || role === 'PIC_CABANG';

    if (
      role !== 'AGENT' &&
      role !== 'OFFICER_AGENT' &&
      !isNationalRole &&
      !isBranchRole
    ) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Portal/Direktori Keagenan tidak dapat diakses oleh peran ini' },
        { status: 403 }
      );
    }

    // ── Validasi Portal Mandiri untuk Role Cabang (KACAB & PIC_CABANG) ─────────
    let branchInfo: any = null;
    if (isBranchRole) {
      if (!session.branchId) {
        return NextResponse.json(
          { success: false, error: 'Akun Anda tidak terhubung dengan kantor cabang manapun.' },
          { status: 403 }
        );
      }

      const branchRows = await db.execute(sql`
        SELECT id, code, name, is_portal_active AS "isPortalActive"
        FROM branches
        WHERE id = ${session.branchId}::uuid
        LIMIT 1;
      `);
      branchInfo = (branchRows && Array.isArray(branchRows) ? branchRows[0] : (branchRows as any)?.rows?.[0]) || null;

      if (!branchInfo || !branchInfo.isPortalActive) {
        return NextResponse.json(
          {
            success: false,
            error: `Fitur Portal Mandiri belum diaktifkan untuk Cabang ${branchInfo?.name || 'Anda'} oleh Superadmin.`,
          },
          { status: 403 }
        );
      }
    }

    const getFirstRow = (res: any) => (res && Array.isArray(res) ? res[0] : res?.rows?.[0]) || {};

    // ── Mode Cabang (KACAB, PIC_CABANG tanpa query agentId) ────────────────────
    if (isBranchRole && !queryAgentId) {
      const bId = session.branchId!;

      // 1. Branch Agent Summary
      const agentStatsRes = await db.execute(sql`
        SELECT 
          COUNT(*)::int AS "totalAgents",
          COUNT(CASE WHEN status_keagenan ILIKE '%AKTIF%' AND (is_active IS NULL OR is_active = true) THEN 1 END)::int AS "activeAgents"
        FROM agents
        WHERE branch_id = ${bId}::uuid
          AND deleted_at IS NULL;
      `);
      const agentStats = getFirstRow(agentStatsRes);

      // 2. Branch Assistant Summary
      const assistantStatsRes = await db.execute(sql`
        SELECT 
          COUNT(*)::int AS "totalAssistants",
          COUNT(CASE WHEN u.is_active = true THEN 1 END)::int AS "activeAssistants",
          COUNT(DISTINCT u.parent_agent_id)::int AS "agentsWithAssistants"
        FROM users u
        JOIN agents a ON a.id = u.parent_agent_id
        WHERE u.role = 'OFFICER_AGENT'
          AND a.branch_id = ${bId}::uuid
          AND u.deleted_at IS NULL;
      `);
      const assistantStats = getFirstRow(assistantStatsRes);

      // 3. Branch Production Summary
      const prodStatsRes = await db.execute(sql`
        SELECT 
          COUNT(*)::int AS "policyCount",
          COALESCE(SUM(nilai_premi), 0)::numeric(18, 2) AS "totalPremium"
        FROM production_records
        WHERE branch_id = ${bId}::uuid
          AND deleted_at IS NULL;
      `);
      const prodStats = getFirstRow(prodStatsRes);

      // 4. Branch Claims Summary
      const claimStatsRes = await db.execute(sql`
        SELECT 
          COUNT(*)::int AS "claimCount",
          COALESCE(SUM(gross_claim), 0)::numeric(18, 2) AS "totalClaims"
        FROM claims
        WHERE branch_id = ${bId}::uuid
          AND deleted_at IS NULL;
      `);
      const claimStats = getFirstRow(claimStatsRes);

      const branchGrossPremium = Number(prodStats.totalPremium || 0);
      const branchGrossClaim = Number(claimStats.totalClaims || 0);
      const branchLossRatio = branchGrossPremium > 0
        ? Number(((branchGrossClaim / branchGrossPremium) * 100).toFixed(2))
        : 0;

      return NextResponse.json({
        success: true,
        mode: 'BRANCH_SUMMARY',
        callerRole: role,
        isBranchRole: true,
        branch: {
          id: branchInfo.id,
          code: branchInfo.code,
          name: branchInfo.name,
        },
        canManage: false,
        isReadOnly: true,
        branchKPI: {
          branchName: branchInfo.name,
          branchCode: branchInfo.code,
          totalAgents: Number(agentStats.totalAgents || 0),
          activeAgents: Number(agentStats.activeAgents || 0),
          totalAssistants: Number(assistantStats.totalAssistants || 0),
          activeAssistants: Number(assistantStats.activeAssistants || 0),
          agentsWithAssistants: Number(assistantStats.agentsWithAssistants || 0),
          branchPolicyCount: Number(prodStats.policyCount || 0),
          branchGrossPremium,
          branchClaimCount: Number(claimStats.claimCount || 0),
          branchGrossClaim,
          branchLossRatio,
        },
      });
    }

    // ── Mode Nasional (SUPERADMIN, ADMIN, AUDIT tanpa query agentId) ───────────
    if (isNationalRole && !queryAgentId) {

      // 1. National Agent Summary
      const agentStatsRes = await db.execute(sql`
        SELECT 
          COUNT(*)::int AS "totalAgents",
          COUNT(CASE WHEN status_keagenan ILIKE '%AKTIF%' AND (is_active IS NULL OR is_active = true) THEN 1 END)::int AS "activeAgents"
        FROM agents
        WHERE deleted_at IS NULL;
      `);
      const agentStats = getFirstRow(agentStatsRes);

      // 2. National Assistant Summary
      const assistantStatsRes = await db.execute(sql`
        SELECT 
          COUNT(*)::int AS "totalAssistants",
          COUNT(CASE WHEN is_active = true THEN 1 END)::int AS "activeAssistants",
          COUNT(DISTINCT parent_agent_id)::int AS "agentsWithAssistants"
        FROM users
        WHERE role = 'OFFICER_AGENT'
          AND deleted_at IS NULL;
      `);
      const assistantStats = getFirstRow(assistantStatsRes);

      // 3. National Production Summary
      const prodStatsRes = await db.execute(sql`
        SELECT 
          COUNT(*)::int AS "policyCount",
          COALESCE(SUM(nilai_premi), 0)::numeric(18, 2) AS "totalPremium"
        FROM production_records
        WHERE deleted_at IS NULL;
      `);
      const prodStats = getFirstRow(prodStatsRes);

      // 4. National Claims Summary
      const claimStatsRes = await db.execute(sql`
        SELECT 
          COUNT(*)::int AS "claimCount",
          COALESCE(SUM(gross_claim), 0)::numeric(18, 2) AS "totalClaims"
        FROM claims
        WHERE deleted_at IS NULL;
      `);
      const claimStats = getFirstRow(claimStatsRes);

      const nationalGrossPremium = Number(prodStats.totalPremium || 0);
      const nationalGrossClaim = Number(claimStats.totalClaims || 0);
      const nationalLossRatio = nationalGrossPremium > 0
        ? Number(((nationalGrossClaim / nationalGrossPremium) * 100).toFixed(2))
        : 0;

      return NextResponse.json({
        success: true,
        mode: 'NATIONAL_SUMMARY',
        callerRole: role,
        isNationalRole: true,
        canManage: role === 'SUPERADMIN' || role === 'ADMIN',
        isReadOnly: role === 'AUDIT',
        nationalKPI: {
          totalAgents: Number(agentStats.totalAgents || 0),
          activeAgents: Number(agentStats.activeAgents || 0),
          totalAssistants: Number(assistantStats.totalAssistants || 0),
          activeAssistants: Number(assistantStats.activeAssistants || 0),
          agentsWithAssistants: Number(assistantStats.agentsWithAssistants || 0),
          nationalPolicyCount: Number(prodStats.policyCount || 0),
          nationalGrossPremium,
          nationalClaimCount: Number(claimStats.claimCount || 0),
          nationalGrossClaim,
          nationalLossRatio,
        },
      });
    }

    let targetAgentId: string | null = null;

    if (role === 'AGENT') {
      targetAgentId = session.agentId || null;
    } else if (role === 'OFFICER_AGENT') {
      targetAgentId = session.parentAgentId || session.agentId || null;
    } else if (isNationalRole || isBranchRole) {
      targetAgentId = queryAgentId || null;
    }

    if (!targetAgentId) {
      return NextResponse.json(
        {
          success: false,
          error: isNationalRole || isBranchRole
            ? 'Silakan tentukan Agen yang ingin diinspeksi.'
            : 'Akun Anda belum terhubung dengan profil Master Agen.',
        },
        { status: 404 }
      );
    }

    // 1. Ambil Data Profil Agen & Relasi Cabang + Upline
    const agentDataResult = await db.execute(sql`
      SELECT 
        a.id,
        a.agent_code AS "agentCode",
        a.name,
        a.prof_id AS "profId",
        a.peringkat,
        a.status_keagenan AS "statusKeagenan",
        a.upline_agent_code AS "uplineAgentCode",
        a.materialized_path AS "materializedPath",
        a.depth,
        a.is_active AS "isActive",
        a.created_at AS "createdAt",
        b.id AS "branchId",
        b.code AS "branchCode",
        b.name AS "branchName",
        a.raw_branch_name AS "rawBranchName",
        upline.name AS "uplineName",
        upline.agent_code AS "uplineCode"
      FROM agents a
      LEFT JOIN branches b ON b.id = a.branch_id
      LEFT JOIN agents upline ON upline.id = a.parent_id
      WHERE a.id = ${targetAgentId}::uuid
      LIMIT 1;
    `);

    const agentRows = (agentDataResult as any)?.rows || agentDataResult || [];
    if (agentRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Profil Agen tidak ditemukan' },
        { status: 404 }
      );
    }

    const agent = agentRows[0];

    // Jika dipanggil oleh KACAB / PIC_CABANG, pastikan agen berada di bawah cabang pemanggil
    if (isBranchRole && agent.branchId !== session.branchId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda hanya dapat menginspeksi agen di bawah kantor cabang Anda sendiri.' },
        { status: 403 }
      );
    }

    // 2. Hitung Siklus CutOff Aktif (Default: Tahun Berjalan, misal 2026: 14-11-2025 s/d 13-11-2026)
    const cutoffYear = getCurrentCutoffYear();
    const cutoffPeriod = getCutoffPeriod(cutoffYear);

    // 3. Hitung KPI Personal Produksi (Cutoff Berbasis Tanggal Terbit Polis issue_date & Fallback start_period)
    const personalProdResult = await db.execute(sql`
      SELECT 
        -- Cutoff Metrics (Tahun Berjalan)
        COUNT(DISTINCT CASE 
          WHEN COALESCE(issue_date, start_period) >= ${cutoffPeriod.startDate}::date 
           AND COALESCE(issue_date, start_period) <= ${cutoffPeriod.endDate}::date 
          THEN policy_no 
        END)::int AS "personalCutoffPolicyCount",
        COALESCE(SUM(CASE 
          WHEN COALESCE(issue_date, start_period) >= ${cutoffPeriod.startDate}::date 
           AND COALESCE(issue_date, start_period) <= ${cutoffPeriod.endDate}::date 
          THEN nilai_premi 
          ELSE 0 
        END), 0)::numeric(18, 2) AS "personalCutoffGrossPremium",

        -- All-time Metrics (Historis Kumulatif)
        COUNT(DISTINCT policy_no)::int AS "personalPolicyCount",
        COALESCE(SUM(nilai_premi), 0)::numeric(18, 2) AS "personalGrossPremium"
      FROM production_records
      WHERE agent_id = ${targetAgentId}::uuid
        AND deleted_at IS NULL;
    `);
    const personalProdRows = (personalProdResult as any)?.rows || personalProdResult || [];
    const personalCutoffPolicyCount = Number(personalProdRows[0]?.personalCutoffPolicyCount || 0);
    const personalCutoffGrossPremium = Number(personalProdRows[0]?.personalCutoffGrossPremium || 0);
    const personalPolicyCount = Number(personalProdRows[0]?.personalPolicyCount || 0);
    const personalGrossPremium = Number(personalProdRows[0]?.personalGrossPremium || 0);

    // 4. Hitung KPI Personal Klaim & Loss Ratio (Cutoff Berbasis date_of_settlement)
    const personalClaimResult = await db.execute(sql`
      SELECT 
        -- Cutoff Metrics (Tahun Berjalan)
        COUNT(DISTINCT CASE 
          WHEN date_of_settlement >= ${cutoffPeriod.startDate}::date 
           AND date_of_settlement <= ${cutoffPeriod.endDate}::date 
          THEN claim_no 
        END)::int AS "personalCutoffClaimCount",
        COALESCE(SUM(CASE 
          WHEN date_of_settlement >= ${cutoffPeriod.startDate}::date 
           AND date_of_settlement <= ${cutoffPeriod.endDate}::date 
          THEN gross_claim 
          ELSE 0 
        END), 0)::numeric(18, 2) AS "personalCutoffGrossClaim",

        -- All-time Metrics (Historis Kumulatif)
        COUNT(*)::int AS "personalClaimCount",
        COALESCE(SUM(gross_claim), 0)::numeric(18, 2) AS "personalGrossClaim"
      FROM claims
      WHERE agent_id = ${targetAgentId}::uuid
        AND deleted_at IS NULL;
    `);
    const personalClaimRows = (personalClaimResult as any)?.rows || personalClaimResult || [];
    const personalCutoffClaimCount = Number(personalClaimRows[0]?.personalCutoffClaimCount || 0);
    const personalCutoffGrossClaim = Number(personalClaimRows[0]?.personalCutoffGrossClaim || 0);
    const personalClaimCount = Number(personalClaimRows[0]?.personalClaimCount || 0);
    const personalGrossClaim = Number(personalClaimRows[0]?.personalGrossClaim || 0);

    const personalCutoffLossRatio = personalCutoffGrossPremium > 0
      ? Number(((personalCutoffGrossClaim / personalCutoffGrossPremium) * 100).toFixed(2))
      : 0;

    const personalLossRatio = personalGrossPremium > 0
      ? Number(((personalGrossClaim / personalGrossPremium) * 100).toFixed(2))
      : 0;

    // 4. Hitung Jaringan Tim Downline (Langsung Level 1 & Total Subtree)
    const downlinesResult = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN parent_id = ${targetAgentId}::uuid THEN 1 END)::int AS "directDownlinesCount",
        COUNT(CASE WHEN materialized_path LIKE ${'%' + agent.agentCode + '/%'} THEN 1 END)::int AS "totalNetworkDownlinesCount"
      FROM agents
      WHERE deleted_at IS NULL
        AND id != ${targetAgentId}::uuid;
    `);
    const downlinesRows = (downlinesResult as any)?.rows || downlinesResult || [];
    const directDownlinesCount = Number(downlinesRows[0]?.directDownlinesCount || 0);
    const totalNetworkDownlinesCount = Number(downlinesRows[0]?.totalNetworkDownlinesCount || 0);

    // 5. Hitung Staf Asisten (Officer Agent)
    const assistantCountResult = await db.execute(sql`
      SELECT 
        COUNT(*)::int AS "totalAssistants",
        COUNT(CASE WHEN is_active = true THEN 1 END)::int AS "activeAssistants"
      FROM users
      WHERE parent_agent_id = ${targetAgentId}::uuid
        AND role = 'OFFICER_AGENT'
        AND deleted_at IS NULL;
    `);
    const assistantCountRows = (assistantCountResult as any)?.rows || assistantCountResult || [];
    const totalAssistants = Number(assistantCountRows[0]?.totalAssistants || 0);
    const activeAssistants = Number(assistantCountRows[0]?.activeAssistants || 0);

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        agentCode: agent.agentCode,
        name: agent.name,
        profId: agent.profId,
        peringkat: agent.peringkat || 'Partner',
        statusKeagenan: agent.statusKeagenan || 'Aktif',
        branchName: agent.branchName || agent.rawBranchName || 'Kantor Pusat',
        branchCode: agent.branchCode || '-',
        uplineCode: agent.uplineCode || agent.uplineAgentCode || '-',
        uplineName: agent.uplineName || (agent.uplineAgentCode ? `Agen ${agent.uplineAgentCode}` : 'Root Leader'),
        depth: agent.depth || 0,
        createdAt: agent.createdAt,
      },
      kpi: {
        cutoffYear,
        cutoffStartDate: cutoffPeriod.startDate,
        cutoffEndDate: cutoffPeriod.endDate,
        personalCutoffPolicyCount,
        personalCutoffGrossPremium,
        personalCutoffClaimCount,
        personalCutoffGrossClaim,
        personalCutoffLossRatio,
        personalPolicyCount,
        personalGrossPremium,
        personalClaimCount,
        personalGrossClaim,
        personalLossRatio,
        directDownlinesCount,
        totalNetworkDownlinesCount,
        totalAssistants,
        activeAssistants,
      },
      cutoff: {
        year: cutoffYear,
        label: cutoffPeriod.label,
        startDate: cutoffPeriod.startDate,
        endDate: cutoffPeriod.endDate,
      },
      callerRole: role,
      isOwner: role === 'AGENT',
      isOfficer: role === 'OFFICER_AGENT',
      isNationalRole,
      isBranchRole,
      mode: isNationalRole || isBranchRole ? 'INSPECT_AGENT' : 'PERSONAL',
      canManage: role === 'AGENT' || role === 'SUPERADMIN' || role === 'ADMIN',
      isReadOnly: role === 'AUDIT' || role === 'OFFICER_AGENT' || isBranchRole,
    });
  } catch (error: any) {
    console.error('Error fetching agent profile:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat profil keagenan: ' + error.message },
      { status: 500 }
    );
  }
}
