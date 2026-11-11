import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { claims, agents, branches } from '@/db/schema';
import { sql, eq, and, or, ilike, gte, lte, desc, asc, SQL } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import { getClaimScopeFilter } from '@/lib/auth/rbac-filter';
import { getCutoffPeriod } from '@/lib/analytics/loss-ratio';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Meta only request (for populating filter dropdowns)
    if (searchParams.get('metaOnly') === 'true') {
      const [uwYears, products] = await Promise.all([
        db.selectDistinct({ uwYear: claims.uwYear })
          .from(claims)
          .where(sql`${claims.uwYear} IS NOT NULL AND ${claims.uwYear} != ''`)
          .orderBy(claims.uwYear)
          .limit(50),
        db.selectDistinct({ product: claims.namaProduk })
          .from(claims)
          .where(sql`${claims.namaProduk} IS NOT NULL AND ${claims.namaProduk} != '' AND ${claims.namaProduk} != '[object Object]'`)
          .orderBy(claims.namaProduk)
          .limit(100),
      ]);

      return NextResponse.json({
        success: true,
        uwYears: uwYears.map((u) => u.uwYear).filter(Boolean),
        products: products.map((p) => p.product).filter(Boolean),
      });
    }

    // Parsing parameters
    const search = (searchParams.get('search') || '').trim();
    const category = (searchParams.get('category') || 'ALL').trim().toUpperCase(); // ALL, MM, NON_MM
    const uwYear = (searchParams.get('uwYear') || '').trim();
    const product = (searchParams.get('product') || '').trim();
    const branchId = (searchParams.get('branchId') || '').trim();
    const agentCode = (searchParams.get('agentCode') || '').trim();
    const cutoffParam = (searchParams.get('cutoffYear') || '').trim();
    let startDate = (searchParams.get('startDate') || '').trim();
    let endDate = (searchParams.get('endDate') || '').trim();

    if (!startDate && !endDate && cutoffParam && cutoffParam !== 'ALL' && cutoffParam !== 'CUSTOM') {
      const year = parseInt(cutoffParam, 10);
      if (!isNaN(year)) {
        const period = getCutoffPeriod(year);
        startDate = period.startDate;
        endDate = period.endDate;
      }
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const sortField = searchParams.get('sortField') || 'dateOfSettlement';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Base conditions
    const conditions: SQL[] = [sql`${claims.deletedAt} IS NULL`];

    // 0. MM vs Non-MM Category Filter
    if (category === 'MM') {
      conditions.push(eq(claims.isMm, true));
    } else if (category === 'NON_MM') {
      conditions.push(eq(claims.isMm, false));
    }

    // 1. RBAC Data Scoping
    const rbacFilter = getClaimScopeFilter(session);
    if (rbacFilter) {
      conditions.push(rbacFilter);
    }

    // 2. Branch Filter (if permitted by RBAC)
    if (branchId && branchId !== 'ALL') {
      if (session.role === 'SUPERADMIN' || session.role === 'ADMIN' || session.role === 'AUDIT') {
        conditions.push(eq(claims.branchId, branchId));
      }
    }

    // 3. Search Filter (Claim No, Policy No, Agent ID, Cause of Loss, Nama Produk)
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(claims.claimNo, searchPattern),
          ilike(claims.policyNo, searchPattern),
          ilike(claims.sourceAgentId, searchPattern),
          ilike(claims.causeOfLoss, searchPattern),
          ilike(claims.namaProduk, searchPattern)
        )!
      );
    }

    // 4. UW Year Filter
    if (uwYear && uwYear !== 'ALL') {
      conditions.push(eq(claims.uwYear, uwYear));
    }

    // 5. Product Filter
    if (product && product !== 'ALL') {
      conditions.push(eq(claims.namaProduk, product));
    }

    // 6. Agent Code Filter
    if (agentCode) {
      conditions.push(
        or(
          ilike(claims.sourceAgentId, `%${agentCode}%`),
          ilike(agents.agentCode, `%${agentCode}%`)
        )!
      );
    }

    // 7. Date Range Filter (based on dateOfSettlement)
    if (startDate) {
      conditions.push(gte(claims.dateOfSettlement, startDate));
    }
    if (endDate) {
      conditions.push(lte(claims.dateOfSettlement, endDate));
    }

    const whereClause = and(...conditions);

    // Sorting definition
    let orderByClause;
    const direction = sortOrder === 'asc' ? asc : desc;
    switch (sortField) {
      case 'grossClaim':
        orderByClause = direction(claims.grossClaim);
        break;
      case 'claimNo':
        orderByClause = direction(claims.claimNo);
        break;
      case 'policyNo':
        orderByClause = direction(claims.policyNo);
        break;
      case 'uwYear':
        orderByClause = direction(claims.uwYear);
        break;
      case 'period':
        orderByClause = direction(claims.period);
        break;
      case 'dateOfSettlement':
      default:
        orderByClause = direction(claims.dateOfSettlement);
        break;
    }

    // Execute Count & Aggregations + Data Query in parallel
    const [summaryResult, items] = await Promise.all([
      db
        .select({
          totalCount: sql<number>`count(*)::int`,
          totalGrossClaim: sql<string>`coalesce(sum(${claims.grossClaim}), 0)::text`,
          totalGrossClaimMm: sql<string>`coalesce(sum(case when ${claims.isMm} = true then ${claims.grossClaim} else 0 end), 0)::text`,
          totalGrossClaimNonMm: sql<string>`coalesce(sum(case when ${claims.isMm} = false then ${claims.grossClaim} else 0 end), 0)::text`,
          totalIndemnity: sql<string>`coalesce(sum(${claims.indemnity}), 0)::text`,
        })
        .from(claims)
        .leftJoin(agents, eq(claims.agentId, agents.id))
        .where(whereClause),

      db
        .select({
          id: claims.id,
          claimNo: claims.claimNo,
          policyNo: claims.policyNo,
          dateOfSettlement: claims.dateOfSettlement,
          period: claims.period,
          uwYear: claims.uwYear,
          grossClaim: claims.grossClaim,
          rawBranch: claims.rawBranch,
          namaProduk: claims.namaProduk,
          currency: claims.currency,
          causeOfLoss: claims.causeOfLoss,
          indemnity: claims.indemnity,
          deductible: claims.deductible,
          salvage: claims.salvage,
          subrogation: claims.subrogation,
          sourceAgentId: claims.sourceAgentId,
          isMm: claims.isMm,
          createdAt: claims.createdAt,
          // Joined details
          agentRealCode: agents.agentCode,
          agentRealName: agents.name,
          agentPeringkat: agents.peringkat,
          branchId: claims.branchId,
          branchName: branches.name,
          branchCode: branches.code,
        })
        .from(claims)
        .leftJoin(agents, eq(claims.agentId, agents.id))
        .leftJoin(branches, eq(claims.branchId, branches.id))
        .where(whereClause)
        .orderBy(desc(claims.isMm), orderByClause, desc(claims.id))
        .limit(limit)
        .offset(offset),
    ]);

    const totalItems = summaryResult[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
      summary: {
        totalItems,
        totalGrossClaim: parseFloat(summaryResult[0]?.totalGrossClaim || '0'),
        totalGrossClaimMm: parseFloat(summaryResult[0]?.totalGrossClaimMm || '0'),
        totalGrossClaimNonMm: parseFloat(summaryResult[0]?.totalGrossClaimNonMm || '0'),
        totalIndemnity: parseFloat(summaryResult[0]?.totalIndemnity || '0'),
      },
    });
  } catch (err: any) {
    console.error('Error fetching claims in explorer:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memuat data eksplorasi klaim' },
      { status: 500 }
    );
  }
}
