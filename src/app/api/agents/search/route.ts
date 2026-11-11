import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents } from '@/db/schema';
import { or, ilike, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ agents: [] });
    }

    const results = await db
      .select({
        id: agents.id,
        agentCode: agents.agentCode,
        name: agents.name,
        uplineAgentCode: agents.uplineAgentCode,
        uplineStatus: agents.uplineStatus,
        statusKeagenan: agents.statusKeagenan,
        peringkat: agents.peringkat,
        rawBranchName: agents.rawBranchName,
      })
      .from(agents)
      .where(
        or(
          ilike(agents.agentCode, `%${q}%`),
          ilike(agents.name, `%${q}%`)
        )
      )
      .limit(15);

    return NextResponse.json({ agents: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mencari agen.' }, { status: 500 });
  }
}
