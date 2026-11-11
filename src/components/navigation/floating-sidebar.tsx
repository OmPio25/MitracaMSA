'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  TrendingUp,
  GitFork,
  Layers,
  UploadCloud,
  Settings,
  ChevronDown,
  Users,
  Sparkles,
  Building2,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useNavigation } from './navigation-context';
import { useAppBranding } from '@/context/branding-context';
import { useTheme } from '@/context/theme-context';
import { UserSessionPayload } from '@/lib/auth/session';
import { APP_VERSION } from '@/lib/constants/version';

export function FloatingSidebar() {
  const pathname = usePathname();
  const { branding } = useAppBranding();
  const { isCollapsed, toggleCollapse, isMobileOpen, setIsMobileOpen } = useNavigation();
  const { theme, toggleTheme } = useTheme();

  const [session, setSession] = useState<UserSessionPayload | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Jangan render di halaman login
  const isLoginPage = pathname === '/login';

  // Otomatis buka accordion settings jika sedang berada di salah satu halaman settings
  const isSettingsActive =
    pathname?.startsWith('/settings') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/agent');

  useEffect(() => {
    if (isSettingsActive) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsActive]);

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
        setIsLoadingSession(false);
      }
    }

    loadSession();
  }, [isLoginPage]);

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

  const getRoleBadgeStyle = (r?: string) => {
    switch (r) {
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'KACAB':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PIC_CABANG':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'AGENT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'OFFICER_AGENT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'AUDIT':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const mainNavItems = [
    {
      title: 'Analitik & Loss Ratio',
      href: '/analytics',
      icon: TrendingUp,
      color: 'text-emerald-500 dark:text-emerald-400',
      activeBg: 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 font-bold shadow-xs',
      isActive: pathname?.startsWith('/analytics'),
    },
    {
      title: 'Pohon Hirarki',
      href: '/hierarchy',
      icon: GitFork,
      color: 'text-indigo-500 dark:text-indigo-400',
      activeBg: 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60 font-bold shadow-xs',
      isActive: pathname?.startsWith('/hierarchy'),
    },
    {
      title: 'Polis & Klaim',
      href: '/explorer',
      icon: Layers,
      color: 'text-amber-500 dark:text-amber-400',
      activeBg: 'bg-amber-50/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 font-bold shadow-xs',
      isActive: pathname?.startsWith('/explorer'),
    },
  ];

  // Submenu Pengaturan & Administrasi yang difilter dinamis sesuai peran pengguna (RBAC)
  const settingsNavItems = [
    ...(isSuperAdmin
      ? [
          {
            title: 'Kelola User',
            href: '/admin/users',
            icon: Users,
            iconColor: 'text-violet-500 dark:text-violet-400',
            activeBg: 'bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-bold border border-violet-200 dark:border-violet-800/50',
            isActive: pathname?.startsWith('/admin/users'),
          },
          {
            title: 'Identitas Aplikasi',
            href: '/settings/app',
            icon: Sparkles,
            iconColor: 'text-fuchsia-500 dark:text-fuchsia-400',
            activeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/70 text-fuchsia-700 dark:text-fuchsia-300 font-bold border border-fuchsia-200 dark:border-fuchsia-800/50',
            isActive: pathname?.startsWith('/settings/app'),
          },
        ]
      : []),
    ...(isSuperAdmin || isAdmin
      ? [
          {
            title: 'Master Cabang',
            href: '/admin/branches',
            icon: Building2,
            iconColor: 'text-blue-500 dark:text-blue-400',
            activeBg: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/50',
            isActive: pathname?.startsWith('/admin/branches'),
          },
          {
            title: 'Master Agen',
            href: '/admin/agents',
            icon: UserCheck,
            iconColor: 'text-teal-500 dark:text-teal-400',
            activeBg: 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800/50',
            isActive: pathname?.startsWith('/admin/agents'),
          },
        ]
      : []),
    ...(isSuperAdmin || role === 'AUDIT' || isAdmin
      ? [
          {
            title: 'Log Audit Trail',
            href: '/admin/audit-logs',
            icon: ShieldCheck,
            iconColor: 'text-rose-500 dark:text-rose-400',
            activeBg: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800/50',
            isActive: pathname?.startsWith('/admin/audit-logs'),
          },
        ]
      : []),
    ...(role === 'AGENT' ||
    role === 'OFFICER_AGENT' ||
    isSuperAdmin ||
    isAdmin ||
    role === 'AUDIT' ||
    ((role === 'KACAB' || role === 'PIC_CABANG') && (session as any)?.isPortalActive)
      ? [
          {
            title:
              isSuperAdmin || isAdmin || role === 'AUDIT'
                ? 'Direktori Agen & Asisten'
                : role === 'KACAB' || role === 'PIC_CABANG'
                ? 'Direktori Agen Cabang'
                : 'Portal Agen & Asisten',
            href: '/agent/portal',
            icon: ShieldCheck,
            iconColor: 'text-cyan-500 dark:text-cyan-400',
            activeBg: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-200 dark:border-cyan-800/50',
            isActive: pathname?.startsWith('/agent/portal'),
          },
        ]
      : []),
    {
      title: 'Ganti Password',
      href: '/settings/change-password',
      icon: KeyRound,
      iconColor: 'text-amber-500 dark:text-amber-400',
      activeBg: 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/50',
      isActive: pathname?.startsWith('/settings/change-password'),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Floating Sidebar Container */}
      <aside
        className={`fixed left-3 sm:left-4 top-3 sm:top-4 bottom-3 sm:bottom-4 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 dark:shadow-black/50 flex flex-col transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-[calc(100%+2rem)] md:translate-x-0'
        }`}
      >
        {/* Desktop Edge Floating Toggle Badge (Opsi 1: Notion / Figma style) */}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Perlebar Menu (Expand)' : 'Perkecil Menu (Collapse)'}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-md text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95 transition z-50 items-center justify-center cursor-pointer"
          aria-label={isCollapsed ? 'Perlebar Menu' : 'Perkecil Menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {/* ── 1. HEADER BRAND & LOGO ────────────────────────────────────────── */}
        <div
          className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center shrink-0 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <Link
            href="/analytics"
            className={`flex items-center gap-3 group min-w-0 ${
              isCollapsed ? 'justify-center' : 'overflow-hidden'
            }`}
            title={branding.appName || 'MitracaMSA'}
          >
            {branding.logoType === 'image' && branding.logoUrl ? (
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center p-0.5 overflow-hidden group-hover:scale-105 transition shrink-0">
                <img
                  src={branding.logoUrl}
                  alt={branding.appName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs group-hover:scale-105 transition shrink-0 uppercase tracking-tight">
                {branding.logoText || 'M'}
              </div>
            )}

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base leading-tight truncate">
                    {branding.appName || 'MitracaMSA'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    v{APP_VERSION}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase truncate">
                  {branding.appSubtitle || 'Agency Management'}
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Close Button (Hanya tampil di layar ponsel saat drawer terbuka) */}
          <button
            onClick={() => setIsMobileOpen(false)}
            title="Tutup Menu"
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. DAFTAR TAUTAN NAVIGASI UTAMA ───────────────────────────────── */}
        <div
          className={`flex-1 p-3 space-y-1.5 ${
            isCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'
          }`}
        >
          {/* Main Links */}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                title={item.title}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition group active:scale-95 ${
                  item.isActive
                    ? item.activeBg
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${item.color} ${
                    item.isActive ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.title}</span>}

                {/* Collapsed Tooltip with Arrow Pointer */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap flex items-center">
                    {item.title}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                  </div>
                )}
              </Link>
            );
          })}

          {/* Upload Modul: Superadmin & Admin only */}
          {canAccessUpload && (
            <Link
              href="/"
              prefetch={false}
              title="Upload Modul"
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition group active:scale-95 ${
                pathname === '/'
                  ? 'bg-sky-50/80 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800/60 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <UploadCloud
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 text-sky-500 dark:text-sky-400 ${
                  pathname === '/' ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
                }`}
              />
              {!isCollapsed && <span className="truncate">Upload Modul</span>}

              {/* Collapsed Tooltip with Arrow Pointer */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap flex items-center">
                  Upload Modul
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                </div>
              )}
            </Link>
          )}

          {/* Divider */}
          <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

          {/* ── 3. GRUP MENU PENGATURAN & ADMINISTRASI (OPSI 2: ADAPTIVE COLLAPSED) ───────────────────────── */}
          <div>
            {isCollapsed ? (
              // Mode Ramping: Muncul sebagai deretan icon menu mandiri terpisah dengan tooltip
              <div className="space-y-1.5">
                {settingsNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      title={item.title}
                      className={`relative flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition group active:scale-95 ${
                        item.isActive
                          ? item.activeBg
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${item.iconColor} ${
                          item.isActive ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
                        }`}
                      />

                      {/* Tooltip Melayang dengan Arrow Pointer */}
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap flex items-center">
                        {item.title}
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              // Mode Normal: Accordion Pengaturan interaktif
              <div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                    isSettingsActive
                      ? 'text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                      : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Pengaturan</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isSettingsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isSettingsOpen && (
                  <div className="mt-1 pl-2 space-y-1">
                    {settingsNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          title={item.title}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition active:scale-95 ${
                            item.isActive
                              ? item.activeBg
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${item.iconColor} ${
                            item.isActive ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
                          }`} />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 4. FOOTER: THEME SWITCHER, PROFIL PENGGUNA & LOGOUT ─────────── */}
        <div
          className={`p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 rounded-b-2xl shrink-0 ${
            isCollapsed ? 'overflow-visible' : ''
          }`}
        >
          {/* Quick Theme Switcher Button */}
          {!isCollapsed ? (
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              className="w-full flex items-center justify-between px-2.5 py-1.5 mb-2.5 rounded-xl text-xs font-medium transition bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 shadow-2xs active:scale-98"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="font-semibold text-[11px]">
                  {theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}
                </span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>
          ) : (
            <div className="flex justify-center mb-2">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                className="relative flex items-center justify-center p-2 rounded-xl text-xs font-semibold transition group active:scale-95 text-slate-500 hover:text-amber-500 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-500 group-hover:text-amber-500" />
                )}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap flex items-center">
                  {theme === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap'}
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                </div>
              </button>
            </div>
          )}

          {session ? (
            <div
              className={`flex ${
                isCollapsed ? 'flex-col items-center gap-2.5' : 'items-center justify-between gap-2'
              }`}
            >
              {/* User Avatar & Info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative group">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border shadow-xs cursor-default ${getRoleBadgeStyle(
                      session.role
                    )}`}
                    title={`${session.name} (${session.role})`}
                  >
                    {session.name ? session.name.charAt(0).toUpperCase() : 'U'}
                  </div>

                  {/* Avatar Tooltip in Collapsed Mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap flex items-center">
                      <span>
                        {session.name} ({session.role})
                      </span>
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={session.name}>
                      {session.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                      {session.role === 'KACAB' || session.role === 'PIC_CABANG'
                        ? session.branchName || session.branchCode || 'Cabang'
                        : session.role === 'AGENT' || session.role === 'OFFICER_AGENT'
                        ? `Agen: ${session.agentCode || session.parentAgentCode || '-'}`
                        : session.role}
                    </span>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <div className="flex items-center gap-1 shrink-0 relative group">
                <button
                  onClick={handleLogout}
                  title="Logout dari Sesi"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Logout Tooltip in Collapsed Mode */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap flex items-center">
                    Logout
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Link
                href="/login"
                className={`w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs transition text-center ${
                  isCollapsed ? 'px-2' : 'px-4'
                }`}
              >
                {isCollapsed ? 'Log' : 'Login'}
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
