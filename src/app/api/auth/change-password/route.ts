import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // 1. Validasi input kelengkapan
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Password saat ini, password baru, dan konfirmasi password wajib diisi.' },
        { status: 400 }
      );
    }

    // 2. Validasi panjang password baru
    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal harus terdiri dari 6 karakter.' },
        { status: 400 }
      );
    }

    // 3. Validasi kecocokan konfirmasi password
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi password baru tidak cocok. Mohon periksa kembali.' },
        { status: 400 }
      );
    }

    // 4. Cek apakah password baru sama dengan password saat ini
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { success: false, error: 'Password baru tidak boleh sama dengan password saat ini.' },
        { status: 400 }
      );
    }

    // 5. Ambil data user dari database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan dalam sistem.' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Akun Anda sedang dinonaktifkan. Hubungi Administrator.' },
        { status: 403 }
      );
    }

    // 6. Verifikasi password saat ini
    const isCurrentValid = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!isCurrentValid) {
      await logActivity({
        userId: session.userId,
        userName: session.name,
        userEmail: session.email,
        userRole: session.role,
        action: 'AUTH_CHANGE_PASSWORD',
        category: 'AUTH',
        status: 'FAILED',
        description: 'Gagal mengubah password: Password saat ini tidak sesuai',
        req,
      });

      return NextResponse.json(
        { success: false, error: 'Password saat ini yang Anda masukkan salah.' },
        { status: 400 }
      );
    }

    // 7. Hash password baru & simpan ke database
    const newPasswordHash = await bcrypt.hash(String(newPassword), 10);
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Catat log perubahan password berhasil
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'AUTH_CHANGE_PASSWORD',
      category: 'AUTH',
      status: 'SUCCESS',
      description: 'Pengguna berhasil memperbarui kata sandi akun',
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Password akun Anda berhasil diubah.',
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Terjadi kesalahan sistem saat memperbarui password.',
      },
      { status: 500 }
    );
  }
}
