import { NextRequest, NextResponse } from 'next/server';
import { generateTemplateWorkbook } from '@/lib/ingestion/template-generator';
import { TEMPLATE_DEFINITIONS, TemplateType } from '@/lib/ingestion/template-definitions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') ?? 'DATA_AGENT') as TemplateType;

    if (!TEMPLATE_DEFINITIONS[type]) {
      return NextResponse.json(
        { error: `Tipe template '${type}' tidak valid. Pilihan: DATA_AGENT, MASTER_PRODUKSI, MASTER_CLAIM` },
        { status: 400 }
      );
    }

    const definition = TEMPLATE_DEFINITIONS[type];
    const buffer = await generateTemplateWorkbook(type);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${definition.fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal membuat file template' }, { status: 500 });
  }
}
