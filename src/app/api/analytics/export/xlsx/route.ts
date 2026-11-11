import { NextRequest, NextResponse } from 'next/server';
import { generateAnalyticsExcelWorkbook } from '@/lib/export/excel-analytics-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const analyticsUrl = new URL('/api/analytics', origin);
    
    // Pass through all search params
    url.searchParams.forEach((val, key) => {
      analyticsUrl.searchParams.set(key, val);
    });

    const res = await fetch(analyticsUrl.toString(), {
      cache: 'no-store',
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
    });
    if (!res.ok) {
      throw new Error(`Gagal mengambil data analitik: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Data analitik tidak valid');
    }

    // Resolve nama cabang terpilih
    let branchDisplayName = 'Nasional';
    if (data.filter?.branchName) {
      branchDisplayName = data.filter.branchName;
    } else if (data.filter?.selectedBranch?.name) {
      branchDisplayName = data.filter.selectedBranch.name;
    } else if (data.filter?.branchId) {
      branchDisplayName = data.branchPerformance?.[0]?.branchName || 'Cabang Terpilih';
    }

    const exportPayload = {
      isAgentRole: Boolean(data.isAgentRole),
      filterInfo: {
        cutoffLabel: data.filter.cutoffPeriod?.label || 'Semua Periode',
        dateRange: `${data.filter.startDate || '-'} s/d ${data.filter.endDate || '-'}`,
        branchName: branchDisplayName,
        agentCode: data.filter.agentCode || undefined,
        uwYear: data.filter.uwYear || undefined,
      },
      kpi: data.kpi,
      branchPerformance: data.branchPerformance,
      allAgentsPerformance: data.allAgentsPerformance,
      agentPerformance: data.agentPerformance,
      topCausesOfLoss: data.topCausesOfLoss,
      personalPerformance: data.personalPerformance,
    };

    const buffer = await generateAnalyticsExcelWorkbook(exportPayload);

    const cutoffLabel = data.filter.activeCutoffYear ? `Cutoff_${data.filter.activeCutoffYear}` : 'All_Period';
    const branchSuffix = branchDisplayName !== 'Nasional' ? `_${branchDisplayName.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const filename = `Laporan_Analitik_Loss_Ratio_${cutoffLabel}${branchSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Error generating analytics Excel:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal membuat file Excel analitik' },
      { status: 500 }
    );
  }
}
