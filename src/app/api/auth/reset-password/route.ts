import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { verifyResetToken, consumeResetToken } from '@/lib/auth/password-reset-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, newPassword, confirmPassword } = body;

    // 1. Validasi input kelengkapan
    if (!email || !code || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email, kode verifikasi, password baru, dan konfirmasi password wajib diisi.',
        },
        { status: 400 }
      );
    }

    // 2. Validasi panjang password baru
    if (String(newPassword).length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password baru minimal harus terdiri dari 6 karakter.',
        },
        { status: 400 }
      );
    }

    // 3. Validasi konfirmasi password
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Konfirmasi password baru tidak cocok. Mohon periksa kembali.',
        },
        { status: 400 }
      );
    }

    // 4. Verifikasi kode reset di memory store
    const resetEntry = verifyResetToken(String(email), String(code));
    if (!resetEntry) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kode verifikasi tidak valid atau telah kedaluwarsa (kode hanya berlaku 15 menit). Silakan minta kode baru.',
        },
        { status: 400 }
      );
    }

    // 5. Cek user di database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, resetEntry.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan dalam sistem.' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Akun dinonaktifkan. Hubungi Administrator.' },
        { status: 403 }
      );
    }

    // 6. Hash password baru & update database
    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // 7. Konsumsi token agar tidak dapat digunakan ulang
    consumeResetToken(user.email);

    return NextResponse.json({
      success: true,
      message: 'Password akun Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.',
    });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Terjadi kesalahan sistem saat memperbarui password.',
      },
      { status: 500 }
    );
  }
}
