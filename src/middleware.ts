import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public routes & static assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/public') ||
    (pathname === '/api/settings/app' && req.method === 'GET')
  ) {
    return NextResponse.next();
  }

  // 2. Verify Session Token
  const session = await getRequestSession(req);

  // Jika belum login dan mengakses halaman UI, redirect ke /login
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Sesi login tidak valid atau telah berakhir' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Role-based Route Guarding
  const { role } = session;

  // Modul Kelola Pengguna (/admin/users): Eksklusif Khusus SUPERADMIN
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/api/admin/users')) {
    if (role !== 'SUPERADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Hanya SUPERADMIN yang berwenang mengelola pengguna' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/analytics', req.url));
    }
  }

  // Pengaturan Identitas & Logo Aplikasi (/settings/app): Eksklusif Khusus SUPERADMIN
  if (pathname.startsWith('/settings/app') || (pathname.startsWith('/api/settings/app') && req.method !== 'GET')) {
    if (role !== 'SUPERADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Hanya SUPERADMIN yang berwenang mengubah nama dan logo aplikasi' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/settings/change-password', req.url));
    }
  }

  // Modul Portal & Direktori Agen/Asisten: AGENT, OFFICER_AGENT, SUPERADMIN, ADMIN, AUDIT, KACAB, dan PIC_CABANG
  if (pathname.startsWith('/agent') || pathname.startsWith('/api/agent')) {
    if (
      role !== 'AGENT' &&
      role !== 'OFFICER_AGENT' &&
      role !== 'SUPERADMIN' &&
      role !== 'ADMIN' &&
      role !== 'AUDIT' &&
      role !== 'KACAB' &&
      role !== 'PIC_CABANG'
    ) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Portal/Direktori Keagenan tidak dapat diakses oleh peran ini' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/analytics', req.url));
    }
  }

  // Modul Admin & Master Cabang: Hanya SUPERADMIN dan ADMIN
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    (pathname.startsWith('/api/branches') && req.method !== 'GET')
  ) {
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang' },
          { status: 403 }
        );
      }
      // Redirect ke dashboard analitik jika bukan admin
      return NextResponse.redirect(new URL('/analytics', req.url));
    }
  }

  // Modul Upload Ingestion: Hanya SUPERADMIN dan ADMIN (AUDIT, KACAB, AGENT tidak boleh upload)
  if (
    (pathname === '/' || pathname.startsWith('/api/upload')) &&
    (role === 'AGENT' || role === 'OFFICER_AGENT' || role === 'KACAB' || role === 'PIC_CABANG' || role === 'AUDIT')
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengunggah berkas data' },
        { status: 403 }
      );
    }
    // Alihkan peran non-admin dari root upload langsung ke dashboard Analitik & Loss Ratio
    return NextResponse.redirect(new URL('/analytics', req.url));
  }

  // Teruskan request dengan header konteks pengguna
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-role', session.role);
  if (session.branchId) requestHeaders.set('x-user-branch-id', session.branchId);
  if (session.agentId) requestHeaders.set('x-user-agent-id', session.agentId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
