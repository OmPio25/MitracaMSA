import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, branches, agents } from '@/db/schema';
import { eq, or, and, isNull, desc, ilike, sql } from 'drizzle-orm';
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
 * GET /api/admin/users
 * Mengambil daftar seluruh pengguna (Khusus SUPERADMIN)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN yang dapat mengelola pengguna' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').trim();
    const roleFilter = searchParams.get('role') ?? 'ALL';

    // Parent Agent alias for OFFICER_AGENT
    const userList = await db.execute(sql`
      SELECT 
        u.id,
        u.email,
        u.phone,
        u.name,
        u.role,
        u.is_active AS "isActive",
        u.branch_id AS "branchId",
        b.code AS "branchCode",
        b.name AS "branchName",
        u.agent_id AS "agentId",
        ag.agent_code AS "agentCode",
        ag.name AS "agentName",
        u.parent_agent_id AS "parentAgentId",
        pag.agent_code AS "parentAgentCode",
        pag.name AS "parentAgentName",
        u.last_login_at AS "lastLoginAt",
        u.created_at AS "createdAt"
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN agents ag ON u.agent_id = ag.id
      LEFT JOIN agents pag ON u.parent_agent_id = pag.id
      WHERE u.deleted_at IS NULL
        ${roleFilter !== 'ALL' ? sql`AND u.role = ${roleFilter}::user_role` : sql``}
        ${search ? sql`AND (u.name ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})` : sql``}
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      users: userList,
    });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal mengambil data pengguna' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Membuat akun pengguna login baru (Khusus SUPERADMIN)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya SUPERADMIN yang berwenang membuat user baru' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,
      role,
      branchId,
      agentId,
      parentAgentId,
      isActive = true,
    } = body;

    // 1. Validasi Input Wajib
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama lengkap wajib diisi' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email wajib diisi' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ success: false, error: 'Format email tidak valid' }, { status: 400 });
    }

    if (!password || String(password).length < 6) {
      return NextResponse.json({ success: false, error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: 'Peran (Role) yang dipilih tidak valid' }, { status: 400 });
    }

    // 2. Cek Duplikasi Email
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, cleanEmail), isNull(users.deletedAt)))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Email '${cleanEmail}' sudah terdaftar dalam sistem.` },
        { status: 409 }
      );
    }

    // 3. Validasi Aturan Scoping Berdasarkan Role
    let finalBranchId: string | null = null;
    let finalAgentId: string | null = null;
    let finalParentAgentId: string | null = null;

    if (role === 'KACAB' || role === 'PIC_CABANG') {
      if (!branchId) {
        return NextResponse.json(
          { success: false, error: `Role ${role} wajib dihubungkan ke salah satu Cabang.` },
          { status: 400 }
        );
      }
      finalBranchId = branchId;
    } else if (role === 'AGENT') {
      if (!agentId) {
        return NextResponse.json(
          { success: false, error: 'Role AGENT wajib dihubungkan ke salah satu data Agen di Master Agen.' },
          { status: 400 }
        );
      }
      finalAgentId = agentId;

      // Auto-inherit branch jika agen memiliki branch
      const [ag] = await db.select({ branchId: agents.branchId }).from(agents).where(eq(agents.id, agentId)).limit(1);
      if (ag?.branchId) finalBranchId = ag.branchId;
    } else if (role === 'OFFICER_AGENT') {
      if (!parentAgentId) {
        return NextResponse.json(
          { success: false, error: 'Role OFFICER_AGENT wajib memilih Agen Pemilik (Owner Agent).' },
          { status: 400 }
        );
      }
      finalParentAgentId = parentAgentId;

      // Auto-inherit branch dari parent agent
      const [pag] = await db.select({ branchId: agents.branchId }).from(agents).where(eq(agents.id, parentAgentId)).limit(1);
      if (pag?.branchId) finalBranchId = pag.branchId;
    }

    // 4. Enkripsi Password Hash
    const passwordHash = await bcrypt.hash(String(password), 10);

    // 5. Simpan User Baru ke Database
    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        passwordHash,
        role: role as UserRole,
        branchId: finalBranchId,
        agentId: finalAgentId,
        parentAgentId: finalParentAgentId,
        isActive: Boolean(isActive),
        createdById: session.userId,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    // Catat log pembuatan user baru
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'USER_CREATED',
      category: 'USER_MANAGEMENT',
      status: 'SUCCESS',
      description: `Pembuatan user baru: '${newUser.name}' (${newUser.email}) sebagai ${newUser.role}`,
      req,
      metadata: { targetUserId: newUser.id, role: newUser.role, email: newUser.email },
    });

    return NextResponse.json({
      success: true,
      message: `User '${newUser.name}' (${newUser.role}) berhasil dibuat!`,
      user: newUser,
    });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal membuat user baru' },
      { status: 500 }
    );
  }
}
