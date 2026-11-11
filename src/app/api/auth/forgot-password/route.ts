import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { storeResetToken } from '@/lib/auth/password-reset-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !String(email).trim()) {
      return NextResponse.json(
        { success: false, error: 'Alamat email wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Cari user di database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: `Alamat email "${cleanEmail}" tidak terdaftar dalam sistem Mitraca MSA. Mohon periksa kembali atau hubungi Super Administrator.`,
        },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akun Anda saat ini sedang dinonaktifkan oleh Administrator. Silakan hubungi Super Administrator untuk mengaktifkan kembali akun Anda.',
        },
        { status: 403 }
      );
    }

    // 2. Generate dan simpan kode verifikasi
    const resetCode = storeResetToken(user.email, user.id);

    // SECURITY FIX: Jangan bocorkan resetCode di response publik saat production (Cegah Account Takeover)
    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      success: true,
      message: isDev
        ? 'Kode verifikasi reset password berhasil dibuat (Mode Development).'
        : 'Jika email terdaftar, petunjuk reset password telah dikirimkan ke kontak Anda.',
      email: user.email,
      name: user.name,
      role: user.role,
      ...(isDev ? { resetCode } : {}),
    });
  } catch (error: any) {
    console.error('Error generating forgot password code:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Terjadi kesalahan sistem saat memproses permintaan reset password.',
      },
      { status: 500 }
    );
  }
}
