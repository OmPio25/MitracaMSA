'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  UploadCloud,
  GitFork,
  TrendingUp,
  LogOut,
  Settings,
  ChevronDown,
  Building2,
  Users,
  KeyRound,
  ShieldCheck,
  Building,
  Sparkles,
  Layers,
} from 'lucide-react';
import { UserSessionPayload } from '@/lib/auth/session';
import { useAppBranding } from '@/context/branding-context';

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { branding } = useAppBranding();
  const [session, setSession] = useState<UserSessionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Jangan render navigasi internal di halaman login
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isLoginPage) return;

    async function loadSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setSession(data.user);
          }
        }
      } catch (err) {
        console.error('Failed to load user session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [isLoginPage]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Tutup dropdown saat pathname berubah
  useEffect(() => {
    setIsSettingsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (isLoginPage) return null;

  const role = session?.role;
  const canAccessUpload = role === 'SUPERADMIN' || role === 'ADMIN';
  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';
  const defaultHomeHref = role === 'AGENT' || role === 'OFFICER_AGENT' ? '/agent/portal' : '/analytics';

  const isSettingsActive =
    pathname?.startsWith('/settings') || pathname?.startsWith('/admin');

  const getRoleBadgeStyle = (r?: string) => {
    switch (r) {
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'KACAB':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PIC_CABANG':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'AGENT':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'OFFICER_AGENT':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'AUDIT':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href={defaultHomeHref} className="flex items-center gap-2.5 group">
              {branding.logoType === 'image' && branding.logoUrl ? (
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center p-0.5 overflow-hidden group-hover:shadow transition shrink-0">
                  <img
                    src={branding.logoUrl}
                    alt={branding.appName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div
                  suppressHydrationWarning
                  className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm group-hover:shadow transition shrink-0 uppercase tracking-tight"
                >
                  {branding.logoText || 'M'}
                </div>
              )}
              <div className="flex flex-col min-w-0" suppressHydrationWarning>
                <span
                  suppressHydrationWarning
                  className="font-extrabold text-slate-900 tracking-tight text-lg leading-tight truncate max-w-[200px] sm:max-w-[260px]"
                >
                  {branding.appName || 'MitracaMSA'}
                </span>
                <span
                  suppressHydrationWarning
                  className="text-[10px] text-slate-500 tracking-wider font-semibold uppercase truncate max-w-[200px] sm:max-w-[260px]"
                >
                  {branding.appSubtitle || 'Agency Management'}
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              {/* 1. Analitik & Loss Ratio: Semua Peran (Data Scoped) */}
              <Link
                href="/analytics"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  pathname?.startsWith('/analytics')
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Analitik & Loss Ratio
              </Link>

              {/* 2. Pohon Hirarki: Semua Peran (Data Scoped) */}
              <Link
                href="/hierarchy"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  pathname?.startsWith('/hierarchy')
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GitFork className="w-4 h-4" />
                Pohon Hirarki
              </Link>

              {/* 3. Eksplorasi Detail Polis & Klaim: Semua Peran (Data Scoped) */}
              <Link
                href="/explorer"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  pathname?.startsWith('/explorer')
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                Polis & Klaim
              </Link>

              {/* 3. Upload Modul: Khusus SUPERADMIN & ADMIN */}
              {canAccessUpload && (
                <Link
                  href="/"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === '/'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload Modul
                </Link>
              )}

              {/* 4. Menu Pengaturan (Paling Akhir) */}
              <div className="relative" ref={settingsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    isSettingsActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  aria-expanded={isSettingsOpen}
                >
                  <Settings className="w-4 h-4" />
                  <span>Pengaturan</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isSettingsOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu Pengaturan */}
                {isSettingsOpen && (
                  <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Bagian Administrasi Sistem (Hanya Superadmin & Admin) */}
                    {(isSuperAdmin || isAdmin) && (
                      <div className="px-2 pb-1.5 mb-1.5 border-b border-slate-100">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Administrasi Sistem
                        </div>

                        {/* Kelola User: Eksklusif Superadmin */}
                        {isSuperAdmin && (
                          <>
                            <Link
                              href="/admin/users"
                              onClick={() => setIsSettingsOpen(false)}
                              className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                                pathname?.startsWith('/admin/users')
                                  ? 'bg-purple-50 text-purple-700 font-bold'
                                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Users className="w-4 h-4 mt-0.5 text-purple-600 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold">Kelola User</span>
                                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-extrabold">
                                    Superadmin
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                                  Akses & peran pengguna RBAC
                                </p>
                              </div>
                            </Link>

                            {/* Identitas Aplikasi (Nama & Logo): Eksklusif Superadmin */}
                            <Link
                              href="/settings/app"
                              onClick={() => setIsSettingsOpen(false)}
                              className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                                pathname?.startsWith('/settings/app')
                                  ? 'bg-purple-50 text-purple-700 font-bold'
                                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Sparkles className="w-4 h-4 mt-0.5 text-purple-600 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold">Identitas Aplikasi</span>
                                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-extrabold">
                                    Superadmin
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                                  Ubah nama & logo aplikasi
                                </p>
                              </div>
                            </Link>
                          </>
                        )}

                        {/* Master Cabang: Superadmin & Admin */}
                        <Link
                          href="/admin/branches"
                          onClick={() => setIsSettingsOpen(false)}
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                            pathname?.startsWith('/admin/branches')
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">Master Cabang</span>
                              <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-extrabold">
                                Master
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                              Kelola daftar cabang agensi
                            </p>
                          </div>
                        </Link>
                      </div>
                    )}

                    {/* Bagian Keamanan Akun: Tersedia untuk SEMUA ROLE */}
                    <div className="px-2">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Keamanan & Akun
                      </div>
                      <Link
                        href="/settings/change-password"
                        onClick={() => setIsSettingsOpen(false)}
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          pathname?.startsWith('/settings/change-password')
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <KeyRound className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold">Change Password</span>
                          <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                            Ganti kata sandi akun Anda
                          </p>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Profil Pengguna & Quick Action */}
          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                      {session.name}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                        session.role
                      )}`}
                    >
                      {session.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {session.role === 'KACAB' || session.role === 'PIC_CABANG'
                      ? `Cabang: ${session.branchName || session.branchCode || 'Jatinegara'}`
                      : session.role === 'AGENT' || session.role === 'OFFICER_AGENT'
                      ? `Agen: ${session.agentCode || session.parentAgentCode || '871300'}`
                      : 'Skup: Nasional'}
                  </span>
                </div>

                {/* Shortcut Quick Ganti Password */}
                <Link
                  href="/settings/change-password"
                  title="Pengaturan: Ganti Password"
                  className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition"
                >
                  <KeyRound className="w-4 h-4" />
                </Link>

                {/* Tombol Logout */}
                <button
                  onClick={handleLogout}
                  title="Logout dari Sesi"
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
