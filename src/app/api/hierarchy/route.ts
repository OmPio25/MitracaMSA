import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, productionRecords } from '@/db/schema';
import { sql, eq, and, or, inArray, isNull, ilike } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export interface HierarchyNode {
  id: string;
  agentCode: string;
  name: string;
  uplineAgentCode: string | null;
  uplineStatus: 'LINKED' | 'PENDING_UPLINE' | 'UNREGISTERED_IN_MASTER' | 'ROOT';
  statusKeagenan: string | null;
  peringkat: string | null;
  rawBranchName: string | null;
  depth: number;
  materializedPath: string | null;
  totalProduction: string;
  policyCount: number;
  downlinesCount: number;
  children: HierarchyNode[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getServerSession();

    let mode = searchParams.get('mode') ?? 'SPECIFIC'; // 'SPECIFIC' | 'ALL_ROOT' | 'PROBLEMATIC'
    let agentCode = (searchParams.get('agentCode') ?? '').trim().toUpperCase();
    let branch = (searchParams.get('branch') ?? '').trim();
    const statusFilter = searchParams.get('statusFilter') ?? 'ALL'; // 'ALL' | 'LINKED' | 'PENDING_UPLINE' | 'UNREGISTERED_IN_MASTER' | 'ROOT'

    // ── RBAC Multi-Tenant Scoping ─────────────────────────────────────────────
    if (session) {
      if (session.role === 'KACAB' || session.role === 'PIC_CABANG') {
        // Enforce strictly to their assigned branch
        if (session.branchName) {
          branch = session.branchName;
        }
        if (mode === 'PROBLEMATIC') {
          mode = 'ALL_ROOT';
        }
      } else if (session.role === 'AGENT' || session.role === 'OFFICER_AGENT') {
        const ownerCode = (session.agentCode || session.parentAgentCode || '').toUpperCase();
        mode = 'SPECIFIC'; // Force to specific subtree mode

        if (!agentCode || agentCode === ownerCode) {
          agentCode = ownerCode;
        } else {
          // If user requests a different agent, verify it is strictly within their subtree
          const [descendant] = await db
            .select({ id: agents.id })
            .from(agents)
            .where(
              and(
                eq(agents.agentCode, agentCode),
                or(
                  ilike(agents.materializedPath, `/${ownerCode}/%`),
                  ilike(agents.materializedPath, `/%/${ownerCode}/%`)
                )
              )
            )
            .limit(1);

          if (!descendant) {
            // Out-of-bounds agent requested: restrict to owner root
            agentCode = ownerCode;
          }
        }
      }
    }

    // ── 1. Skenario: Spesifik Agen (Subtree Hirarki) ───────────────────────────
    if (mode === 'SPECIFIC') {
      if (!agentCode) {
        return NextResponse.json(
          { error: 'Parameter agentCode wajib diisi untuk mode Spesifik Agen.' },
          { status: 400 }
        );
      }

      // Cari root agent yang diminta (berdasarkan kode tepat atau kemiripan kode/nama)
      let [target] = await db
        .select({
          id: agents.id,
          agentCode: agents.agentCode,
          name: agents.name,
          materializedPath: agents.materializedPath,
          depth: agents.depth,
        })
        .from(agents)
        .where(eq(agents.agentCode, agentCode))
        .limit(1);

      if (!target) {
        // Fallback: cari berdasarkan kemiripan kode atau nama
        [target] = await db
          .select({
            id: agents.id,
            agentCode: agents.agentCode,
            name: agents.name,
            materializedPath: agents.materializedPath,
            depth: agents.depth,
          })
          .from(agents)
          .where(
            or(
              ilike(agents.agentCode, `%${agentCode}%`),
              ilike(agents.name, `%${agentCode}%`)
            )
          )
          .limit(1);
      }

      if (!target) {
        return NextResponse.json(
          { error: `Agen dengan kode atau nama '${agentCode}' tidak ditemukan di database.` },
          { status: 404 }
        );
      }

      // Ambil agen target + seluruh downlinenya menggunakan Recursive CTE + index
      const rawNodes = await db.execute(sql`
        WITH RECURSIVE subtree AS (
          SELECT 
            a.id,
            a.agent_code,
            a.name,
            a.upline_agent_code,
            a.parent_id,
            a.upline_status,
            a.status_keagenan,
            a.peringkat,
            a.raw_branch_name,
            0 AS depth,
            COALESCE(a.materialized_path, '/' || a.agent_code) AS materialized_path
          FROM agents a
          WHERE a.agent_code = ${target.agentCode}
            AND a.deleted_at IS NULL

          UNION ALL

          SELECT 
            c.id,
            c.agent_code,
            c.name,
            c.upline_agent_code,
            c.parent_id,
            c.upline_status,
            c.status_keagenan,
            c.peringkat,
            c.raw_branch_name,
            p.depth + 1 AS depth,
            p.materialized_path || '/' || c.agent_code AS materialized_path
          FROM agents c
          JOIN subtree p ON (c.parent_id = p.id OR c.upline_agent_code = p.agent_code)
          WHERE c.deleted_at IS NULL
        ),
        prod_agg AS (
          SELECT 
            pr.agent_id,
            COALESCE(SUM(pr.nilai_premi), 0)::text AS total_premi,
            COUNT(pr.id)::int AS total_policies
          FROM production_records pr
          WHERE pr.deleted_at IS NULL
          GROUP BY pr.agent_id
        )
        SELECT 
          s.id,
          s.agent_code AS "agentCode",
          s.name,
          s.upline_agent_code AS "uplineAgentCode",
          s.parent_id AS "parentId",
          s.upline_status AS "uplineStatus",
          s.status_keagenan AS "statusKeagenan",
          s.peringkat,
          s.raw_branch_name AS "rawBranchName",
          s.depth,
          s.materialized_path AS "materializedPath",
          COALESCE(p.total_premi, '0.00') AS "totalProduction",
          COALESCE(p.total_policies, 0) AS "policyCount"
        FROM subtree s
        LEFT JOIN prod_agg p ON p.agent_id = s.id
        ORDER BY s.depth ASC, s.agent_code ASC;
      `);

      const rows = (Array.isArray(rawNodes) ? rawNodes : ((rawNodes as any)?.rows ?? [])) as Array<{
        id: string;
        agentCode: string;
        name: string;
        uplineAgentCode: string | null;
        parentId: string | null;
        uplineStatus: any;
        statusKeagenan: string | null;
        peringkat: string | null;
        rawBranchName: string | null;
        depth: number;
        materializedPath: string | null;
        totalProduction: string;
        policyCount: number;
      }>;

      // Bangun struktur hirarki tree rekursif
      const tree = buildTreeFromFlatList(rows, target.agentCode);

      return NextResponse.json({
        mode: 'SPECIFIC',
        totalNodes: rows.length,
        tree,
      });
    }

    // ── 2. Skenario: Masalah Self-Healing (Pending & Unregistered) ─────────────
    if (mode === 'PROBLEMATIC') {
      const rawNodes = await db.execute(sql`
        SELECT 
          a.id,
          a.agent_code AS "agentCode",
          a.name,
          a.upline_agent_code AS "uplineAgentCode",
          a.parent_id AS "parentId",
          a.upline_status AS "uplineStatus",
          a.status_keagenan AS "statusKeagenan",
          a.peringkat,
          a.raw_branch_name AS "rawBranchName",
          a.depth,
          a.materialized_path AS "materializedPath",
          COALESCE(SUM(pr.nilai_premi), 0)::text AS "totalProduction",
          COUNT(pr.id)::int AS "policyCount"
        FROM agents a
        LEFT JOIN production_records pr ON pr.agent_id = a.id AND pr.deleted_at IS NULL
        WHERE a.upline_status IN ('PENDING_UPLINE', 'UNREGISTERED_IN_MASTER')
          AND a.deleted_at IS NULL
          ${branch ? sql`AND a.raw_branch_name ILIKE ${'%' + branch + '%'}` : sql``}
        GROUP BY a.id, a.agent_code, a.name, a.upline_agent_code, a.parent_id, a.upline_status, a.status_keagenan, a.peringkat, a.raw_branch_name, a.depth, a.materialized_path
        ORDER BY a.upline_status ASC, a.agent_code ASC;
      `);

      const rows = (Array.isArray(rawNodes) ? rawNodes : ((rawNodes as any)?.rows ?? [])) as any[];
      const tree: HierarchyNode[] = rows.map((r) => ({
        ...r,
        downlinesCount: 0,
        children: [],
      }));

      return NextResponse.json({
        mode: 'PROBLEMATIC',
        totalNodes: tree.length,
        tree,
      });
    }

    // ── 3. Skenario: Root Agensi Berdasarkan Cabang atau Nasional ───────────────
    if (branch && branch !== 'ALL') {
      // Cabang dipilih: Ambil root agensi di cabang tsb + downline lengkapnya (lintas cabang)
      const rawBranchSubtree = await db.execute(sql`
        WITH RECURSIVE branch_roots AS (
          SELECT 
            a.id,
            a.agent_code,
            a.name,
            a.upline_agent_code,
            a.parent_id,
            a.upline_status,
            a.status_keagenan,
            a.peringkat,
            a.raw_branch_name,
            0 AS depth,
            COALESCE(a.materialized_path, '/' || a.agent_code) AS materialized_path
          FROM agents a
          LEFT JOIN branches b ON a.branch_id = b.id
          WHERE (a.parent_id IS NULL OR a.upline_status = 'ROOT')
            AND a.deleted_at IS NULL
            AND (
              a.raw_branch_name ILIKE ${'%' + branch + '%'} 
              OR b.name ILIKE ${'%' + branch + '%'} 
              OR b.code ILIKE ${'%' + branch + '%'}
            )
          ORDER BY 
            (SELECT count(*) FROM agents c WHERE c.materialized_path LIKE a.materialized_path || '/%') DESC,
            a.agent_code ASC
          LIMIT 50
        ),
        subtree AS (
          -- Anchor: Root-root yang berdomisili di cabang ini
          SELECT * FROM branch_roots
          UNION ALL
          -- Rekursif: Downline-downline di bawahnya (tanpa filter cabang agar downline cabang lain tidak hilang)
          SELECT 
            c.id,
            c.agent_code,
            c.name,
            c.upline_agent_code,
            c.parent_id,
            c.upline_status,
            c.status_keagenan,
            c.peringkat,
            c.raw_branch_name,
            p.depth + 1 AS depth,
            p.materialized_path || '/' || c.agent_code AS materialized_path
          FROM agents c
          JOIN subtree p ON (c.parent_id = p.id OR c.upline_agent_code = p.agent_code)
          WHERE c.deleted_at IS NULL
        ),
        prod_agg AS (
          SELECT 
            pr.agent_id,
            COALESCE(SUM(pr.nilai_premi), 0)::text AS total_premi,
            COUNT(pr.id)::int AS total_policies
          FROM production_records pr
          WHERE pr.deleted_at IS NULL
          GROUP BY pr.agent_id
        )
        SELECT 
          s.id,
          s.agent_code AS "agentCode",
          s.name,
          s.upline_agent_code AS "uplineAgentCode",
          s.parent_id AS "parentId",
          s.upline_status AS "uplineStatus",
          s.status_keagenan AS "statusKeagenan",
          s.peringkat,
          s.raw_branch_name AS "rawBranchName",
          s.depth,
          s.materialized_path AS "materializedPath",
          COALESCE(p.total_premi, '0.00') AS "totalProduction",
          COALESCE(p.total_policies, 0) AS "policyCount"
        FROM subtree s
        LEFT JOIN prod_agg p ON p.agent_id = s.id
        ORDER BY s.depth ASC, s.agent_code ASC;
      `);

      const rows = (Array.isArray(rawBranchSubtree) ? rawBranchSubtree : ((rawBranchSubtree as any)?.rows ?? [])) as any[];
      const tree = buildTreeFromFlatList(rows, '');

      return NextResponse.json({
        mode: 'ALL_ROOT',
        branch,
        totalNodes: rows.length,
        tree,
      });
    }

    // Default: Semua Root Agensi Nasional (Top 100 dengan downline terbanyak)
    const rawRoots = await db.execute(sql`
      WITH root_candidates AS (
        SELECT 
          a.id,
          a.agent_code,
          a.name,
          a.upline_agent_code,
          a.parent_id,
          a.upline_status,
          a.status_keagenan,
          a.peringkat,
          a.raw_branch_name,
          a.depth,
          a.materialized_path,
          (
            SELECT COUNT(*) 
            FROM agents c 
            WHERE c.materialized_path LIKE a.materialized_path || '/%'
          )::int AS downlines_count
        FROM agents a
        WHERE (a.parent_id IS NULL OR a.upline_status = 'ROOT')
          AND a.deleted_at IS NULL
          AND a.agent_code IN (
            SELECT DISTINCT upline_agent_code 
            FROM agents 
            WHERE upline_agent_code IS NOT NULL
          )
        ORDER BY downlines_count DESC, a.agent_code ASC
        LIMIT 100
      ),
      prod_agg AS (
        SELECT 
          pr.agent_id,
          COALESCE(SUM(pr.nilai_premi), 0)::text AS total_premi,
          COUNT(pr.id)::int AS total_policies
        FROM production_records pr
        JOIN root_candidates rc ON rc.id = pr.agent_id
        WHERE pr.deleted_at IS NULL
        GROUP BY pr.agent_id
      )
      SELECT 
        rc.id,
        rc.agent_code AS "agentCode",
        rc.name,
        rc.upline_agent_code AS "uplineAgentCode",
        rc.parent_id AS "parentId",
        rc.upline_status AS "uplineStatus",
        rc.status_keagenan AS "statusKeagenan",
        rc.peringkat,
        rc.raw_branch_name AS "rawBranchName",
        rc.depth,
        rc.materialized_path AS "materializedPath",
        COALESCE(pa.total_premi, '0.00') AS "totalProduction",
        COALESCE(pa.total_policies, 0) AS "policyCount",
        rc.downlines_count AS "downlinesCount"
      FROM root_candidates rc
      LEFT JOIN prod_agg pa ON pa.agent_id = rc.id
      ORDER BY rc.downlines_count DESC, rc.agent_code ASC;
    `);

    const rootRows = (Array.isArray(rawRoots) ? rawRoots : ((rawRoots as any)?.rows ?? [])) as any[];
    const tree: HierarchyNode[] = rootRows.map((r) => ({
      ...r,
      children: [],
    }));

    return NextResponse.json({
      mode: 'ALL_ROOT',
      totalNodes: tree.length,
      tree,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan saat memuat hirarki.' }, { status: 500 });
  }
}

/**
 * Mengubah array baris flat menjadi struktur pohon bertingkat (Nested Tree)
 */
function buildTreeFromFlatList(rows: any[], rootAgentCode: string): HierarchyNode[] {
  const nodeMap = new Map<string, HierarchyNode>();

  // 1. Inisialisasi map
  rows.forEach((r) => {
    nodeMap.set(r.agentCode, {
      ...r,
      downlinesCount: 0,
      children: [],
    });
  });

  const roots: HierarchyNode[] = [];

  // 2. Hubungkan child ke parent
  rows.forEach((r) => {
    const node = nodeMap.get(r.agentCode)!;
    const parentCode = r.uplineAgentCode;

    if (r.agentCode === rootAgentCode || !parentCode || !nodeMap.has(parentCode)) {
      roots.push(node);
    } else {
      const parentNode = nodeMap.get(parentCode);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  // 3. Hitung downlines count rekursif
  function countSubtree(node: HierarchyNode): number {
    let count = node.children.length;
    for (const child of node.children) {
      count += countSubtree(child);
    }
    node.downlinesCount = count;
    return count;
  }

  roots.forEach(countSubtree);

  // 4. Urutkan roots & children berdasarkan downlinesCount DESC agar jaringan aktif tampil di urutan atas
  function sortNodeAndChildren(node: HierarchyNode) {
    node.children.sort((a, b) => b.downlinesCount - a.downlinesCount || a.agentCode.localeCompare(b.agentCode));
    node.children.forEach(sortNodeAndChildren);
  }

  roots.sort((a, b) => b.downlinesCount - a.downlinesCount || a.agentCode.localeCompare(b.agentCode));
  roots.forEach(sortNodeAndChildren);

  return roots;
}
