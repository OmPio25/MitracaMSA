import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, agents } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/agent/assistants/[id]
 * Memperbarui data asisten (Nama, No. Telp, Status Aktif/Nonaktif, atau Reset Password).
 * Akses: Khusus AGENT pemilik (dan SUPERADMIN / ADMIN).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi login tidak valid atau telah berakhir' },
        { status: 401 }
      );
    }

    const { role } = session;

    if (role !== 'AGENT' && role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Akun dengan peran ini (atau Auditor) tidak memiliki izin mengubah data asisten.' },
        { status: 403 }
      );
    }

    const assistantId = params.id;
    if (!assistantId) {
      return NextResponse.json(
        { success: false, error: 'ID Asisten tidak valid' },
        { status: 400 }
      );
    }

    // Ambil data asisten yang akan diedit
    const [targetAssistant] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        parentAgentId: users.parentAgentId,
      })
      .from(users)
      .where(and(eq(users.id, assistantId), eq(users.role, 'OFFICER_AGENT')))
      .limit(1);

    if (!targetAssistant) {
      return NextResponse.json(
        { success: false, error: 'Data asisten tidak ditemukan' },
        { status: 404 }
      );
    }

    // Proteksi: Jika pemanggil adalah AGENT, pastikan asisten ini adalah miliknya sendiri
    if (role === 'AGENT' && targetAssistant.parentAgentId !== session.agentId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda hanya dapat mengelola asisten Anda sendiri.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone, isActive, password } = body;

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Nama asisten tidak boleh kosong' },
          { status: 400 }
        );
      }
      updatePayload.name = name.trim();
    }

    if (phone !== undefined) {
      updatePayload.phone = phone ? String(phone).trim() : null;
    }

    if (isActive !== undefined) {
      updatePayload.isActive = Boolean(isActive);
    }

    // Reset password asisten jika disediakan
    let passwordChanged = false;
    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password baru minimal 6 karakter' },
          { status: 400 }
        );
      }
      updatePayload.passwordHash = await bcrypt.hash(password, 10);
      passwordChanged = true;
    }

    await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, assistantId));

    // Catat log aktivitas
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: passwordChanged ? 'OFFICER_AGENT_PASSWORD_RESET' : 'OFFICER_AGENT_UPDATED',
      category: 'USER_MANAGEMENT',
      status: 'SUCCESS',
      description: passwordChanged
        ? `Password asisten '${targetAssistant.name}' (${targetAssistant.email}) berhasil direset oleh agen.`
        : `Data asisten '${targetAssistant.name}' (${targetAssistant.email}) berhasil diperbarui (Status: ${updatePayload.isActive !== undefined ? (updatePayload.isActive ? 'Aktif' : 'Nonaktif') : 'Tetap'}).`,
      req,
      metadata: {
        assistantId: targetAssistant.id,
        assistantEmail: targetAssistant.email,
        passwordChanged,
        newStatus: updatePayload.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: passwordChanged
        ? 'Password asisten berhasil diperbarui!'
        : 'Data asisten berhasil diperbarui!',
    });
  } catch (error: any) {
    console.error('Error updating assistant:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui asisten: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent/assistants/[id]
 * Menghapus akun asisten operasional secara permanen dari sistem login.
 * Akses: Khusus AGENT pemilik (dan SUPERADMIN / ADMIN).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi login tidak valid atau telah berakhir' },
        { status: 401 }
      );
    }

    const { role } = session;

    if (role !== 'AGENT' && role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Akun dengan peran ini (atau Auditor) tidak memiliki izin menghapus akun asisten.' },
        { status: 403 }
      );
    }

    const assistantId = params.id;
    if (!assistantId) {
      return NextResponse.json(
        { success: false, error: 'ID Asisten tidak valid' },
        { status: 400 }
      );
    }

    // Ambil data asisten
    const [targetAssistant] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        parentAgentId: users.parentAgentId,
      })
      .from(users)
      .where(and(eq(users.id, assistantId), eq(users.role, 'OFFICER_AGENT')))
      .limit(1);

    if (!targetAssistant) {
      return NextResponse.json(
        { success: false, error: 'Data asisten tidak ditemukan' },
        { status: 404 }
      );
    }

    // Proteksi kepemilikan
    if (role === 'AGENT' && targetAssistant.parentAgentId !== session.agentId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda hanya dapat menghapus asisten Anda sendiri.' },
        { status: 403 }
      );
    }

    // Hapus akun dari tabel users
    await db.delete(users).where(eq(users.id, assistantId));

    // Catat ke audit log
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'OFFICER_AGENT_DELETED',
      category: 'USER_MANAGEMENT',
      status: 'SUCCESS',
      description: `Akun asisten '${targetAssistant.name}' (${targetAssistant.email}) telah dihapus dari sistem.`,
      req,
      metadata: {
        deletedAssistantId: targetAssistant.id,
        deletedAssistantEmail: targetAssistant.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Akun asisten '${targetAssistant.name}' berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error deleting assistant:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus asisten: ' + error.message },
      { status: 500 }
    );
  }
}
