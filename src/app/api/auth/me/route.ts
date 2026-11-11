import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { success: false, authenticated: false, user: null },
      { status: 401 }
    );
  }

  // Ambil status isPortalActive terkini secara real-time jika user memiliki relasi cabang
  let isPortalActive = session.isPortalActive ?? false;
  if (session.branchId) {
    const [b] = await db
      .select({ isPortalActive: branches.isPortalActive })
      .from(branches)
      .where(eq(branches.id, session.branchId))
      .limit(1);
    if (b) {
      isPortalActive = b.isPortalActive;
    }
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    user: {
      ...session,
      isPortalActive,
    },
  });
}
