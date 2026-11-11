import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, agents } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/assistants
 * Mengambil daftar seluruh staf asisten (Officer Agent) yang terdaftar di bawah agen ini.
 * Akses: AGENT (hanya asisten miliknya), OFFICER_AGENT (read-only teman sejawat), SUPERADMIN & ADMIN.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi login tidak valid atau telah berakhir' },
        { status: 401 }
      );
    }

    const { role } = session;
    const { searchParams } = new URL(req.url);
    const queryAgentId = searchParams.get('agentId');

    const isNationalRole = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'AUDIT';
    const isBranchRole = role === 'KACAB' || role === 'PIC_CABANG';

    if (
      role !== 'AGENT' &&
      role !== 'OFFICER_AGENT' &&
      !isNationalRole &&
      !isBranchRole
    ) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    // ── Validasi Portal Mandiri untuk Role Cabang ──────────────────────────────
    if (isBranchRole) {
      if (!session.branchId) {
        return NextResponse.json(
          { success: false, error: 'Akun Anda tidak terhubung dengan kantor cabang manapun.' },
          { status: 403 }
        );
      }

      // Cek is_portal_active langsung dari DB
      const branchRes = await db.execute(sql`
        SELECT is_portal_active AS "isPortalActive", name FROM branches WHERE id = ${session.branchId}::uuid LIMIT 1;
      `);
      const bData = (branchRes && Array.isArray(branchRes) ? branchRes[0] : (branchRes as any)?.rows?.[0]) || null;

      if (!bData || !bData.isPortalActive) {
        return NextResponse.json(
          { success: false, error: `Fitur Portal Mandiri belum diaktifkan untuk Cabang ${bData?.name || 'Anda'} oleh Superadmin.` },
          { status: 403 }
        );
      }
    }

    // ── Mode Cabang: Jika KACAB atau PIC_CABANG tanpa spesifik agentId, ambil semua asisten di cabangnya ──
    if (isBranchRole && !queryAgentId) {
      const branchAssistantsResult = await db.execute(sql`
        SELECT 
          u.id,
          u.email,
          u.phone,
          u.name,
          u.role,
          u.is_active AS "isActive",
          u.parent_agent_id AS "parentAgentId",
          u.last_login_at AS "lastLoginAt",
          u.created_at AS "createdAt",
          u.updated_at AS "updatedAt",
          a.agent_code AS "agentCode",
          a.name AS "agentName",
          COALESCE(b.name, a.raw_branch_name, 'Kantor Pusat') AS "branchName",
          b.code AS "branchCode"
        FROM users u
        JOIN agents a ON a.id = u.parent_agent_id
        LEFT JOIN branches b ON b.id = a.branch_id
        WHERE u.role = 'OFFICER_AGENT'
          AND a.branch_id = ${session.branchId}::uuid
          AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC;
      `);

      const assistants = (branchAssistantsResult as any)?.rows || branchAssistantsResult || [];

      return NextResponse.json({
        success: true,
        mode: 'BRANCH',
        assistants,
        total: assistants.length,
        canManage: false,
        isReadOnly: true,
      });
    }

    // ── Mode Nasional: Jika Superadmin, Admin, atau Audit tanpa spesifik agentId, ambil semua asisten nasional ──
    if (isNationalRole && !queryAgentId) {
      const nationalAssistantsResult = await db.execute(sql`
        SELECT 
          u.id,
          u.email,
          u.phone,
          u.name,
          u.role,
          u.is_active AS "isActive",
          u.parent_agent_id AS "parentAgentId",
          u.last_login_at AS "lastLoginAt",
          u.created_at AS "createdAt",
          u.updated_at AS "updatedAt",
          a.agent_code AS "agentCode",
          a.name AS "agentName",
          COALESCE(b.name, a.raw_branch_name, 'Kantor Pusat') AS "branchName",
          b.code AS "branchCode"
        FROM users u
        LEFT JOIN agents a ON a.id = u.parent_agent_id
        LEFT JOIN branches b ON b.id = a.branch_id
        WHERE u.role = 'OFFICER_AGENT'
          AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC;
      `);

      const assistants = (nationalAssistantsResult as any)?.rows || nationalAssistantsResult || [];

      return NextResponse.json({
        success: true,
        mode: 'NATIONAL',
        assistants,
        total: assistants.length,
        canManage: role === 'SUPERADMIN' || role === 'ADMIN',
        isReadOnly: role === 'AUDIT',
      });
    }

    let targetAgentId: string | null = null;

    if (role === 'AGENT') {
      targetAgentId = session.agentId || null;
    } else if (role === 'OFFICER_AGENT') {
      targetAgentId = session.parentAgentId || session.agentId || null;
    } else if (isNationalRole || isBranchRole) {
      targetAgentId = queryAgentId || null;
    }

    if (!targetAgentId) {
      return NextResponse.json(
        { success: false, error: 'Profil agen tidak teridentifikasi' },
        { status: 404 }
      );
    }

    const assistantListResult = await db.execute(sql`
      SELECT 
        u.id,
        u.email,
        u.phone,
        u.name,
        u.role,
        u.is_active AS "isActive",
        u.parent_agent_id AS "parentAgentId",
        u.last_login_at AS "lastLoginAt",
        u.created_at AS "createdAt",
        u.updated_at AS "updatedAt",
        a.agent_code AS "agentCode",
        a.name AS "agentName",
        COALESCE(b.name, a.raw_branch_name, 'Kantor Pusat') AS "branchName"
      FROM users u
      LEFT JOIN agents a ON a.id = u.parent_agent_id
      LEFT JOIN branches b ON b.id = a.branch_id
      WHERE u.parent_agent_id = ${targetAgentId}::uuid
        AND u.role = 'OFFICER_AGENT'
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC;
    `);

    const assistants = (assistantListResult as any)?.rows || assistantListResult || [];

    return NextResponse.json({
      success: true,
      mode: isNationalRole || isBranchRole ? 'INSPECT' : 'PERSONAL',
      assistants,
      total: assistants.length,
      canManage: role === 'AGENT' || role === 'SUPERADMIN' || role === 'ADMIN',
      isReadOnly: role === 'AUDIT' || role === 'OFFICER_AGENT' || isBranchRole,
    });
  } catch (error: any) {
    console.error('Error fetching assistants:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat daftar asisten: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/assistants
 * Mendaftarkan Asisten Operasional (Officer Agent) baru untuk agen yang sedang login.
 * Akses: Khusus AGENT pemilik (dan SUPERADMIN / ADMIN).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi login tidak valid atau telah berakhir' },
        { status: 401 }
      );
    }

    const { role, userId } = session;

    // Hanya AGENT pemilik, SUPERADMIN, atau ADMIN yang berhak menambah asisten
    if (role !== 'AGENT' && role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Staf Asisten (Officer Agent) tidak berwenang menambah asisten lain.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, phone, password, confirmPassword } = body;

    // Validasi input
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama asisten wajib diisi' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Format alamat email tidak valid' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password asisten minimal 6 karakter' },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi password tidak sesuai' },
        { status: 400 }
      );
    }

    // Tentukan owner agent ID
    let ownerAgentId: string | null = null;
    if (role === 'AGENT') {
      ownerAgentId = session.agentId || null;
    } else {
      ownerAgentId = body.parentAgentId || body.agentId || session.agentId || null;
    }

    if (!ownerAgentId) {
      return NextResponse.json(
        { success: false, error: 'Akun Agen pemilik tidak valid atau belum terhubung.' },
        { status: 400 }
      );
    }

    // Ambil data agen pemilik untuk memastikan cabang dan status
    const [ownerAgent] = await db
      .select({
        id: agents.id,
        agentCode: agents.agentCode,
        name: agents.name,
        branchId: agents.branchId,
      })
      .from(agents)
      .where(eq(agents.id, ownerAgentId))
      .limit(1);

    if (!ownerAgent) {
      return NextResponse.json(
        { success: false, error: 'Data Agen pemilik tidak ditemukan di sistem' },
        { status: 404 }
      );
    }

    // Cek apakah email sudah terdaftar di sistem users
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `Email '${cleanEmail}' sudah terdaftar di sistem. Silakan gunakan email lain.` },
        { status: 409 }
      );
    }

    // Hash password menggunakan bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Simpan akun Officer Agent baru
    const [newAssistant] = await db
      .insert(users)
      .values({
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        name: name.trim(),
        passwordHash,
        role: 'OFFICER_AGENT',
        branchId: ownerAgent.branchId,
        agentId: ownerAgent.id,
        parentAgentId: ownerAgent.id,
        createdById: userId,
        isActive: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    // Catat log aktivitas audit kepatuhan
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'OFFICER_AGENT_CREATED',
      category: 'USER_MANAGEMENT',
      status: 'SUCCESS',
      description: `Agen '${ownerAgent.name}' (${ownerAgent.agentCode}) mendaftarkan asisten baru: ${newAssistant.name} (${newAssistant.email})`,
      req,
      metadata: {
        assistantId: newAssistant.id,
        assistantEmail: newAssistant.email,
        assistantName: newAssistant.name,
        ownerAgentCode: ownerAgent.agentCode,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Asisten '${newAssistant.name}' berhasil didaftarkan dan dapat langsung login.`,
      assistant: newAssistant,
    });
  } catch (error: any) {
    console.error('Error creating assistant:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mendaftarkan asisten: ' + error.message },
      { status: 500 }
    );
  }
}
