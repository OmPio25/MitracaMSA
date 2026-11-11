import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { branches, agents, productionRecords } from '@/db/schema';
import { asc, eq, and, ne, sql } from 'drizzle-orm';
import { BRANCH_ALIAS_MAP } from '@/lib/constants/branches';
import { getServerSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET: Ambil seluruh daftar cabang beserta statistik agen & produksi
export async function GET() {
  try {
    const rawResult = await db.execute(sql`
      SELECT 
        b.id,
        b.code,
        b.name,
        b.raw_alias AS "rawAlias",
        b.is_active AS "isActive",
        b.is_portal_active AS "isPortalActive",
        b.is_auto_provisioned AS "isAutoProvisioned",
        b.created_at AS "createdAt",
        b.updated_at AS "updatedAt",
        COALESCE(a.agent_count, 0)::int AS "agentsCount",
        COALESCE(pr.prod_count, 0)::int AS "prodCount"
      FROM branches b
      LEFT JOIN (
        SELECT branch_id, COUNT(*) AS agent_count
        FROM agents
        WHERE branch_id IS NOT NULL AND deleted_at IS NULL
        GROUP BY branch_id
      ) a ON a.branch_id = b.id
      LEFT JOIN (
        SELECT branch_id, COUNT(*) AS prod_count
        FROM production_records
        WHERE branch_id IS NOT NULL AND deleted_at IS NULL
        GROUP BY branch_id
      ) pr ON pr.branch_id = b.id
      ORDER BY b.code ASC;
    `);

    const list = Array.isArray(rawResult)
      ? rawResult
      : (rawResult as any)?.rows ?? [];

    return NextResponse.json({ branches: list });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal memuat daftar cabang' },
      { status: 500 }
    );
  }
}

// POST: Tambah Cabang Baru (Khusus SUPERADMIN & ADMIN)
export async function POST(req: NextRequest) {
  try {
    // SECURITY FIX: Verifikasi sesi dan role admin
    const session = await getServerSession();
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Administrator (SUPERADMIN dan ADMIN) yang berwenang menambahkan cabang' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const rawAlias = String(body.rawAlias || '').trim();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const isPortalActive = body.isPortalActive !== undefined ? Boolean(body.isPortalActive) : false;

    if (!code) {
      return NextResponse.json({ error: 'Kode cabang wajib diisi (misal: 70)' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Nama cabang wajib diisi (misal: Gorontalo)' }, { status: 400 });
    }

    // Cek apakah kode cabang sudah ada
    const existing = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.code, code))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Kode cabang '${code}' sudah terdaftar di database.` },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(branches)
      .values({
        code,
        name,
        rawAlias: rawAlias || `${code} - ${name.toUpperCase()}`,
        isActive,
        isPortalActive,
        isAutoProvisioned: false,
      })
      .returning();

    // Daftarkan juga alias ke alias map in-memory
    BRANCH_ALIAS_MAP[name.toUpperCase()] = code;
    BRANCH_ALIAS_MAP[`${code} - ${name.toUpperCase()}`] = code;

    return NextResponse.json({
      message: `Cabang [${created.code}] ${created.name} berhasil ditambahkan.`,
      branch: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal menambahkan cabang' },
      { status: 500 }
    );
  }
}

// PUT: Perbarui Cabang (Khusus SUPERADMIN & ADMIN)
export async function PUT(req: NextRequest) {
  try {
    // SECURITY FIX: Verifikasi sesi dan role admin
    const session = await getServerSession();
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Administrator (SUPERADMIN dan ADMIN) yang berwenang memperbarui cabang' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const id = String(body.id || '').trim();
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const rawAlias = String(body.rawAlias || '').trim();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const isPortalActive = body.isPortalActive !== undefined ? Boolean(body.isPortalActive) : false;

    if (!id) {
      return NextResponse.json({ error: 'ID cabang wajib disertakan' }, { status: 400 });
    }
    if (!code || !name) {
      return NextResponse.json({ error: 'Kode dan Nama cabang wajib diisi' }, { status: 400 });
    }

    // Cek apakah kode cabang bentrok dengan cabang lain
    const conflict = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.code, code), ne(branches.id, id)))
      .limit(1);

    if (conflict.length > 0) {
      return NextResponse.json(
        { error: `Kode cabang '${code}' telah digunakan oleh cabang lain.` },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(branches)
      .set({
        code,
        name,
        rawAlias: rawAlias || `${code} - ${name.toUpperCase()}`,
        isActive,
        isPortalActive,
        updatedAt: sql`NOW()`,
      })
      .where(eq(branches.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 });
    }

    // Perbarui raw_branch_name pada agen yang terhubung agar selalu selaras
    await db
      .update(agents)
      .set({ rawBranchName: name, updatedAt: sql`NOW()` })
      .where(eq(agents.branchId, id));

    BRANCH_ALIAS_MAP[name.toUpperCase()] = code;

    return NextResponse.json({
      message: `Cabang [${updated.code}] ${updated.name} berhasil diperbarui.`,
      branch: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui cabang' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus Cabang (Khusus SUPERADMIN & ADMIN)
export async function DELETE(req: NextRequest) {
  try {
    // SECURITY FIX: Verifikasi sesi dan role admin
    const session = await getServerSession();
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Administrator (SUPERADMIN dan ADMIN) yang berwenang menghapus cabang' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID cabang wajib disertakan' }, { status: 400 });
    }

    // Cek relasi agen
    const [agentRef] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(eq(agents.branchId, id));

    const [prodRef] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productionRecords)
      .where(eq(productionRecords.branchId, id));

    const totalRefs = Number(agentRef?.count || 0) + Number(prodRef?.count || 0);

    if (totalRefs > 0) {
      return NextResponse.json(
        {
          error: `Cabang ini tidak dapat dihapus karena masih terhubung dengan ${agentRef?.count || 0} agen dan ${prodRef?.count || 0} data produksi. Silakan ubah status cabang menjadi 'Non-Aktif' sebagai alternatif.`,
        },
        { status: 400 }
      );
    }

    const [deleted] = await db.delete(branches).where(eq(branches.id, id)).returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      message: `Cabang [${deleted.code}] ${deleted.name} berhasil dihapus.`,
      branch: deleted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus cabang' },
      { status: 500 }
    );
  }
}
