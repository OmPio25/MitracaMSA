import { NextRequest, NextResponse } from 'next/server';
import { generateAnalyticsPdf } from '@/lib/export/pdf-analytics-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const analyticsUrl = new URL('/api/analytics', origin);

    // Pass through all query parameters (cutoffYear, branchId, agentCode, uwYear, etc.)
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

    const pdfBuffer = await generateAnalyticsPdf(exportPayload);

    const cutoffLabel = data.filter.activeCutoffYear ? `Cutoff_${data.filter.activeCutoffYear}` : 'All_Period';
    const branchSuffix = branchDisplayName !== 'Nasional' ? `_${branchDisplayName.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const filename = `Laporan_Eksekutif_Analitik_Loss_Ratio_${cutoffLabel}${branchSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Error generating analytics PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal membuat dokumen PDF analitik' },
      { status: 500 }
    );
  }
}
