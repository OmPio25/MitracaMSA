import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/db';
import { branches, auditLogs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi tidak valid' },
        { status: 401 }
      );
    }

    // Eksklusif khusus SUPERADMIN
    if (session.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN yang berwenang mengatur izin akses portal cabang' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const branchId = String(body.branchId || '').trim();
    const isPortalActive = Boolean(body.isPortalActive);

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId wajib disertakan' },
        { status: 400 }
      );
    }

    // Ambil data cabang terlebih dahulu
    const [existingBranch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);

    if (!existingBranch) {
      return NextResponse.json(
        { success: false, error: 'Cabang tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update status is_portal_active
    const [updatedBranch] = await db
      .update(branches)
      .set({
        isPortalActive,
        updatedAt: sql`NOW()`,
      })
      .where(eq(branches.id, branchId))
      .returning();

    // Catat Audit Trail
    const actionDesc = isPortalActive
      ? `Superadmin '${session.name}' telah mengaktifkan akses Portal Mandiri untuk Cabang [${existingBranch.code}] ${existingBranch.name}. Role Kacab & PIC Cabang kini dapat mengakses Direktori Keagenan.`
      : `Superadmin '${session.name}' telah menonaktifkan akses Portal Mandiri untuk Cabang [${existingBranch.code}] ${existingBranch.name}.`;

    await db.insert(auditLogs).values({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      category: 'SYSTEM_CONFIG',
      action: 'BRANCH_PORTAL_ACCESS_TOGGLED',
      status: 'SUCCESS',
      description: actionDesc,
      metadata: {
        branchId,
        branchCode: existingBranch.code,
        branchName: existingBranch.name,
        isPortalActive,
        previousState: existingBranch.isPortalActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Akses Portal Mandiri untuk cabang [${updatedBranch.code}] ${updatedBranch.name} berhasil diubah menjadi: ${isPortalActive ? 'AKTIF' : 'NON-AKTIF'}.`,
      branch: updatedBranch,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengubah status akses portal cabang' },
      { status: 500 }
    );
  }
}
