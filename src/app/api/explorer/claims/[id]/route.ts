import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { claims, agents, branches } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/explorer/claims/[id]
 * Mengalihkan agen pada data klaim ke agen lain (Superadmin & Admin)
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
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN dan ADMIN yang berhak mengalihkan agen klaim' },
        { status: 403 }
      );
    }

    const claimId = params.id;
    if (!claimId) {
      return NextResponse.json({ success: false, error: 'ID Klaim tidak valid' }, { status: 400 });
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

    // 2. Dapatkan data klaim saat ini
    const [existingClaim] = await db
      .select({
        id: claims.id,
        claimNo: claims.claimNo,
        policyNo: claims.policyNo,
        sourceAgentId: claims.sourceAgentId,
        agentId: claims.agentId,
        branchId: claims.branchId,
      })
      .from(claims)
      .where(and(eq(claims.id, claimId), sql`${claims.deletedAt} IS NULL`))
      .limit(1);

    if (!existingClaim) {
      return NextResponse.json(
        { success: false, error: 'Klaim tidak ditemukan' },
        { status: 404 }
      );
    }

    // 3. Update klaim ke agen baru
    await db
      .update(claims)
      .set({
        agentId: targetAgent.id,
        sourceAgentId: targetAgent.agentCode,
        branchId: targetAgent.branchId,
        updatedAt: new Date(),
      })
      .where(eq(claims.id, claimId));

    // 4. Catat Audit Log
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'CLAIM_AGENT_REASSIGNED',
      category: 'SYSTEM',
      status: 'SUCCESS',
      description: `Pengalihan agen klaim ${existingClaim.claimNo} dari [${existingClaim.sourceAgentId}] ke [${targetAgent.agentCode}] ${targetAgent.name}`,
      metadata: {
        claimId,
        claimNo: existingClaim.claimNo,
        policyNo: existingClaim.policyNo,
        previousAgent: {
          id: existingClaim.agentId,
          code: existingClaim.sourceAgentId,
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
      message: `Klaim ${existingClaim.claimNo} berhasil dialihkan ke agen [${targetAgent.agentCode}] ${targetAgent.name}`,
      targetAgent,
    });
  } catch (err: any) {
    console.error('Error reassigning claim agent:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal mengalihkan agen pada klaim' },
      { status: 500 }
    );
  }
}
