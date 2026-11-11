import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, branches, agents } from '@/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signSessionToken, setSessionCookie, UserSessionPayload } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Query user beserta informasi relasi branch & agent
    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
        branchId: users.branchId,
        branchCode: branches.code,
        branchName: branches.name,
        isPortalActive: branches.isPortalActive,
        agentId: users.agentId,
        agentCode: agents.agentCode,
        agentName: agents.name,
        parentAgentId: users.parentAgentId,
      })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .leftJoin(agents, eq(users.agentId, agents.id))
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (userRows.length === 0) {
      await logActivity({
        action: 'AUTH_LOGIN_FAILED',
        category: 'AUTH',
        status: 'FAILED',
        description: `Percobaan login gagal: Email tidak terdaftar (${cleanEmail})`,
        req,
        metadata: { email: cleanEmail },
      });

      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const user = userRows[0];

    if (!user.isActive) {
      await logActivity({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action: 'AUTH_LOGIN_FAILED',
        category: 'AUTH',
        status: 'FAILED',
        description: `Percobaan login akun nonaktif (${cleanEmail})`,
        req,
        metadata: { email: cleanEmail, reason: 'ACCOUNT_INACTIVE' },
      });

      return NextResponse.json(
        { success: false, error: 'Akun Anda sedang dinonaktifkan. Silakan hubungi Administrator.' },
        { status: 403 }
      );
    }

    // Verifikasi password hash menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(String(password), user.passwordHash);
    if (!isPasswordValid) {
      await logActivity({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action: 'AUTH_LOGIN_FAILED',
        category: 'AUTH',
        status: 'FAILED',
        description: `Percobaan login gagal: Password salah untuk ${cleanEmail}`,
        req,
        metadata: { email: cleanEmail, reason: 'WRONG_PASSWORD' },
      });

      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Jika user memiliki parentAgentId (OFFICER_AGENT), ambil juga kode agent pemiliknya
    let parentAgentCode: string | null = null;
    if (user.parentAgentId) {
      const [parentAgent] = await db
        .select({ agentCode: agents.agentCode })
        .from(agents)
        .where(eq(agents.id, user.parentAgentId))
        .limit(1);
      if (parentAgent) {
        parentAgentCode = parentAgent.agentCode;
      }
    }

    // Update lastLoginAt
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Siapkan payload sesi
    const sessionPayload: UserSessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      branchCode: user.branchCode,
      branchName: user.branchName,
      isPortalActive: user.isPortalActive ?? false,
      agentId: user.agentId,
      agentCode: user.agentCode,
      agentName: user.agentName,
      parentAgentId: user.parentAgentId,
      parentAgentCode: parentAgentCode,
    };

    // Buat JWT token
    const token = await signSessionToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: sessionPayload,
    });

    // Pasang HttpOnly cookie
    setSessionCookie(response, token);

    // Catat log login berhasil
    await logActivity({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: 'AUTH_LOGIN_SUCCESS',
      category: 'AUTH',
      status: 'SUCCESS',
      description: `Pengguna berhasil login sebagai ${user.role}`,
      req,
      metadata: {
        role: user.role,
        branchName: user.branchName,
        agentCode: user.agentCode,
      },
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan sistem saat login' },
      { status: 500 }
    );
  }
}
