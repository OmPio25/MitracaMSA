import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, isNull, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getServerSession } from '@/lib/auth/session';
import { UserRole } from '@/lib/auth/rbac-filter';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

const VALID_ROLES: UserRole[] = [
  'SUPERADMIN',
  'ADMIN',
  'KACAB',
  'PIC_CABANG',
  'AGENT',
  'OFFICER_AGENT',
  'AUDIT',
];

/**
 * PATCH /api/admin/users/[id]
 * Memperbarui data akun pengguna: nama, email, phone, role, scoping (branch/agent), status aktif, password (Khusus SUPERADMIN)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN yang dapat mengubah data pengguna' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();

    // Pastikan user target ada
    const [targetUser] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    // Mencegah SUPERADMIN menonaktifkan akunnya sendiri saat ini
    if (session.userId === targetUser.id && body.isActive === false) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak dapat menonaktifkan akun Anda sendiri saat ini.' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // 1. Update Status Aktif
    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive;
    }

    // 2. Update Nama Lengkap
    if (body.name && body.name.trim()) {
      updateData.name = body.name.trim();
    }

    // 3. Update Email (dengan validasi duplikasi)
    if (body.email && body.email.trim()) {
      const cleanEmail = String(body.email).trim().toLowerCase();
      if (cleanEmail !== targetUser.email.toLowerCase()) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, cleanEmail), ne(users.id, id), isNull(users.deletedAt)))
          .limit(1);

        if (existing) {
          return NextResponse.json(
            { success: false, error: `Alamat email "${cleanEmail}" sudah digunakan oleh pengguna lain.` },
            { status: 400 }
          );
        }
        updateData.email = cleanEmail;
      }
    }

    // 4. Update Telepon
    if (body.phone !== undefined) {
      updateData.phone = body.phone ? String(body.phone).trim() : null;
    }

    // 5. Update Peran (Role) & Scoping Pointers
    if (body.role && VALID_ROLES.includes(body.role)) {
      updateData.role = body.role;

      if (body.role === 'KACAB' || body.role === 'PIC_CABANG') {
        updateData.branchId = body.branchId || null;
        updateData.agentId = null;
        updateData.parentAgentId = null;
      } else if (body.role === 'AGENT') {
        updateData.branchId = null;
        updateData.agentId = body.agentId || null;
        updateData.parentAgentId = null;
      } else if (body.role === 'OFFICER_AGENT') {
        updateData.branchId = null;
        updateData.agentId = null;
        updateData.parentAgentId = body.parentAgentId || null;
      } else {
        // SUPERADMIN, ADMIN, AUDIT
        updateData.branchId = null;
        updateData.agentId = null;
        updateData.parentAgentId = null;
      }
    } else {
      // Jika role tidak diubah tapi scoping pointer diupdate secara eksplisit
      if (body.branchId !== undefined) updateData.branchId = body.branchId || null;
      if (body.agentId !== undefined) updateData.agentId = body.agentId || null;
      if (body.parentAgentId !== undefined) updateData.parentAgentId = body.parentAgentId || null;
    }

    // 6. Reset / Ganti Password jika diisi
    if (body.newPassword) {
      if (String(body.newPassword).length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password baru minimal harus terdiri dari 6 karakter' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(String(body.newPassword), 10);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    // Catat log pembaruan user (non-blocking di background agar response instan)
    logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'USER_UPDATED',
      category: 'USER_MANAGEMENT',
      status: 'SUCCESS',
      description: `Pembaruan data user: '${updated.name}' (${updated.email})`,
      req,
      metadata: { targetUserId: updated.id, updatedFields: Object.keys(updateData) },
    }).catch((err) => {
      console.error('Failed to log activity in background:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      user: updated,
    });
  } catch (err: any) {
    console.error('Error updating user:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memperbarui pengguna' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Menghapus pengguna (Soft Delete, Khusus SUPERADMIN)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN yang berwenang menghapus pengguna' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Pastikan user target ada
    const [targetUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    // Mencegah SUPERADMIN menghapus akunnya sendiri
    if (session.userId === targetUser.id) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri saat ini.' },
        { status: 400 }
      );
    }

    // Lakukan soft-delete
    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    // Catat log penghapusan user
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'USER_DELETED',
      category: 'USER_MANAGEMENT',
      status: 'SUCCESS',
      description: `Penghapusan (soft-delete) user: ${targetUser.email}`,
      req,
      metadata: { targetUserId: targetUser.id, email: targetUser.email },
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${targetUser.email} berhasil dihapus dari sistem.`,
    });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menghapus pengguna' },
      { status: 500 }
    );
  }
}
