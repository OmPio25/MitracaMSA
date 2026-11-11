import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (session) {
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'AUTH_LOGOUT',
      category: 'AUTH',
      status: 'SUCCESS',
      description: `Pengguna ${session.name} (${session.role}) berhasil logout`,
      req,
    });
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil',
  });

  clearSessionCookie(response);
  return response;
}
