import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, branches, claims, productionRecords } from '@/db/schema';
import { sql, eq, and, or, gte, lte, ilike } from 'drizzle-orm';
import {
  getCurrentCutoffYear,
  getCutoffPeriod,
  getAvailableCutoffYears,
  evaluateLossRatio,
} from '@/lib/analytics/loss-ratio';
import { getServerSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Parsing Filter Parameter & RBAC Scoping
    const session = await getServerSession();

    const cutoffParam = searchParams.get('cutoffYear'); // e.g. "2026", "2025", or "ALL"
    const customStart = searchParams.get('startDate');   // YYYY-MM-DD
    const customEnd = searchParams.get('endDate');       // YYYY-MM-DD
    let branchId = searchParams.get('branchId') || undefined;
    let agentCodeParam = (searchParams.get('agentCode') || '').trim().toUpperCase();
    let includeDownlines = searchParams.get('includeDownlines') !== 'false';
    const maxDepthParam = searchParams.get('maxDepth'); // e.g. "1", "2", "3", "4", "ALL"
    const parsedMaxDepth = maxDepthParam === 'ALL' ? null : (maxDepthParam ? parseInt(maxDepthParam, 10) : (session?.role === 'AGENT' || session?.role === 'OFFICER_AGENT' ? 4 : null));
    const uwYearParam = (searchParams.get('uwYear') || '').trim();
    const productParam = (searchParams.get('product') || '').trim();

    const isAgentRole = session?.role === 'AGENT' || session?.role === 'OFFICER_AGENT';

    // Enforce Role Scope
    if (session) {
      if (session.role === 'KACAB' || session.role === 'PIC_CABANG') {
        if (session.branchId) branchId = session.branchId;
      } else if (isAgentRole) {
        const ownerCode = (session.agentCode || session.parentAgentCode || '').toUpperCase();
        agentCodeParam = ownerCode;
        includeDownlines = true; // Always aggregate their entire subtree
        branchId = undefined; // Agen melihat seluruh jaringannya lintas cabang secara nasional
      }
    }

    // Resolve Cabang Terpilih jika branchId diberikan
    let selectedBranchInfo: { id: string; code: string; name: string } | null = null;
    if (branchId) {
      const [foundBranch] = await db
        .select({ id: branches.id, code: branches.code, name: branches.name })
        .from(branches)
        .where(or(eq(branches.id, branchId), eq(branches.code, branchId)))
        .limit(1);
      if (foundBranch) {
        selectedBranchInfo = foundBranch;
      }
    }

    // Tentukan Cutoff Year aktif (Default: otomatis sesuai tanggal saat ini)
    const currentCutoffYear = getCurrentCutoffYear();
    const activeCutoffYear = cutoffParam === 'ALL' ? null : Number(cutoffParam) || currentCutoffYear;

    // Jika hanya meminta metadata filter (opsi cutoff & UW Years) untuk initial render
    if (searchParams.get('metaOnly') === 'true') {
      const uwYearRows = await db.execute<{ uw_year: string }>(sql`
        SELECT DISTINCT uw_year 
        FROM claims 
        WHERE deleted_at IS NULL AND uw_year IS NOT NULL 
        ORDER BY uw_year DESC
      `);
      return NextResponse.json({
        success: true,
        availableCutoffs: getAvailableCutoffYears(6),
        availableUwYears: uwYearRows.map((r) => r.uw_year),
      });
    }

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    } else if (activeCutoffYear) {
      const period = getCutoffPeriod(activeCutoffYear);
      startDate = period.startDate;
      endDate = period.endDate;
    }

    // 2. Resolve Agent Subtree jika agentCode diberikan
    let agentFilterIds: string[] | null = null;
    let targetAgentInfo: { id: string; agentCode: string; name: string } | null = null;
    const agentDepthMap = new Map<string, number>();

    if (agentCodeParam) {
      const [foundAgent] = await db
        .select({
          id: agents.id,
          agentCode: agents.agentCode,
          name: agents.name,
          depth: agents.depth,
        })
        .from(agents)
        .where(
          or(
            eq(agents.agentCode, agentCodeParam),
            ilike(agents.agentCode, `%${agentCodeParam}%`),
            ilike(agents.name, `%${agentCodeParam}%`)
          )
        )
        .limit(1);

      if (foundAgent) {
        targetAgentInfo = foundAgent;
        agentDepthMap.set(foundAgent.id, 0);

        if (includeDownlines) {
          // Cari semua agent yang berada dalam subtree (materialized_path)
          const subtreeAgentsRaw = await db
            .select({
              id: agents.id,
              agentCode: agents.agentCode,
              materializedPath: agents.materializedPath,
              depth: agents.depth,
            })
            .from(agents)
            .where(
              or(
                eq(agents.id, foundAgent.id),
                ilike(agents.materializedPath, `/%/${foundAgent.agentCode}/%`),
                ilike(agents.materializedPath, `/${foundAgent.agentCode}/%`)
              )
            );

          // Hitung relative depth terhadap targetAgent / leader
          subtreeAgentsRaw.forEach((a) => {
            if (a.id === foundAgent.id) {
              agentDepthMap.set(a.id, 0);
            } else {
              const parts = (a.materializedPath || '').split('/').filter(Boolean);
              const idx = parts.indexOf(foundAgent.agentCode);
              const rel = idx >= 0 ? parts.length - 1 - idx : Math.max(1, (a.depth ?? 0) - (foundAgent.depth ?? 0));
              agentDepthMap.set(a.id, rel);
            }
          });

          // Terapkan batasan level kedalaman (default: 4 level untuk akun agen)
          const filteredSubtree = subtreeAgentsRaw.filter((a) => {
            if (parsedMaxDepth === null || isNaN(parsedMaxDepth)) return true;
            const d = agentDepthMap.get(a.id) ?? 0;
            return d <= parsedMaxDepth;
          });

          agentFilterIds = filteredSubtree.map((a) => a.id);
        } else {
          agentFilterIds = [foundAgent.id];
        }
      }
    }

    // 3. Query Agregasi Produksi (Production Records - Strict Produksi MM berbasis Tanggal Terbit issue_date / start_period)
    const prodConditions = [sql`pr.deleted_at IS NULL`, sql`pr.is_mm = true`];
    if (startDate && endDate) {
      prodConditions.push(sql`COALESCE(pr.issue_date, pr.start_period) >= ${startDate}::date AND COALESCE(pr.issue_date, pr.start_period) <= ${endDate}::date`);
    }
    if (branchId) {
      prodConditions.push(sql`pr.branch_id = ${branchId}::uuid`);
    }
    if (isAgentRole && agentFilterIds && agentFilterIds.length > 0) {
      prodConditions.push(sql`pr.agent_id IN (${sql.join(agentFilterIds.map((id) => sql`${id}::uuid`), sql`, `)})`);
    }
    if (productParam) {
      prodConditions.push(sql`pr.product ILIKE ${'%' + productParam + '%'}`);
    }

    const prodWhereSql = sql.join(prodConditions, sql` AND `);

    const [prodKpi] = await db.execute<{
      total_premi: string;
      total_komisi: string;
      total_akusisi: string;
      total_policies: string;
      total_records: string;
    }>(sql`
      SELECT 
        COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS total_premi,
        COALESCE(SUM(pr.nilai_komisi), 0)::numeric(18,2) AS total_komisi,
        COALESCE(SUM(pr.nilai_akusisi), 0)::numeric(18,2) AS total_akusisi,
        COUNT(DISTINCT pr.policy_no)::integer AS total_policies,
        COUNT(pr.id)::integer AS total_records
      FROM production_records pr
      WHERE ${prodWhereSql}
    `);

    // 4. Query Agregasi Klaim (Claims - Strict Klaim MM berbasis date_of_settlement)
    const claimConditions = [sql`cl.deleted_at IS NULL`, sql`cl.is_mm = true`];
    if (startDate && endDate) {
      claimConditions.push(sql`cl.date_of_settlement >= ${startDate}::date AND cl.date_of_settlement <= ${endDate}::date`);
    }
    if (branchId) {
      claimConditions.push(sql`COALESCE(cl.branch_id, ag.branch_id) = ${branchId}::uuid`);
    }
    if (isAgentRole && agentFilterIds && agentFilterIds.length > 0) {
      claimConditions.push(sql`cl.agent_id IN (${sql.join(agentFilterIds.map((id) => sql`${id}::uuid`), sql`, `)})`);
    }
    if (uwYearParam) {
      claimConditions.push(sql`cl.uw_year = ${uwYearParam}`);
    }
    if (productParam) {
      claimConditions.push(sql`cl.nama_produk ILIKE ${'%' + productParam + '%'}`);
    }

    const claimWhereSql = sql.join(claimConditions, sql` AND `);

    const [claimKpi] = await db.execute<{
      total_claim: string;
      total_indemnity: string;
      total_deductible: string;
      total_salvage: string;
      total_claims_count: string;
      total_records: string;
    }>(sql`
      SELECT 
        COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim,
        COALESCE(SUM(cl.indemnity), 0)::numeric(18,2) AS total_indemnity,
        COALESCE(SUM(cl.deductible), 0)::numeric(18,2) AS total_deductible,
        COALESCE(SUM(cl.salvage), 0)::numeric(18,2) AS total_salvage,
        COUNT(DISTINCT cl.claim_no)::integer AS total_claims_count,
        COUNT(cl.id)::integer AS total_records
      FROM claims cl
      LEFT JOIN agents ag ON cl.agent_id = ag.id
      WHERE ${claimWhereSql}
    `);

    // 4b. ALL LR Agregasi (MM + Non-MM) untuk role manajemen selain Agent/Officer
    let totalPremiAll = 0;
    let totalClaimAll = 0;
    let allLossRatio: number | null = null;

    if (!isAgentRole) {
      // All Produksi (MM + Non-MM)
      const allProdConditions = [sql`pr.deleted_at IS NULL`];
      if (startDate && endDate) {
        allProdConditions.push(sql`COALESCE(pr.issue_date, pr.start_period) >= ${startDate}::date AND COALESCE(pr.issue_date, pr.start_period) <= ${endDate}::date`);
      }
      if (branchId) {
        allProdConditions.push(sql`pr.branch_id = ${branchId}::uuid`);
      }
      if (productParam) {
        allProdConditions.push(sql`pr.product ILIKE ${'%' + productParam + '%'}`);
      }

      const [allProdKpi] = await db.execute<{ total_premi_all: string }>(sql`
        SELECT COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS total_premi_all
        FROM production_records pr
        WHERE ${sql.join(allProdConditions, sql` AND `)}
      `);
      totalPremiAll = parseFloat(allProdKpi?.total_premi_all || '0');

      // All Klaim (MM + Non-MM)
      const allClaimConditions = [sql`cl.deleted_at IS NULL`];
      if (startDate && endDate) {
        allClaimConditions.push(sql`cl.date_of_settlement >= ${startDate}::date AND cl.date_of_settlement <= ${endDate}::date`);
      }
      if (branchId) {
        allClaimConditions.push(sql`COALESCE(cl.branch_id, ag.branch_id) = ${branchId}::uuid`);
      }
      if (uwYearParam) {
        allClaimConditions.push(sql`cl.uw_year = ${uwYearParam}`);
      }
      if (productParam) {
        allClaimConditions.push(sql`cl.nama_produk ILIKE ${'%' + productParam + '%'}`);
      }

      const [allClaimKpi] = await db.execute<{
        total_claim_all: string;
      }>(sql`
        SELECT 
          COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim_all
        FROM claims cl
        LEFT JOIN agents ag ON cl.agent_id = ag.id
        WHERE ${sql.join(allClaimConditions, sql` AND `)}
      `);

      totalClaimAll = parseFloat(allClaimKpi?.total_claim_all || '0');
    }

    // Hitung Metrik Eksekutif
    const totalPremi = parseFloat(prodKpi?.total_premi || '0');
    const totalClaim = parseFloat(claimKpi?.total_claim || '0');
    const totalKomisi = Math.abs(parseFloat(prodKpi?.total_komisi || '0'));
    const totalPolicies = Number(prodKpi?.total_policies || 0);
    const totalClaimsCount = Number(claimKpi?.total_claims_count || 0);

    const rawLossRatio = totalPremi > 0 ? (totalClaim / totalPremi) * 100 : null;
    const lossRatioEvaluation = evaluateLossRatio(rawLossRatio);
    const netMargin = totalPremi - totalClaim - totalKomisi;

    if (!isAgentRole) {
      allLossRatio = totalPremiAll > 0 ? (totalClaimAll / totalPremiAll) * 100 : null;
    }

    // 5. Tren Bulanan (Monthly Trend Premi vs Klaim)
    const monthlyTrendData = await db.execute<{
      period_month: string;
      premi: string;
      claim: string;
    }>(sql`
      WITH monthly_prod AS (
        SELECT 
          TO_CHAR(COALESCE(pr.issue_date, pr.start_period), 'YYYY-MM') AS period_month,
          COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS premi
        FROM production_records pr
        WHERE ${prodWhereSql}
        GROUP BY TO_CHAR(COALESCE(pr.issue_date, pr.start_period), 'YYYY-MM')
      ),
      monthly_claim AS (
        SELECT 
          TO_CHAR(cl.date_of_settlement, 'YYYY-MM') AS period_month,
          COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS claim
        FROM claims cl
        LEFT JOIN agents ag ON cl.agent_id = ag.id
        WHERE ${claimWhereSql}
        GROUP BY TO_CHAR(cl.date_of_settlement, 'YYYY-MM')
      )
      SELECT 
        COALESCE(p.period_month, c.period_month) AS period_month,
        COALESCE(p.premi, 0)::numeric(18,2) AS premi,
        COALESCE(c.claim, 0)::numeric(18,2) AS claim
      FROM monthly_prod p
      FULL OUTER JOIN monthly_claim c ON p.period_month = c.period_month
      ORDER BY period_month ASC
    `);

    const monthlyTrend = monthlyTrendData.map((row) => {
      const p = parseFloat(row.premi || '0');
      const c = parseFloat(row.claim || '0');
      const lr = p > 0 ? (c / p) * 100 : null;
      return {
        month: row.period_month,
        premi: p,
        claim: c,
        lossRatio: lr ? Math.round(lr * 100) / 100 : null,
        lossRatioEval: evaluateLossRatio(lr),
      };
    });

    // 6. Kinerja Berdasarkan Cabang (Branch Performance)
    const branchPerformanceData = await db.execute<{
      branch_id: string;
      branch_code: string;
      branch_name: string;
      total_premi: string;
      policy_count: string;
      total_claim: string;
      claim_count: string;
    }>(sql`
      WITH b_prod AS (
        SELECT 
          pr.branch_id,
          COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS total_premi,
          COUNT(DISTINCT pr.policy_no)::integer AS policy_count
        FROM production_records pr
        WHERE ${prodWhereSql}
        GROUP BY pr.branch_id
      ),
      b_claim AS (
        SELECT 
          COALESCE(cl.branch_id, ag.branch_id) AS branch_id,
          COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim,
          COUNT(DISTINCT cl.claim_no)::integer AS claim_count
        FROM claims cl
        LEFT JOIN agents ag ON cl.agent_id = ag.id
        WHERE ${claimWhereSql}
        GROUP BY COALESCE(cl.branch_id, ag.branch_id)
      )
      SELECT 
        COALESCE(b.id::text, 'UNMAPPED') AS branch_id,
        COALESCE(b.code, '-') AS branch_code,
        COALESCE(b.name, 'Cabang Belum Terpetakan') AS branch_name,
        COALESCE(bp.total_premi, 0)::numeric(18,2) AS total_premi,
        COALESCE(bp.policy_count, 0)::integer AS policy_count,
        COALESCE(bc.total_claim, 0)::numeric(18,2) AS total_claim,
        COALESCE(bc.claim_count, 0)::integer AS claim_count
      FROM branches b
      LEFT JOIN b_prod bp ON bp.branch_id = b.id
      LEFT JOIN b_claim bc ON bc.branch_id = b.id
      WHERE (COALESCE(bp.total_premi, 0) > 0 OR COALESCE(bc.total_claim, 0) > 0)
      ORDER BY total_premi DESC, total_claim DESC
    `);

    const branchPerformance = branchPerformanceData.map((row) => {
      const p = parseFloat(row.total_premi || '0');
      const c = parseFloat(row.total_claim || '0');
      const lr = p > 0 ? (c / p) * 100 : null;
      return {
        branchId: row.branch_id,
        branchCode: row.branch_code,
        branchName: row.branch_name,
        premi: p,
        policyCount: Number(row.policy_count || 0),
        claim: c,
        claimCount: Number(row.claim_count || 0),
        lossRatio: lr ? Math.round(lr * 100) / 100 : null,
        lossRatioEval: evaluateLossRatio(lr),
      };
    });

    // 7. Breakdown Komposisi Produk Asuransi (Product Breakdown)
    const productBreakdownData = await db.execute<{
      product_name: string;
      total_premi: string;
      policy_count: string;
      total_claim: string;
      claim_count: string;
    }>(sql`
      WITH p_prod AS (
        SELECT 
          COALESCE(pr.product, 'Lainnya') AS product_name,
          COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS total_premi,
          COUNT(DISTINCT pr.policy_no)::integer AS policy_count
        FROM production_records pr
        WHERE ${prodWhereSql}
        GROUP BY COALESCE(pr.product, 'Lainnya')
      ),
      p_claim AS (
        SELECT 
          COALESCE(cl.nama_produk, 'Lainnya') AS product_name,
          COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim,
          COUNT(DISTINCT cl.claim_no)::integer AS claim_count
        FROM claims cl
        LEFT JOIN agents ag ON cl.agent_id = ag.id
        WHERE ${claimWhereSql}
        GROUP BY COALESCE(cl.nama_produk, 'Lainnya')
      )
      SELECT 
        COALESCE(pp.product_name, pc.product_name) AS product_name,
        COALESCE(pp.total_premi, 0)::numeric(18,2) AS total_premi,
        COALESCE(pp.policy_count, 0)::integer AS policy_count,
        COALESCE(pc.total_claim, 0)::numeric(18,2) AS total_claim,
        COALESCE(pc.claim_count, 0)::integer AS claim_count
      FROM p_prod pp
      FULL OUTER JOIN p_claim pc ON LOWER(pp.product_name) = LOWER(pc.product_name)
      ORDER BY total_premi DESC, total_claim DESC
      LIMIT 10
    `);

    const productBreakdown = productBreakdownData.map((row) => {
      const p = parseFloat(row.total_premi || '0');
      const c = parseFloat(row.total_claim || '0');
      const lr = p > 0 ? (c / p) * 100 : null;
      return {
        product: row.product_name,
        premi: p,
        policyCount: Number(row.policy_count || 0),
        claim: c,
        claimCount: Number(row.claim_count || 0),
        lossRatio: lr ? Math.round(lr * 100) / 100 : null,
        lossRatioEval: evaluateLossRatio(lr),
      };
    });

    // 8. Top Penyebab Klaim (Cause of Loss)
    const causeOfLossData = await db.execute<{
      cause_of_loss: string;
      total_claim: string;
      claim_count: string;
    }>(sql`
      SELECT 
        COALESCE(NULLIF(TRIM(cl.cause_of_loss), ''), 'Tidak Disebutkan') AS cause_of_loss,
        COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim,
        COUNT(cl.id)::integer AS claim_count
      FROM claims cl
      LEFT JOIN agents ag ON cl.agent_id = ag.id
      WHERE ${claimWhereSql}
      GROUP BY COALESCE(NULLIF(TRIM(cl.cause_of_loss), ''), 'Tidak Disebutkan')
      ORDER BY total_claim DESC
      LIMIT 10
    `);

    const topCausesOfLoss = causeOfLossData.map((row) => {
      const c = parseFloat(row.total_claim || '0');
      const count = Number(row.claim_count || 0);
      const pctOfTotal = totalClaim > 0 ? (c / totalClaim) * 100 : 0;
      return {
        cause: row.cause_of_loss,
        claim: c,
        claimCount: count,
        pctOfTotal: Math.round(pctOfTotal * 10) / 10,
        averagePerClaim: count > 0 ? Math.round(c / count) : 0,
      };
    });

    // 9. Kinerja Agen & Agensi (Agent Performance)
    const agentPerformanceData = await db.execute<{
      agent_id: string;
      agent_code: string;
      agent_name: string;
      upline_agent_code: string | null;
      upline_name: string | null;
      peringkat: string;
      branch_name: string;
      materialized_path: string | null;
      depth: number | null;
      total_premi: string;
      policy_count: string;
      total_claim: string;
      claim_count: string;
    }>(sql`
      WITH a_prod AS (
        SELECT 
          pr.agent_id,
          COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS total_premi,
          COUNT(DISTINCT pr.policy_no)::integer AS policy_count
        FROM production_records pr
        WHERE ${prodWhereSql}
        GROUP BY pr.agent_id
      ),
      a_claim AS (
        SELECT 
          cl.agent_id,
          COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim,
          COUNT(DISTINCT cl.claim_no)::integer AS claim_count
        FROM claims cl
        LEFT JOIN agents ag ON cl.agent_id = ag.id
        WHERE ${claimWhereSql}
        GROUP BY cl.agent_id
      )
      SELECT 
        ag.id AS agent_id,
        ag.agent_code,
        ag.name AS agent_name,
        ag.upline_agent_code,
        up.name AS upline_name,
        COALESCE(ag.peringkat, '-') AS peringkat,
        COALESCE(b.name, COALESCE(ag.raw_branch_name, '-')) AS branch_name,
        ag.materialized_path,
        ag.depth,
        COALESCE(ap.total_premi, 0)::numeric(18,2) AS total_premi,
        COALESCE(ap.policy_count, 0)::integer AS policy_count,
        COALESCE(ac.total_claim, 0)::numeric(18,2) AS total_claim,
        COALESCE(ac.claim_count, 0)::integer AS claim_count
      FROM agents ag
      LEFT JOIN branches b ON ag.branch_id = b.id
      LEFT JOIN agents up ON ag.upline_agent_code = up.agent_code
      LEFT JOIN a_prod ap ON ap.agent_id = ag.id
      LEFT JOIN a_claim ac ON ac.agent_id = ag.id
      ${
        targetAgentInfo && agentFilterIds && agentFilterIds.length > 0
          ? sql`WHERE ag.id IN (${sql.join(agentFilterIds.map((id) => sql`${id}::uuid`), sql`, `)})`
          : sql`WHERE (COALESCE(ap.total_premi, 0) > 0 OR COALESCE(ac.total_claim, 0) > 0)`
      }
      ORDER BY total_premi DESC, total_claim DESC
      LIMIT ${targetAgentInfo ? 500 : 50}
    `);

    const agentPerformanceRaw = agentPerformanceData.map((row) => {
      const p = parseFloat(row.total_premi || '0');
      const c = parseFloat(row.total_claim || '0');
      const lr = p > 0 ? (c / p) * 100 : null;
      return {
        agentId: row.agent_id,
        agentCode: row.agent_code,
        agentName: row.agent_name,
        uplineAgentCode: row.upline_agent_code || null,
        uplineAgentName: row.upline_name || null,
        peringkat: row.peringkat,
        branchName: row.branch_name,
        premi: p,
        policyCount: Number(row.policy_count || 0),
        claim: c,
        claimCount: Number(row.claim_count || 0),
        lossRatio: lr ? Math.round(lr * 100) / 100 : null,
        lossRatioEval: evaluateLossRatio(lr),
        relativeDepth: agentDepthMap.get(row.agent_id) ?? (targetAgentInfo && row.agent_id === targetAgentInfo.id ? 0 : 1),
        isLeader: targetAgentInfo ? row.agent_id === targetAgentInfo.id : false,
        materializedPath: row.materialized_path || '',
        hasActivity: p > 0 || c > 0,
        isAncestorOfActive: false, // akan dihitung di bawah
      };
    });

    // Hitung agen mana saja yang merupakan ancestor dari downline yang memiliki aktivitas (premi/klaim)
    const activeAgentCodes = new Set(
      agentPerformanceRaw.filter((a) => a.hasActivity).map((a) => a.agentCode)
    );
    const ancestorCodesOfActive = new Set<string>();
    agentPerformanceRaw.forEach((a) => {
      if (activeAgentCodes.has(a.agentCode)) {
        const parts = (a.materializedPath || '').split('/').filter(Boolean);
        parts.forEach((code) => ancestorCodesOfActive.add(code));
      }
    });

    agentPerformanceRaw.forEach((a) => {
      if (ancestorCodesOfActive.has(a.agentCode)) {
        a.isAncestorOfActive = true;
      }
    });

    // 9b. Kinerja Personal (khusus agen tersebut secara pribadi tanpa downline)
    let personalPerformance: {
      agentId: string;
      agentCode: string;
      agentName: string;
      peringkat: string;
      branchName: string;
      premi: number;
      policyCount: number;
      claim: number;
      claimCount: number;
      lossRatio: number | null;
      lossRatioEval: ReturnType<typeof evaluateLossRatio>;
      relativeDepth: number;
      isLeader: boolean;
      uplineAgentCode: string | null;
      uplineAgentName: string | null;
    } | null = null;

    let personalKpi: any = null;
    let personalMonthlyTrend: any[] = [];
    let personalProductBreakdown: any[] = [];

    if (targetAgentInfo) {
      const personalProdConditions = [sql`deleted_at IS NULL`, sql`agent_id = ${targetAgentInfo.id}::uuid`];
      if (startDate && endDate) {
        personalProdConditions.push(sql`COALESCE(issue_date, start_period) >= ${startDate}::date AND COALESCE(issue_date, start_period) <= ${endDate}::date`);
      }
      if (productParam) {
        personalProdConditions.push(sql`product ILIKE ${'%' + productParam + '%'}`);
      }

      const [pProd] = await db.execute<{ total_premi: string; total_komisi: string; policy_count: string }>(sql`
        SELECT 
          COALESCE(SUM(nilai_premi), 0)::numeric(18,2) AS total_premi,
          COALESCE(SUM(nilai_komisi), 0)::numeric(18,2) AS total_komisi,
          COUNT(DISTINCT policy_no)::integer AS policy_count
        FROM production_records
        WHERE ${sql.join(personalProdConditions, sql` AND `)}
      `);

      const personalClaimConditions = [
        sql`deleted_at IS NULL`,
        sql`is_mm = true`,
        sql`agent_id = ${targetAgentInfo.id}::uuid`
      ];
      if (startDate && endDate) {
        personalClaimConditions.push(sql`date_of_settlement >= ${startDate}::date AND date_of_settlement <= ${endDate}::date`);
      }
      if (uwYearParam) {
        personalClaimConditions.push(sql`uw_year = ${uwYearParam}`);
      }
      if (productParam) {
        personalClaimConditions.push(sql`nama_produk ILIKE ${'%' + productParam + '%'}`);
      }

      const [pClaim] = await db.execute<{ total_claim: string; claim_count: string }>(sql`
        SELECT 
          COALESCE(SUM(gross_claim), 0)::numeric(18,2) AS total_claim,
          COUNT(DISTINCT claim_no)::integer AS claim_count
        FROM claims
        WHERE ${sql.join(personalClaimConditions, sql` AND `)}
      `);

      const [agProfile] = await db
        .select({
          peringkat: agents.peringkat,
          rawBranch: agents.rawBranchName,
          branchName: branches.name,
        })
        .from(agents)
        .leftJoin(branches, eq(agents.branchId, branches.id))
        .where(eq(agents.id, targetAgentInfo.id))
        .limit(1);

      const pPremi = parseFloat(pProd?.total_premi || '0');
      const pClaimVal = parseFloat(pClaim?.total_claim || '0');
      const pKomisi = Math.abs(parseFloat(pProd?.total_komisi || '0'));
      const pPolicies = Number(pProd?.policy_count || 0);
      const pClaimCount = Number(pClaim?.claim_count || 0);
      const pLr = pPremi > 0 ? (pClaimVal / pPremi) * 100 : null;
      const pNetMargin = pPremi - pClaimVal - pKomisi;

      personalKpi = {
        totalPremi: pPremi,
        totalClaim: pClaimVal,
        lossRatio: pLr ? Math.round(pLr * 100) / 100 : null,
        lossRatioEval: evaluateLossRatio(pLr),
        netMargin: pNetMargin,
        totalKomisi: pKomisi,
        totalPolicies: pPolicies,
        totalClaimsCount: pClaimCount,
      };

      personalPerformance = {
        agentId: targetAgentInfo.id,
        agentCode: targetAgentInfo.agentCode,
        agentName: targetAgentInfo.name,
        peringkat: agProfile?.peringkat || '-',
        branchName: agProfile?.branchName || agProfile?.rawBranch || '-',
        premi: pPremi,
        policyCount: pPolicies,
        claim: pClaimVal,
        claimCount: pClaimCount,
        lossRatio: pLr ? Math.round(pLr * 100) / 100 : null,
        lossRatioEval: evaluateLossRatio(pLr),
        relativeDepth: 0,
        isLeader: true,
        uplineAgentCode: null,
        uplineAgentName: null,
      };

      // Query Personal Monthly Trend
      const pMonthlyData = await db.execute<{
        period_month: string;
        premi: string;
        claim: string;
      }>(sql`
        WITH monthly_prod AS (
          SELECT 
            TO_CHAR(COALESCE(issue_date, start_period), 'YYYY-MM') AS period_month,
            COALESCE(SUM(nilai_premi), 0)::numeric(18,2) AS premi
          FROM production_records
          WHERE ${sql.join(personalProdConditions, sql` AND `)}
          GROUP BY TO_CHAR(COALESCE(issue_date, start_period), 'YYYY-MM')
        ),
        monthly_claim AS (
          SELECT 
            TO_CHAR(date_of_settlement, 'YYYY-MM') AS period_month,
            COALESCE(SUM(gross_claim), 0)::numeric(18,2) AS claim
          FROM claims
          WHERE ${sql.join(personalClaimConditions, sql` AND `)}
          GROUP BY TO_CHAR(date_of_settlement, 'YYYY-MM')
        )
        SELECT 
          COALESCE(p.period_month, c.period_month) AS period_month,
          COALESCE(p.premi, 0)::numeric(18,2) AS premi,
          COALESCE(c.claim, 0)::numeric(18,2) AS claim
        FROM monthly_prod p
        FULL OUTER JOIN monthly_claim c ON p.period_month = c.period_month
        ORDER BY period_month ASC
      `);

      personalMonthlyTrend = pMonthlyData.map((row) => {
        const p = parseFloat(row.premi || '0');
        const c = parseFloat(row.claim || '0');
        const lr = p > 0 ? (c / p) * 100 : null;
        return {
          month: row.period_month,
          premi: p,
          claim: c,
          lossRatio: lr ? Math.round(lr * 100) / 100 : null,
          lossRatioEval: evaluateLossRatio(lr),
        };
      });

      // Query Personal Product Breakdown
      const pProductData = await db.execute<{
        product_name: string;
        total_premi: string;
        policy_count: string;
        total_claim: string;
        claim_count: string;
      }>(sql`
        WITH pp_prod AS (
          SELECT 
            COALESCE(product, 'Lainnya') AS product_name,
            COALESCE(SUM(nilai_premi), 0)::numeric(18,2) AS total_premi,
            COUNT(DISTINCT policy_no)::integer AS policy_count
          FROM production_records
          WHERE ${sql.join(personalProdConditions, sql` AND `)}
          GROUP BY COALESCE(product, 'Lainnya')
        ),
        pp_claim AS (
          SELECT 
            COALESCE(nama_produk, 'Lainnya') AS product_name,
            COALESCE(SUM(gross_claim), 0)::numeric(18,2) AS total_claim,
            COUNT(DISTINCT claim_no)::integer AS claim_count
          FROM claims
          WHERE ${sql.join(personalClaimConditions, sql` AND `)}
          GROUP BY COALESCE(nama_produk, 'Lainnya')
        )
        SELECT 
          COALESCE(pp.product_name, pc.product_name) AS product_name,
          COALESCE(pp.total_premi, 0)::numeric(18,2) AS total_premi,
          COALESCE(pp.policy_count, 0)::integer AS policy_count,
          COALESCE(pc.total_claim, 0)::numeric(18,2) AS total_claim,
          COALESCE(pc.claim_count, 0)::integer AS claim_count
        FROM pp_prod pp
        FULL OUTER JOIN pp_claim pc ON LOWER(pp.product_name) = LOWER(pc.product_name)
        ORDER BY total_premi DESC, total_claim DESC
        LIMIT 10
      `);

      personalProductBreakdown = pProductData.map((row) => {
        const p = parseFloat(row.total_premi || '0');
        const c = parseFloat(row.total_claim || '0');
        const lr = p > 0 ? (c / p) * 100 : null;
        return {
          product: row.product_name,
          premi: p,
          policyCount: Number(row.policy_count || 0),
          claim: c,
          claimCount: Number(row.claim_count || 0),
          lossRatio: lr ? Math.round(lr * 100) / 100 : null,
          lossRatioEval: evaluateLossRatio(lr),
        };
      });
    }

    // ── Aturan Hirarki TreeView: LEADER WAJIB DI PALING ATAS, DIIRINGI DFS SUBTREE ───
    let agentPerformance: typeof agentPerformanceRaw = [];

    if (targetAgentInfo) {
      // Kelompokkan downline berdasarkan upline_agent_code
      const byUpline = new Map<string, typeof agentPerformanceRaw>();
      agentPerformanceRaw.forEach((a) => {
        const up = a.uplineAgentCode || '__ROOT__';
        if (!byUpline.has(up)) byUpline.set(up, []);
        byUpline.get(up)!.push(a);
      });

      const leaderRow =
        agentPerformanceRaw.find((a) => a.agentId === targetAgentInfo!.id) ||
        (personalPerformance
          ? {
              ...personalPerformance,
              relativeDepth: 0,
              isLeader: true,
              materializedPath: `/${targetAgentInfo.agentCode}`,
              hasActivity: personalPerformance.premi > 0 || personalPerformance.claim > 0,
              isAncestorOfActive: true,
            }
          : null);

      const treeList: typeof agentPerformanceRaw = [];

      function traverseDfs(currentCode: string) {
        const children = byUpline.get(currentCode) || [];
        // Urutkan sibling: aktif/terkait klaim didahulukan, lalu premi tertinggi, lalu nama
        children.sort((a, b) => {
          if (a.isAncestorOfActive !== b.isAncestorOfActive) {
            return a.isAncestorOfActive ? -1 : 1;
          }
          if (b.premi !== a.premi) return b.premi - a.premi;
          if (b.claim !== a.claim) return b.claim - a.claim;
          return a.agentName.localeCompare(b.agentName);
        });

        for (const child of children) {
          treeList.push(child);
          traverseDfs(child.agentCode);
        }
      }

      if (leaderRow) {
        leaderRow.isLeader = true;
        leaderRow.relativeDepth = 0;
        treeList.push(leaderRow);
        traverseDfs(leaderRow.agentCode);
      }

      agentPerformance = treeList;
    } else {
      agentPerformance = isAgentRole ? agentPerformanceRaw : [];
    }

    // ── 9c. Kinerja Seluruh Agen (untuk Kinerja Agen pada Role Non-Agent) ──
    let allAgentsPerformance: Array<{
      agentId: string;
      agentCode: string;
      agentName: string;
      peringkat: string;
      branchName: string;
      premi: number;
      policyCount: number;
      claim: number;
      claimCount: number;
      lossRatio: number | null;
      lossRatioEval: ReturnType<typeof evaluateLossRatio>;
    }> = [];

    let allAgentsSummary: {
      totalAgents: number;
      totalPremi: number;
      totalPolicies: number;
      totalClaim: number;
      totalClaimsCount: number;
      lossRatio: number | null;
      lossRatioEval: ReturnType<typeof evaluateLossRatio>;
    } | null = null;

    if (!isAgentRole) {
      const allAgentsData = await db.execute<{
        agent_id: string;
        agent_code: string;
        agent_name: string;
        peringkat: string;
        branch_name: string;
        total_premi: string;
        policy_count: string;
        total_claim: string;
        claim_count: string;
      }>(sql`
        WITH a_prod AS (
          SELECT 
            pr.agent_id,
            COALESCE(SUM(pr.nilai_premi), 0)::numeric(18,2) AS total_premi,
            COUNT(DISTINCT pr.policy_no)::integer AS policy_count
          FROM production_records pr
          WHERE ${prodWhereSql}
          GROUP BY pr.agent_id
        ),
        a_claim AS (
          SELECT 
            cl.agent_id,
            COALESCE(SUM(cl.gross_claim), 0)::numeric(18,2) AS total_claim,
            COUNT(DISTINCT cl.claim_no)::integer AS claim_count
          FROM claims cl
          LEFT JOIN agents ag ON cl.agent_id = ag.id
          WHERE ${claimWhereSql}
          GROUP BY cl.agent_id
        )
        SELECT 
          ag.id AS agent_id,
          ag.agent_code,
          ag.name AS agent_name,
          COALESCE(ag.peringkat, '-') AS peringkat,
          COALESCE(b.name, COALESCE(ag.raw_branch_name, '-')) AS branch_name,
          COALESCE(ap.total_premi, 0)::numeric(18,2) AS total_premi,
          COALESCE(ap.policy_count, 0)::integer AS policy_count,
          COALESCE(ac.total_claim, 0)::numeric(18,2) AS total_claim,
          COALESCE(ac.claim_count, 0)::integer AS claim_count
        FROM agents ag
        LEFT JOIN branches b ON ag.branch_id = b.id
        LEFT JOIN a_prod ap ON ap.agent_id = ag.id
        LEFT JOIN a_claim ac ON ac.agent_id = ag.id
        WHERE (COALESCE(ap.total_premi, 0) > 0 OR COALESCE(ac.total_claim, 0) > 0)
        ${branchId ? sql`AND (ag.branch_id = ${branchId}::uuid OR b.id = ${branchId}::uuid)` : sql``}
        ORDER BY total_premi DESC, total_claim DESC
        LIMIT 1000
      `);

      allAgentsPerformance = allAgentsData.map((row) => {
        const p = parseFloat(row.total_premi || '0');
        const c = parseFloat(row.total_claim || '0');
        const lr = p > 0 ? (c / p) * 100 : null;
        return {
          agentId: row.agent_id,
          agentCode: row.agent_code,
          agentName: row.agent_name,
          peringkat: row.peringkat,
          branchName: row.branch_name,
          premi: p,
          policyCount: Number(row.policy_count || 0),
          claim: c,
          claimCount: Number(row.claim_count || 0),
          lossRatio: lr ? Math.round(lr * 100) / 100 : null,
          lossRatioEval: evaluateLossRatio(lr),
        };
      });

      const totalPremiSum = allAgentsPerformance.reduce((acc, a) => acc + a.premi, 0);
      const totalClaimSum = allAgentsPerformance.reduce((acc, a) => acc + a.claim, 0);
      const totalPoliciesSum = allAgentsPerformance.reduce((acc, a) => acc + a.policyCount, 0);
      const totalClaimsCountSum = allAgentsPerformance.reduce((acc, a) => acc + a.claimCount, 0);
      const allLr = totalPremiSum > 0 ? (totalClaimSum / totalPremiSum) * 100 : null;

      allAgentsSummary = {
        totalAgents: allAgentsPerformance.length,
        totalPremi: totalPremiSum,
        totalPolicies: totalPoliciesSum,
        totalClaim: totalClaimSum,
        totalClaimsCount: totalClaimsCountSum,
        lossRatio: allLr ? Math.round(allLr * 100) / 100 : null,
        lossRatioEval: evaluateLossRatio(allLr),
      };
    }

    // ── 9d. Kinerja Group Target (Group KPI, Monthly Trend, Product Breakdown) ──
    let groupKpi: any = null;
    let groupMonthlyTrend: any[] = [];
    let groupProductBreakdown: any[] = [];

    if (targetAgentInfo && agentFilterIds && agentFilterIds.length > 0) {
      if (isAgentRole) {
        groupKpi = {
          totalPremi,
          totalClaim,
          lossRatio: rawLossRatio ? Math.round(rawLossRatio * 100) / 100 : null,
          lossRatioEval: lossRatioEvaluation,
          netMargin,
          totalKomisi,
          totalPolicies,
          totalClaimsCount,
        };
        groupMonthlyTrend = monthlyTrend;
        groupProductBreakdown = productBreakdown;
      } else {
        const groupProdConditions = [
          sql`deleted_at IS NULL`,
          sql`agent_id IN (${sql.join(agentFilterIds.map((id) => sql`${id}::uuid`), sql`, `)})`
        ];
        if (startDate && endDate) {
          groupProdConditions.push(sql`COALESCE(issue_date, start_period) >= ${startDate}::date AND COALESCE(issue_date, start_period) <= ${endDate}::date`);
        }
        if (productParam) {
          groupProdConditions.push(sql`product ILIKE ${'%' + productParam + '%'}`);
        }

        const [gProd] = await db.execute<{ total_premi: string; total_komisi: string; policy_count: string }>(sql`
          SELECT 
            COALESCE(SUM(nilai_premi), 0)::numeric(18,2) AS total_premi,
            COALESCE(SUM(nilai_komisi), 0)::numeric(18,2) AS total_komisi,
            COUNT(DISTINCT policy_no)::integer AS policy_count
          FROM production_records
          WHERE ${sql.join(groupProdConditions, sql` AND `)}
        `);

        const groupClaimConditions = [
          sql`deleted_at IS NULL`,
          sql`is_mm = true`,
          sql`agent_id IN (${sql.join(agentFilterIds.map((id) => sql`${id}::uuid`), sql`, `)})`
        ];
        if (startDate && endDate) {
          groupClaimConditions.push(sql`date_of_settlement >= ${startDate}::date AND date_of_settlement <= ${endDate}::date`);
        }
        if (uwYearParam) {
          groupClaimConditions.push(sql`uw_year = ${uwYearParam}`);
        }
        if (productParam) {
          groupClaimConditions.push(sql`nama_produk ILIKE ${'%' + productParam + '%'}`);
        }

        const [gClaim] = await db.execute<{ total_claim: string; claim_count: string }>(sql`
          SELECT 
            COALESCE(SUM(gross_claim), 0)::numeric(18,2) AS total_claim,
            COUNT(DISTINCT claim_no)::integer AS claim_count
          FROM claims
          WHERE ${sql.join(groupClaimConditions, sql` AND `)}
        `);

        const gPremi = parseFloat(gProd?.total_premi || '0');
        const gClaimVal = parseFloat(gClaim?.total_claim || '0');
        const gKomisi = Math.abs(parseFloat(gProd?.total_komisi || '0'));
        const gPolicies = Number(gProd?.policy_count || 0);
        const gClaimCount = Number(gClaim?.claim_count || 0);
        const gLr = gPremi > 0 ? (gClaimVal / gPremi) * 100 : null;

        groupKpi = {
          totalPremi: gPremi,
          totalClaim: gClaimVal,
          lossRatio: gLr ? Math.round(gLr * 100) / 100 : null,
          lossRatioEval: evaluateLossRatio(gLr),
          netMargin: gPremi - gClaimVal - gKomisi,
          totalKomisi: gKomisi,
          totalPolicies: gPolicies,
          totalClaimsCount: gClaimCount,
        };

        const gMonthlyData = await db.execute<{
          period_month: string;
          premi: string;
          claim: string;
        }>(sql`
          WITH monthly_prod AS (
            SELECT 
              TO_CHAR(COALESCE(issue_date, start_period), 'YYYY-MM') AS period_month,
              COALESCE(SUM(nilai_premi), 0)::numeric(18,2) AS premi
            FROM production_records
            WHERE ${sql.join(groupProdConditions, sql` AND `)}
            GROUP BY TO_CHAR(COALESCE(issue_date, start_period), 'YYYY-MM')
          ),
          monthly_claim AS (
            SELECT 
              TO_CHAR(date_of_settlement, 'YYYY-MM') AS period_month,
              COALESCE(SUM(gross_claim), 0)::numeric(18,2) AS claim
            FROM claims
            WHERE ${sql.join(groupClaimConditions, sql` AND `)}
            GROUP BY TO_CHAR(date_of_settlement, 'YYYY-MM')
          )
          SELECT 
            COALESCE(p.period_month, c.period_month) AS period_month,
            COALESCE(p.premi, 0)::numeric(18,2) AS premi,
            COALESCE(c.claim, 0)::numeric(18,2) AS claim
          FROM monthly_prod p
          FULL OUTER JOIN monthly_claim c ON p.period_month = c.period_month
          ORDER BY period_month ASC
        `);

        groupMonthlyTrend = gMonthlyData.map((row) => {
          const p = parseFloat(row.premi || '0');
          const c = parseFloat(row.claim || '0');
          const lr = p > 0 ? (c / p) * 100 : null;
          return {
            month: row.period_month,
            premi: p,
            claim: c,
            lossRatio: lr ? Math.round(lr * 100) / 100 : null,
            lossRatioEval: evaluateLossRatio(lr),
          };
        });

        const gProductData = await db.execute<{
          product_name: string;
          total_premi: string;
          policy_count: string;
          total_claim: string;
          claim_count: string;
        }>(sql`
          WITH pp_prod AS (
            SELECT 
              COALESCE(product, 'Lainnya') AS product_name,
              COALESCE(SUM(nilai_premi), 0)::numeric(18,2) AS total_premi,
              COUNT(DISTINCT policy_no)::integer AS policy_count
            FROM production_records
            WHERE ${sql.join(groupProdConditions, sql` AND `)}
            GROUP BY COALESCE(product, 'Lainnya')
          ),
          pp_claim AS (
            SELECT 
              COALESCE(nama_produk, 'Lainnya') AS product_name,
              COALESCE(SUM(gross_claim), 0)::numeric(18,2) AS total_claim,
              COUNT(DISTINCT claim_no)::integer AS claim_count
            FROM claims
            WHERE ${sql.join(groupClaimConditions, sql` AND `)}
            GROUP BY COALESCE(nama_produk, 'Lainnya')
          )
          SELECT 
            COALESCE(pp.product_name, pc.product_name) AS product_name,
            COALESCE(pp.total_premi, 0)::numeric(18,2) AS total_premi,
            COALESCE(pp.policy_count, 0)::integer AS policy_count,
            COALESCE(pc.total_claim, 0)::numeric(18,2) AS total_claim,
            COALESCE(pc.claim_count, 0)::integer AS claim_count
          FROM pp_prod pp
          FULL OUTER JOIN pp_claim pc ON LOWER(pp.product_name) = LOWER(pc.product_name)
          ORDER BY total_premi DESC, total_claim DESC
          LIMIT 10
        `);

        groupProductBreakdown = gProductData.map((row) => {
          const p = parseFloat(row.total_premi || '0');
          const c = parseFloat(row.total_claim || '0');
          const lr = p > 0 ? (c / p) * 100 : null;
          return {
            product: row.product_name,
            premi: p,
            policyCount: Number(row.policy_count || 0),
            claim: c,
            claimCount: Number(row.claim_count || 0),
            lossRatio: lr ? Math.round(lr * 100) / 100 : null,
            lossRatioEval: evaluateLossRatio(lr),
          };
        });
      }
    }

    // 10. Ambil Daftar Tahun Underwriting (UW Years) yang Tersedia
    const uwYearRows = await db.execute<{ uw_year: string }>(sql`
      SELECT DISTINCT uw_year 
      FROM claims 
      WHERE deleted_at IS NULL AND uw_year IS NOT NULL 
      ORDER BY uw_year DESC
    `);
    const availableUwYears = uwYearRows.map((r) => r.uw_year);

    // Diagnostics Data Status
    const hasProduction = totalPremi > 0 || totalPolicies > 0;
    const hasClaims = totalClaim > 0 || totalClaimsCount > 0;
    let emptyReason: string | null = null;

    if (!hasProduction && !hasClaims) {
      emptyReason = 'Belum ada data produksi dan belum ada data klaim yang tercatat pada filter periode ini.';
    } else if (!hasProduction && hasClaims) {
      emptyReason = 'Belum ada data produksi (premi) yang tercatat pada periode ini (hanya terdapat klaim).';
    } else if (hasProduction && !hasClaims) {
      emptyReason = 'Belum ada klaim yang tercatat pada periode ini (Loss Ratio 0,00% - Sehat).';
    }

    // Kirim respons JSON terstruktur
    return NextResponse.json({
      success: true,
      diagnostics: {
        hasProduction,
        hasClaims,
        emptyReason,
      },
      isAgentRole: Boolean(isAgentRole),
      filter: {
        activeCutoffYear,
        cutoffPeriod: activeCutoffYear ? getCutoffPeriod(activeCutoffYear) : null,
        availableCutoffs: getAvailableCutoffYears(6),
        startDate,
        endDate,
        branchId: branchId || null,
        branchName: selectedBranchInfo?.name || null,
        selectedBranch: selectedBranchInfo,
        agentCode: agentCodeParam || null,
        targetAgent: targetAgentInfo,
        includeDownlines,
        maxDepth: parsedMaxDepth,
        uwYear: uwYearParam || null,
        availableUwYears,
        product: productParam || null,
      },
      kpi: {
        totalPremi,
        totalClaim,
        lossRatio: rawLossRatio ? Math.round(rawLossRatio * 100) / 100 : null,
        lossRatioEval: lossRatioEvaluation,
        netMargin,
        totalKomisi,
        totalPolicies,
        totalClaimsCount,
        // ALL LR Metrics untuk role manajemen
        totalPremiAll,
        totalClaimAll,
        allLossRatio: allLossRatio ? Math.round(allLossRatio * 100) / 100 : null,
        allLossRatioEval: evaluateLossRatio(allLossRatio),
      },
      monthlyTrend,
      branchPerformance,
      productBreakdown,
      topCausesOfLoss,
      allAgentsPerformance,
      allAgentsSummary,
      agentPerformance,
      personalPerformance,
      personalKpi,
      personalMonthlyTrend,
      personalProductBreakdown,
      groupKpi,
      groupMonthlyTrend,
      groupProductBreakdown,
    });
  } catch (err: any) {
    console.error('Error fetching analytics data:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal memproses data analitik',
        friendlyMessage: 'Belum ada data transaksi yang dapat diolah atau parameter filter tidak sesuai.',
      },
      { status: 500 }
    );
  }
}
