import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productionRecords, agents, branches } from '@/db/schema';
import { sql, eq, and, or, ilike, gte, lte, desc, asc, SQL } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import { getProductionScopeFilter } from '@/lib/auth/rbac-filter';
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
      const [products, statuses] = await Promise.all([
        db.selectDistinct({ product: productionRecords.product })
          .from(productionRecords)
          .where(sql`${productionRecords.product} IS NOT NULL AND ${productionRecords.product} != ''`)
          .orderBy(productionRecords.product)
          .limit(100),
        db.selectDistinct({ status: productionRecords.policyStatus })
          .from(productionRecords)
          .where(sql`${productionRecords.policyStatus} IS NOT NULL AND ${productionRecords.policyStatus} != ''`)
          .orderBy(productionRecords.policyStatus)
          .limit(50),
      ]);

      return NextResponse.json({
        success: true,
        products: products.map((p) => p.product).filter(Boolean),
        statuses: statuses.map((s) => s.status).filter(Boolean),
      });
    }

    // Parsing parameters
    const search = (searchParams.get('search') || '').trim();
    const category = (searchParams.get('category') || 'ALL').trim().toUpperCase(); // ALL, MM, NON_MM
    const status = (searchParams.get('status') || '').trim();
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

    const sortField = searchParams.get('sortField') || 'period';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Base conditions
    const conditions: SQL[] = [sql`${productionRecords.deletedAt} IS NULL`];

    // 0. MM vs Non-MM Category Filter
    if (category === 'MM') {
      conditions.push(eq(productionRecords.isMm, true));
    } else if (category === 'NON_MM') {
      conditions.push(eq(productionRecords.isMm, false));
    }

    // 1. RBAC Data Scoping
    const rbacFilter = getProductionScopeFilter(session);
    if (rbacFilter) {
      conditions.push(rbacFilter);
    }

    // 2. Branch Filter (if permitted by RBAC)
    if (branchId && branchId !== 'ALL') {
      // If user is KACAB/PIC_CABANG, their branch is already enforced by rbacFilter
      if (session.role === 'SUPERADMIN' || session.role === 'ADMIN' || session.role === 'AUDIT') {
        conditions.push(eq(productionRecords.branchId, branchId));
      }
    }

    // 3. Search Filter (Policy No, Insured Name, Agent ID, Agent Name, SPAU No)
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(productionRecords.policyNo, searchPattern),
          ilike(productionRecords.insuredName, searchPattern),
          ilike(productionRecords.sourceAgentId, searchPattern),
          ilike(productionRecords.agentName, searchPattern),
          ilike(productionRecords.spauNo, searchPattern)
        )!
      );
    }

    // 4. Status Filter
    if (status && status !== 'ALL') {
      conditions.push(eq(productionRecords.policyStatus, status));
    }

    // 5. Product Filter
    if (product && product !== 'ALL') {
      conditions.push(eq(productionRecords.product, product));
    }

    // 6. Agent Code Filter
    if (agentCode) {
      conditions.push(
        or(
          ilike(productionRecords.sourceAgentId, `%${agentCode}%`),
          ilike(agents.agentCode, `%${agentCode}%`)
        )!
      );
    }

    // 7. Date Range Filter (based on startPeriod or period)
    if (startDate) {
      conditions.push(gte(productionRecords.startPeriod, startDate));
    }
    if (endDate) {
      conditions.push(lte(productionRecords.startPeriod, endDate));
    }

    const whereClause = and(...conditions);

    // Sorting definition
    let orderByClause;
    const direction = sortOrder === 'asc' ? asc : desc;
    switch (sortField) {
      case 'nilaiPremi':
        orderByClause = direction(productionRecords.nilaiPremi);
        break;
      case 'tsiInIdr':
        orderByClause = direction(productionRecords.tsiInIdr);
        break;
      case 'startPeriod':
        orderByClause = direction(productionRecords.startPeriod);
        break;
      case 'policyNo':
        orderByClause = direction(productionRecords.policyNo);
        break;
      case 'insuredName':
        orderByClause = direction(productionRecords.insuredName);
        break;
      case 'period':
      default:
        orderByClause = direction(productionRecords.period);
        break;
    }

    // Execute Count & Aggregations + Data Query in parallel
    const [summaryResult, items] = await Promise.all([
      db
        .select({
          totalCount: sql<number>`count(*)::int`,
          totalPremi: sql<string>`coalesce(sum(${productionRecords.nilaiPremi}), 0)::text`,
          totalPremiMm: sql<string>`coalesce(sum(case when ${productionRecords.isMm} = true then ${productionRecords.nilaiPremi} else 0 end), 0)::text`,
          totalPremiNonMm: sql<string>`coalesce(sum(case when ${productionRecords.isMm} = false then ${productionRecords.nilaiPremi} else 0 end), 0)::text`,
          totalTsi: sql<string>`coalesce(sum(${productionRecords.tsiInIdr}), 0)::text`,
        })
        .from(productionRecords)
        .leftJoin(agents, eq(productionRecords.agentId, agents.id))
        .where(whereClause),

      db
        .select({
          id: productionRecords.id,
          policyNo: productionRecords.policyNo,
          spauNo: productionRecords.spauNo,
          spauType: productionRecords.spauType,
          policyStatus: productionRecords.policyStatus,
          bulan: productionRecords.bulan,
          period: productionRecords.period,
          startPeriod: productionRecords.startPeriod,
          endPeriod: productionRecords.endPeriod,
          insuredName: productionRecords.insuredName,
          product: productionRecords.product,
          coverage: productionRecords.coverage,
          currencyTsi: productionRecords.currencyTsi,
          tsi: productionRecords.tsi,
          tsiInIdr: productionRecords.tsiInIdr,
          nilaiPremi: productionRecords.nilaiPremi,
          nilaiKomisi: productionRecords.nilaiKomisi,
          nilaiDiskon: productionRecords.nilaiDiskon,
          nilaiAkusisi: productionRecords.nilaiAkusisi,
          sourceAgentId: productionRecords.sourceAgentId,
          agentName: productionRecords.agentName,
          agentStatus: productionRecords.agentStatus,
          rawBranch: productionRecords.rawBranch,
          representative: productionRecords.representative,
          objectDetails: productionRecords.objectDetails,
          isMm: productionRecords.isMm,
          createdAt: productionRecords.createdAt,
          // Joined details
          agentRealCode: agents.agentCode,
          agentRealName: agents.name,
          agentPeringkat: agents.peringkat,
          branchId: productionRecords.branchId,
          branchName: branches.name,
          branchCode: branches.code,
        })
        .from(productionRecords)
        .leftJoin(agents, eq(productionRecords.agentId, agents.id))
        .leftJoin(branches, eq(productionRecords.branchId, branches.id))
        .where(whereClause)
        .orderBy(desc(productionRecords.isMm), orderByClause, desc(productionRecords.id))
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
        totalPremi: parseFloat(summaryResult[0]?.totalPremi || '0'),
        totalPremiMm: parseFloat(summaryResult[0]?.totalPremiMm || '0'),
        totalPremiNonMm: parseFloat(summaryResult[0]?.totalPremiNonMm || '0'),
        totalTsi: parseFloat(summaryResult[0]?.totalTsi || '0'),
      },
    });
  } catch (err: any) {
    console.error('Error fetching policies in explorer:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memuat data eksplorasi polis' },
      { status: 500 }
    );
  }
}
