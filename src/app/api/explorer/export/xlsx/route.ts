import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { generatePoliciesExcelWorkbook, generateClaimsExcelWorkbook } from '@/lib/export/excel-explorer-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const url = new URL(req.url);
    const origin = url.origin;
    const type = url.searchParams.get('type') || 'policies'; // 'policies' or 'claims'

    if (type === 'policies') {
      const apiUrl = new URL('/api/explorer/policies', origin);
      url.searchParams.forEach((val, key) => {
        if (key !== 'type') apiUrl.searchParams.set(key, val);
      });
      // Set high limit for export (e.g. 5000 items)
      apiUrl.searchParams.set('limit', '5000');
      apiUrl.searchParams.set('page', '1');

      // Forward request with cookie
      const res = await fetch(apiUrl.toString(), {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Gagal mengambil data polis untuk ekspor: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Data polis tidak valid');
      }

      const buffer = await generatePoliciesExcelWorkbook(data.items || []);
      const filename = `Data_Polis_Mitraca_${new Date().toISOString().slice(0, 10)}.xlsx`;

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      const apiUrl = new URL('/api/explorer/claims', origin);
      url.searchParams.forEach((val, key) => {
        if (key !== 'type') apiUrl.searchParams.set(key, val);
      });
      apiUrl.searchParams.set('limit', '5000');
      apiUrl.searchParams.set('page', '1');

      const res = await fetch(apiUrl.toString(), {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Gagal mengambil data klaim untuk ekspor: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Data klaim tidak valid');
      }

      const buffer = await generateClaimsExcelWorkbook(data.items || []);
      const filename = `Data_Klaim_Mitraca_${new Date().toISOString().slice(0, 10)}.xlsx`;

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (err: any) {
    console.error('Error exporting explorer Excel:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mengekspor data ke Excel' },
      { status: 500 }
    );
  }
}
