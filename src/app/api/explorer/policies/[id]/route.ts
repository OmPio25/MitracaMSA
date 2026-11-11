import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productionRecords, claims, agents, branches } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import { getProductionScopeFilter } from '@/lib/auth/rbac-filter';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const policyId = params.id;
    if (!policyId) {
      return NextResponse.json({ error: 'ID Polis tidak valid' }, { status: 400 });
    }

    const conditions = [
      eq(productionRecords.id, policyId),
      sql`${productionRecords.deletedAt} IS NULL`,
    ];

    const rbacFilter = getProductionScopeFilter(session);
    if (rbacFilter) {
      conditions.push(rbacFilter);
    }

    const [policy] = await db
      .select({
        id: productionRecords.id,
        policyNo: productionRecords.policyNo,
        spauNo: productionRecords.spauNo,
        spauType: productionRecords.spauType,
        policyStatus: productionRecords.policyStatus,
        bulan: productionRecords.bulan,
        period: productionRecords.period,
        startPeriod: productionRecords.startPeriod,
        endPeriod: productionRecords.endPeriod,
        insuredName: productionRecords.insuredName,
        product: productionRecords.product,
        coverage: productionRecords.coverage,
        renewed: productionRecords.renewed,
        prevPolicy: productionRecords.prevPolicy,
        currencyTsi: productionRecords.currencyTsi,
        rateTsi: productionRecords.rateTsi,
        tsi: productionRecords.tsi,
        tsiInIdr: productionRecords.tsiInIdr,
        nilaiPremi: productionRecords.nilaiPremi,
        nilaiKomisi: productionRecords.nilaiKomisi,
        nilaiDiskon: productionRecords.nilaiDiskon,
        nilaiAkusisi: productionRecords.nilaiAkusisi,
        sourceAgentId: productionRecords.sourceAgentId,
        agentName: productionRecords.agentName,
        agentStatus: productionRecords.agentStatus,
        rawBranch: productionRecords.rawBranch,
        representative: productionRecords.representative,
        objectDetails: productionRecords.objectDetails,
        isMm: productionRecords.isMm,
        createdAt: productionRecords.createdAt,
        updatedAt: productionRecords.updatedAt,
        // Agent relations
        agentId: productionRecords.agentId,
        agentRealCode: agents.agentCode,
        agentRealName: agents.name,
        agentPeringkat: agents.peringkat,
        agentMaterializedPath: agents.materializedPath,
        agentUplineCode: agents.uplineAgentCode,
        // Branch relations
        branchId: productionRecords.branchId,
        branchName: branches.name,
        branchCode: branches.code,
      })
      .from(productionRecords)
      .leftJoin(agents, eq(productionRecords.agentId, agents.id))
      .leftJoin(branches, eq(productionRecords.branchId, branches.id))
      .where(and(...conditions))
      .limit(1);

    if (!policy) {
      return NextResponse.json({ error: 'Polis tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
    }

    // Also fetch related claims for this policy number (Prioritize MM claims first)
    const relatedClaims = await db
      .select({
        id: claims.id,
        claimNo: claims.claimNo,
        dateOfSettlement: claims.dateOfSettlement,
        uwYear: claims.uwYear,
        grossClaim: claims.grossClaim,
        causeOfLoss: claims.causeOfLoss,
        namaProduk: claims.namaProduk,
        indemnity: claims.indemnity,
        deductible: claims.deductible,
        currency: claims.currency,
        sourceAgentId: claims.sourceAgentId,
        isMm: claims.isMm,
      })
      .from(claims)
      .where(
        and(
          eq(claims.policyNo, policy.policyNo),
          sql`${claims.deletedAt} IS NULL`
        )
      )
      .orderBy(sql`${claims.isMm} DESC`, sql`${claims.dateOfSettlement} DESC`);

    return NextResponse.json({
      success: true,
      policy,
      relatedClaims,
    });
  } catch (err: any) {
    console.error('Error fetching policy detail:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memuat detail polis' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/explorer/policies/[id]
 * Mengalihkan agen pada suatu data polis ke agen lain (Superadmin & Admin)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    if (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN dan ADMIN yang berhak mengalihkan agen polis' },
        { status: 403 }
      );
    }

    const policyId = params.id;
    if (!policyId) {
      return NextResponse.json({ success: false, error: 'ID Polis tidak valid' }, { status: 400 });
    }

    const body = await req.json();
    const { targetAgentId } = body;

    if (!targetAgentId) {
      return NextResponse.json(
        { success: false, error: 'Target Agen wajib dipilih' },
        { status: 400 }
      );
    }

    // 1. Dapatkan data agen target
    const [targetAgent] = await db
      .select({
        id: agents.id,
        agentCode: agents.agentCode,
        name: agents.name,
        branchId: agents.branchId,
        peringkat: agents.peringkat,
      })
      .from(agents)
      .where(and(eq(agents.id, targetAgentId), sql`${agents.deletedAt} IS NULL`))
      .limit(1);

    if (!targetAgent) {
      return NextResponse.json(
        { success: false, error: 'Agen target tidak ditemukan di master agen' },
        { status: 404 }
      );
    }

    // 2. Dapatkan data polis saat ini
    const [existingPolicy] = await db
      .select({
        id: productionRecords.id,
        policyNo: productionRecords.policyNo,
        sourceAgentId: productionRecords.sourceAgentId,
        agentName: productionRecords.agentName,
        agentId: productionRecords.agentId,
        branchId: productionRecords.branchId,
      })
      .from(productionRecords)
      .where(and(eq(productionRecords.id, policyId), sql`${productionRecords.deletedAt} IS NULL`))
      .limit(1);

    if (!existingPolicy) {
      return NextResponse.json(
        { success: false, error: 'Polis tidak ditemukan' },
        { status: 404 }
      );
    }

    // 3. Update data polis ke agen baru
    await db
      .update(productionRecords)
      .set({
        agentId: targetAgent.id,
        sourceAgentId: targetAgent.agentCode,
        agentName: targetAgent.name,
        branchId: targetAgent.branchId,
        updatedAt: new Date(),
      })
      .where(eq(productionRecords.id, policyId));

    // 4. Update data klaim terkait jika ada
    if (existingPolicy.policyNo) {
      await db
        .update(claims)
        .set({
          agentId: targetAgent.id,
          sourceAgentId: targetAgent.agentCode,
          branchId: targetAgent.branchId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(claims.policyNo, existingPolicy.policyNo),
            sql`${claims.deletedAt} IS NULL`
          )
        );
    }

    // 5. Catat ke Audit Log
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'POLICY_AGENT_REASSIGNED',
      category: 'SYSTEM',
      status: 'SUCCESS',
      description: `Pengalihan agen polis ${existingPolicy.policyNo} dari [${existingPolicy.sourceAgentId}] ${existingPolicy.agentName || '-'} ke [${targetAgent.agentCode}] ${targetAgent.name}`,
      metadata: {
        policyId,
        policyNo: existingPolicy.policyNo,
        previousAgent: {
          id: existingPolicy.agentId,
          code: existingPolicy.sourceAgentId,
          name: existingPolicy.agentName,
        },
        targetAgent: {
          id: targetAgent.id,
          code: targetAgent.agentCode,
          name: targetAgent.name,
          branchId: targetAgent.branchId,
        },
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Polis ${existingPolicy.policyNo} berhasil dialihkan ke agen [${targetAgent.agentCode}] ${targetAgent.name}`,
      targetAgent,
    });
  } catch (err: any) {
    console.error('Error reassigning policy agent:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal mengalihkan agen pada polis' },
      { status: 500 }
    );
  }
}
