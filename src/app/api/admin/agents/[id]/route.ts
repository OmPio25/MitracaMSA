import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, branches, productionRecords, claims } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';
import { refreshAllHierarchyPaths, executeSelfHealingPass } from '@/lib/ingestion/self-healing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/agents/[id]
 * Mengambil detail lengkap satu agen beserta silsilah upline dan daftar downline langsung
 * Akses: SUPERADMIN & ADMIN
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN dan ADMIN yang berhak mengakses detail agen' },
        { status: 403 }
      );
    }

    const { id } = params;

    // 1. Ambil Profil Agen
    const [agent] = await db
      .select({
        id: agents.id,
        agentCode: agents.agentCode,
        name: agents.name,
        profId: agents.profId,
        statusKeagenan: agents.statusKeagenan,
        uplineAgentCode: agents.uplineAgentCode,
        peringkat: agents.peringkat,
        rawBranchName: agents.rawBranchName,
        parentId: agents.parentId,
        uplineStatus: agents.uplineStatus,
        materializedPath: agents.materializedPath,
        depth: agents.depth,
        branchId: agents.branchId,
        email: agents.email,
        phone: agents.phone,
        isPlaceholder: agents.isPlaceholder,
        isActive: agents.isActive,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ success: false, error: 'Agen tidak ditemukan' }, { status: 404 });
    }

    // 2. Ambil Info Cabang
    let branchInfo = null;
    if (agent.branchId) {
      const [branch] = await db
        .select({ id: branches.id, code: branches.code, name: branches.name })
        .from(branches)
        .where(eq(branches.id, agent.branchId))
        .limit(1);
      branchInfo = branch || null;
    }

    // 3. Ambil Info Upline Langsung
    let uplineInfo = null;
    if (agent.parentId) {
      const [upline] = await db
        .select({
          id: agents.id,
          agentCode: agents.agentCode,
          name: agents.name,
          peringkat: agents.peringkat,
          rawBranchName: agents.rawBranchName,
        })
        .from(agents)
        .where(eq(agents.id, agent.parentId))
        .limit(1);
      uplineInfo = upline || null;
    }

    // 4. Ambil Daftar Downline Langsung (Direct Level 1 Downlines)
    const directDownlines = await db
      .select({
        id: agents.id,
        agentCode: agents.agentCode,
        name: agents.name,
        peringkat: agents.peringkat,
        statusKeagenan: agents.statusKeagenan,
        rawBranchName: agents.rawBranchName,
        depth: agents.depth,
      })
      .from(agents)
      .where(eq(agents.parentId, agent.id))
      .orderBy(agents.agentCode);

    // 5. Hitung Agregasi Portofolio Singkat (Polis & Klaim Pribadi)
    const prodStats = await db.execute(sql`
      SELECT 
        COUNT(*)::int AS "totalPolicies",
        COALESCE(SUM(nilai_premi), 0)::numeric AS "totalPremi",
        COALESCE(SUM(tsi_in_idr), 0)::numeric AS "totalTsi"
      FROM production_records
      WHERE agent_id = ${agent.id} AND deleted_at IS NULL
    `);
    const prodRows = (prodStats as any)?.rows || prodStats || [];
    const productionSummary = prodRows[0] || { totalPolicies: 0, totalPremi: '0', totalTsi: '0' };

    const claimStats = await db.execute(sql`
      SELECT 
        COUNT(*)::int AS "totalClaims",
        COALESCE(SUM(gross_claim), 0)::numeric AS "totalClaimAmount"
      FROM claims
      WHERE agent_id = ${agent.id} AND deleted_at IS NULL
    `);
    const claimRows = (claimStats as any)?.rows || claimStats || [];
    const claimSummary = claimRows[0] || { totalClaims: 0, totalClaimAmount: '0' };

    // 6. Parsing Silsilah Ancestor Path
    const ancestorCodes = (agent.materializedPath || '')
      .split('/')
      .filter((code) => code && code !== agent.agentCode);

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        branch: branchInfo,
        upline: uplineInfo,
        ancestorCodes,
        directDownlines,
        productionSummary,
        claimSummary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching agent detail:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat detail agen' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/agents/[id]
 * Mengubah data agen, status, cabang, serta mutasi upline (dengan proteksi siklus hirarki)
 * Akses: SUPERADMIN & ADMIN
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN dan ADMIN yang berhak mengubah agen' },
        { status: 403 }
      );
    }

    const { id } = params;

    // 1. Cek keberadaan agen
    const [currentAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    if (!currentAgent) {
      return NextResponse.json({ success: false, error: 'Agen tidak ditemukan' }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, any> = {
      updatedAt: sql`NOW()`,
      updatedBy: session.userId,
    };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ success: false, error: 'Nama agen tidak boleh kosong' }, { status: 400 });
      }
      updateData.name = name;
      updateData.isPlaceholder = false; // Jika nama sudah diisi manual, bukan placeholder lagi
    }

    if (body.profId !== undefined) {
      updateData.profId = body.profId ? String(body.profId).trim() : null;
    }

    if (body.peringkat !== undefined) {
      updateData.peringkat = body.peringkat ? String(body.peringkat).trim() : null;
    }

    if (body.statusKeagenan !== undefined) {
      const s = String(body.statusKeagenan).trim();
      updateData.statusKeagenan = s;
      updateData.isActive = s.toLowerCase() === 'aktif';
    }

    if (body.email !== undefined) {
      updateData.email = body.email ? String(body.email).trim() : null;
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone ? String(body.phone).trim() : null;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    // Update Cabang
    if (body.branchId !== undefined) {
      if (body.branchId) {
        const [branch] = await db
          .select({ name: branches.name })
          .from(branches)
          .where(eq(branches.id, body.branchId))
          .limit(1);
        if (branch) {
          updateData.branchId = body.branchId;
          updateData.rawBranchName = branch.name;
        }
      } else {
        updateData.branchId = null;
      }
    }

    // 2. Logika Mutasi Upline (Pindah Upline) dengan Anti-Circular Hierarchy Validation
    let isUplineChanged = false;

    if (body.uplineAgentCode !== undefined) {
      const newUplineCode = body.uplineAgentCode ? String(body.uplineAgentCode).trim().toUpperCase() : null;

      if (newUplineCode !== currentAgent.uplineAgentCode) {
        isUplineChanged = true;

        if (!newUplineCode) {
          // Dijadikan Root Leader (Tanpa Upline)
          updateData.parentId = null;
          updateData.uplineAgentCode = null;
          updateData.uplineStatus = 'ROOT';
          updateData.materializedPath = `/${currentAgent.agentCode}`;
          updateData.depth = 0;
        } else {
          // Cek 1: Tidak boleh memilih diri sendiri
          if (newUplineCode === currentAgent.agentCode) {
            return NextResponse.json(
              { success: false, error: 'Agen tidak dapat memilih dirinya sendiri sebagai upline.' },
              { status: 400 }
            );
          }

          // Cari data calon upline baru
          const [targetUpline] = await db
            .select({
              id: agents.id,
              agentCode: agents.agentCode,
              materializedPath: agents.materializedPath,
              depth: agents.depth,
            })
            .from(agents)
            .where(eq(agents.agentCode, newUplineCode))
            .limit(1);

          if (targetUpline) {
            // Cek 2: Anti-Circular Validation: target upline TIDAK boleh merupakan downline dari agen ini
            const targetPath = targetUpline.materializedPath || `/${targetUpline.agentCode}`;
            if (
              targetPath.includes(`/${currentAgent.agentCode}/`) ||
              targetPath.endsWith(`/${currentAgent.agentCode}`)
            ) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Siklus hirarki terlarang: Agen '${targetUpline.agentCode}' adalah bawahan (downline) dari '${currentAgent.agentCode}'. Tidak dapat dipilih sebagai upline.`,
                },
                { status: 400 }
              );
            }

            updateData.parentId = targetUpline.id;
            updateData.uplineAgentCode = targetUpline.agentCode;
            updateData.uplineStatus = 'LINKED';
            updateData.materializedPath = `${targetPath}/${currentAgent.agentCode}`;
            updateData.depth = (targetUpline.depth ?? 0) + 1;
          } else {
            // Upline belum ada di database, set PENDING_UPLINE
            updateData.parentId = null;
            updateData.uplineAgentCode = newUplineCode;
            updateData.uplineStatus = 'PENDING_UPLINE';
            updateData.materializedPath = `/${currentAgent.agentCode}`;
            updateData.depth = 0;
          }
        }
      }
    }

    // 3. Jalankan Update Database
    const [updatedAgent] = await db
      .update(agents)
      .set(updateData)
      .where(eq(agents.id, id))
      .returning();

    // 4. Jika upline berubah, refresh seluruh jalur pohon hirarki secara berantai (cascading)
    if (isUplineChanged) {
      try {
        await refreshAllHierarchyPaths();
        await executeSelfHealingPass();
      } catch (pathErr) {
        console.warn('Hierarchy path cascade refresh notice:', pathErr);
      }
    }

    // 5. Catat Audit Log
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'AGENT_UPDATED',
      category: 'SYSTEM',
      status: 'SUCCESS',
      description: `Perbarui data agen: '${updatedAgent.agentCode}' - ${updatedAgent.name}${
        isUplineChanged ? ` (Mutasi Upline ke '${updatedAgent.uplineAgentCode || 'ROOT'}')` : ''
      }`,
      req,
      metadata: {
        agentId: updatedAgent.id,
        agentCode: updatedAgent.agentCode,
        isUplineChanged,
        newUpline: updatedAgent.uplineAgentCode,
        newStatus: updatedAgent.statusKeagenan,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Data agen '${updatedAgent.agentCode}' berhasil diperbarui!`,
      agent: updatedAgent,
    });
  } catch (error: any) {
    console.error('Error updating master agent:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui data agen' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/agents/[id]
 * Menonaktifkan agen (Soft Deactivate) untuk menjaga integritas data riwayat polis/klaim
 * Akses: SUPERADMIN & ADMIN
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN dan ADMIN yang berhak menonaktifkan agen' },
        { status: 403 }
      );
    }

    const { id } = params;

    const [agent] = await db
      .select({ id: agents.id, agentCode: agents.agentCode, name: agents.name })
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ success: false, error: 'Agen tidak ditemukan' }, { status: 404 });
    }

    // Nonaktifkan status agen (tetap tersimpan di direktori, tidak dihapus fisik)
    await db
      .update(agents)
      .set({
        isActive: false,
        statusKeagenan: 'Non Aktif',
        updatedAt: sql`NOW()`,
        updatedBy: session.userId,
      })
      .where(eq(agents.id, id));

    // Catat Audit Log
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'AGENT_DEACTIVATED',
      category: 'SYSTEM',
      status: 'SUCCESS',
      description: `Nonaktifkan agen: '${agent.agentCode}' - ${agent.name}`,
      req,
      metadata: { agentId: agent.id, agentCode: agent.agentCode },
    });

    return NextResponse.json({
      success: true,
      message: `Agen '${agent.agentCode}' - ${agent.name} berhasil dinonaktifkan!`,
    });
  } catch (error: any) {
    console.error('Error deactivating master agent:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menonaktifkan agen' },
      { status: 500 }
    );
  }
}
