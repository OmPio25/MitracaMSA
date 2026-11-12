'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Building,
  GitFork,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  Users,
  KeyRound,
  CheckCircle2,
  X,
  Loader2,
  Check,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { useAppBranding } from '@/context/branding-context';
import { hexToRgba, isColorDark, getCardBlurClass } from '@/lib/branding/glassmorphism';

const DEMO_ACCOUNTS = [
  {
    role: 'SUPERADMIN',
    email: 'superadmin@mitraca.com',
    name: 'Super Administrator',
    scope: 'Skup Nasional Penuh (Semua Modul & Akses Konfigurasi)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: ShieldCheck,
  },
  {
    role: 'ADMIN',
    email: 'admin@mitraca.com',
    name: 'Operational Admin',
    scope: 'Skup Nasional + Izin Upload Ingestion & Master Cabang',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: ShieldCheck,
  },
  {
    role: 'KACAB',
    email: 'kacab.jaksel@mitraca.com',
    name: 'Kepala Cabang Jatinegara',
    scope: 'Terisolasi Cabang 93 (Jatinegara) & Tim Agensi Cabang',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: Building,
  },
  {
    role: 'PIC_CABANG',
    email: 'pic.jaksel@mitraca.com',
    name: 'PIC Cabang Jatinegara',
    scope: 'Operasional Cabang 93 (Jatinegara)',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    icon: Building,
  },
  {
    role: 'AGENT',
    email: 'agent.citra@mitraca.com',
    name: 'Ekasurya Halim (Agent 871300)',
    scope: 'Hanya Pohon Subtree Pribadi + 80 Downline Agensi',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: GitFork,
  },
  {
    role: 'OFFICER_AGENT',
    email: 'officer.ani@mitraca.com',
    name: 'Staff Asisten Ekasurya (Officer)',
    scope: 'Mewarisi Hak & Skup Akses Ekasurya Halim (871300)',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: Users,
  },
  {
    role: 'AUDIT',
    email: 'audit@mitraca.com',
    name: 'Internal Auditor',
    scope: 'Read-Only Skup Nasional (Tanpa Izin Modifikasi/Upload)',
    badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
    icon: Eye,
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { branding } = useAppBranding();
  const redirectParam = searchParams.get('redirect');

  const cardColor = branding.cardColor || '#ffffff';
  const cardMobileOpacity = branding.cardMobileOpacity ?? 85;
  const cardDesktopOpacity = branding.cardDesktopOpacity ?? 90;
  const isDark = isColorDark(cardColor);
  const cardBlurClass = getCardBlurClass(branding.cardBlur);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo 1-click login accordion toggle
  const [isDemoAccordionOpen, setIsDemoAccordionOpen] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'RESET' | 'SUCCESS'>('REQUEST');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUserName, setForgotUserName] = useState('');
  const [forgotUserRole, setForgotUserRole] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    const loginEmail = customEmail || email;
    const loginPass = customPassword || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login gagal');
      }

      // Tentukan target pendaratan pasca-login berbasis peran (Role-Based Landing Matrix)
      // - AGENT & OFFICER_AGENT -> /agent/portal
      // - KACAB & PIC_CABANG -> /analytics
      // - SUPERADMIN, ADMIN, AUDIT -> /analytics
      const userRole = data.user?.role;
      const isAgentRole = userRole === 'AGENT' || userRole === 'OFFICER_AGENT';
      const defaultLanding = isAgentRole ? '/agent/portal' : '/analytics';

      let target: string;
      if (redirectParam && redirectParam !== '/' && redirectParam !== '/analytics') {
        // Hormati deep-link jika ada halaman tujuan spesifik (misal: /explorer, /hierarchy, dll)
        target = redirectParam;
      } else {
        target = defaultLanding;
      }

      window.location.href = target;
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Terjadi kesalahan sistem saat login');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    handleSubmit(undefined, demoEmail, 'Password123!');
  };

  // Open Forgot Password Modal
  const handleOpenForgotModal = () => {
    setForgotEmail(email || '');
    setForgotStep('REQUEST');
    setForgotError(null);
    setVerificationCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setIsForgotModalOpen(true);
  };

  // 1. Request Reset Code in Modal
  const handleRequestForgotCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotEmail.trim()) {
      setForgotError('Alamat email wajib diisi.');
      return;
    }

    try {
      setIsForgotLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses kode reset.');
      }

      setForgotUserName(data.name || '');
      setForgotUserRole(data.role || '');
      setGeneratedCode(data.resetCode || '');
      setVerificationCode(data.resetCode || '');
      setForgotStep('RESET');
    } catch (err: any) {
      setForgotError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // 2. Submit New Password in Modal
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!verificationCode.trim() || !forgotNewPassword || !forgotConfirmPassword) {
      setForgotError('Semua kolom wajib diisi.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotError('Password baru minimal 6 karakter.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Konfirmasi password baru tidak cocok.');
      return;
    }

    try {
      setIsForgotLoading(true);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: verificationCode.trim(),
          newPassword: forgotNewPassword,
          confirmPassword: forgotConfirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mereset password.');
      }

      setForgotStep('SUCCESS');
    } catch (err: any) {
      setForgotError(err.message || 'Terjadi kesalahan sistem saat memperbarui password.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSuccessClose = () => {
    setEmail(forgotEmail);
    setPassword(forgotNewPassword);
    setIsForgotModalOpen(false);
  };

  // Helper classes & styles for dynamic background
  const getLoginBgClass = () => {
    if (branding.loginBgType === 'preset') {
      switch (branding.loginBgPreset) {
        case 'midnight':
          return 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900';
        case 'ocean':
          return 'bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950';
        case 'emerald':
          return 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950';
        case 'charcoal':
          return 'bg-gradient-to-br from-neutral-950 via-stone-900 to-zinc-950';
        default:
          return 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900';
      }
    }
    if (branding.loginBgType === 'image' && branding.loginBgUrl) {
      return 'bg-slate-950';
    }
    return 'bg-slate-900';
  };

  const getLoginBgStyle = () => {
    if (branding.loginBgType === 'image' && branding.loginBgUrl) {
      return {
        backgroundImage: `url(${branding.loginBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      };
    }
    return {};
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-all duration-300 ${getLoginBgClass()}`}
      style={getLoginBgStyle()}
    >
      {/* Overlay Filter for Custom Background Image */}
      {branding.loginBgType === 'image' && branding.loginBgUrl && (
        <div
          className="absolute inset-0 bg-black backdrop-blur-[1px] pointer-events-none transition-opacity"
          style={{ opacity: (branding.loginBgOverlay ?? 60) / 100 }}
        />
      )}

      {/* Background Decorative Blur for Default Theme */}
      {branding.loginBgType === 'default' && (
        <>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {/* SINGLE UNIFIED GLASSMORPHISM LOGIN CARD */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div
          className={`${cardBlurClass} bg-[var(--card-bg-mobile)] sm:bg-[var(--card-bg-desktop)] rounded-3xl shadow-2xl border shadow-black/40 p-6 sm:p-9 transition-all ${
            isDark ? 'border-white/10 text-white' : 'border-white/50 text-slate-900'
          }`}
          style={
            {
              '--card-bg-mobile': hexToRgba(cardColor, cardMobileOpacity),
              '--card-bg-desktop': hexToRgba(cardColor, cardDesktopOpacity),
            } as React.CSSProperties
          }
        >
          {/* Header inside the unified card */}
          <div className={`text-center pb-5 mb-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200/70'}`}>
            <div className="flex items-center justify-center gap-3.5">
              {branding.logoType === 'image' && branding.logoUrl ? (
                <div
                  className={`w-12 h-12 rounded-2xl bg-white border shadow-md flex items-center justify-center p-1 overflow-hidden shrink-0 ${
                    isDark ? 'border-slate-700' : 'border-slate-200'
                  }`}
                >
                  <img src={branding.logoUrl} alt={branding.appName} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  suppressHydrationWarning
                  className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30 shrink-0 uppercase tracking-tight"
                >
                  {branding.logoText || 'M'}
                </div>
              )}
              <div className="text-left" suppressHydrationWarning>
                <h2
                  suppressHydrationWarning
                  className={`text-2xl font-black tracking-tight leading-none truncate max-w-[280px] ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {branding.appName || 'MitracaMSA'}
                </h2>
                <p
                  suppressHydrationWarning
                  className={`text-xs font-semibold uppercase tracking-wider mt-1 truncate max-w-[280px] ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {branding.appSubtitle || 'Agency Management System'}
                </p>
              </div>
            </div>
          </div>
          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
            <div>
              <label
                className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Alamat Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="nama@mitraca.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-sm rounded-xl px-4 py-3 pl-10 transition font-medium focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500/40 focus:border-blue-400'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className={`block text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className={`text-xs font-semibold transition cursor-pointer hover:underline ${
                    isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full text-sm rounded-xl px-4 py-3 pl-10 pr-10 transition font-medium focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500/40 focus:border-blue-400'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className={`absolute right-3.5 top-3.5 transition ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Switcher (Model Accordion Hide/Unhide) */}
          <div className={`mt-8 pt-5 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <button
              type="button"
              onClick={() => setIsDemoAccordionOpen(!isDemoAccordionOpen)}
              className={`w-full flex items-center justify-between p-2.5 -mx-2.5 rounded-2xl transition text-left group cursor-pointer ${
                isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
              }`}
              aria-expanded={isDemoAccordionOpen}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`p-1.5 rounded-xl group-hover:scale-105 transition ${
                    isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <span
                    className={`text-xs font-bold block transition ${
                      isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'
                    }`}
                  >
                    Uji Coba 1-Click Login
                  </span>
                  <span className={`text-[10px] block font-normal ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    7 Akun Demo RBAC
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition ${
                    isDark
                      ? 'text-slate-300 bg-slate-800/80 border-slate-700 group-hover:border-slate-600'
                      : 'text-slate-500 bg-slate-100 border-slate-200 group-hover:border-slate-300'
                  }`}
                >
                  {isDemoAccordionOpen ? 'Sembunyikan' : 'Buka Akun Demo'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isDemoAccordionOpen ? 'rotate-180 text-blue-500' : ''
                  }`}
                />
              </div>
            </button>

            {isDemoAccordionOpen && (
              <div
                className={`mt-3 pt-3 border-t space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 ${
                  isDark ? 'border-white/10' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Pilih akun untuk menguji pembatasan hak akses (*Data Scoping*):
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ${
                      isDark ? 'text-slate-300 bg-slate-800/80 border border-slate-700' : 'text-slate-500 bg-slate-100'
                    }`}
                  >
                    Pass: Password123!
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const IconComponent = acc.icon;
                    return (
                      <button
                        key={acc.role}
                        type="button"
                        onClick={() => handleQuickLogin(acc.email)}
                        disabled={isLoading}
                        className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 group/card cursor-pointer ${
                          isDark
                            ? 'border-slate-800 bg-slate-900/40 hover:border-blue-500/50 hover:bg-slate-800/60'
                            : 'border-slate-200 bg-white/60 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                      >
                        <span
                          className={`p-1.5 rounded-lg mt-0.5 shrink-0 transition ${
                            isDark
                              ? 'bg-slate-800 text-slate-300 group-hover/card:bg-blue-900/60 group-hover/card:text-blue-300'
                              : 'bg-slate-100 text-slate-700 group-hover/card:bg-blue-100 group-hover/card:text-blue-700'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold truncate ${
                                isDark ? 'text-white group-hover/card:text-blue-300' : 'text-slate-900 group-hover/card:text-blue-700'
                              }`}
                            >
                              {acc.name}
                            </span>
                          </div>
                          <span
                            className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${acc.badgeColor} mt-0.5`}
                          >
                            {acc.role}
                          </span>
                          <p
                            className={`text-[10px] leading-tight mt-1 line-clamp-2 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {acc.scope}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Forgot Password ────────────────────────────────────────────── */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {forgotStep === 'REQUEST' && 'Lupa Password Akun'}
                    {forgotStep === 'RESET' && 'Verifikasi & Password Baru'}
                    {forgotStep === 'SUCCESS' && 'Password Berhasil Diperbarui'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sistem Pemulihan Kredensial Mitraca MSA
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body Modal */}
            <div className="p-6">
              {/* Error Message */}
              {forgotError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{forgotError}</div>
                </div>
              )}

              {/* Step 1: Input Email */}
              {forgotStep === 'REQUEST' && (
                <form onSubmit={handleRequestForgotCode} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Masukkan alamat email akun Anda untuk mendapatkan kode verifikasi keamanan pemulihan kata sandi:
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="nama@mitraca.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      {isForgotLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Memeriksa Akun...</span>
                        </>
                      ) : (
                        <>
                          <span>Dapatkan Kode</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verification Code & New Password */}
              {forgotStep === 'RESET' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  {/* Generated Code Security Card */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Kode Keamanan:
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="text-[11px] text-amber-800 hover:text-amber-950 flex items-center gap-1 font-semibold underline"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Salin Kode
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-xl font-extrabold tracking-widest text-amber-950 bg-white/80 py-1.5 rounded-lg border border-amber-200 text-center font-mono">
                      {generatedCode}
                    </div>
                    <p className="text-[10px] text-amber-700 text-center">
                      Akun: <strong>{forgotEmail}</strong> ({forgotUserName} - {forgotUserRole})
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Kode Verifikasi (6 Digit)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      className="w-full text-center font-mono text-base tracking-widest bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password Baru (Min. 6 Karakter)
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Kata sandi baru..."
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pl-9 pr-9 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Ulangi kata sandi baru..."
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pl-9 pr-9 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showForgotConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setForgotStep('REQUEST')}
                      className="text-xs text-slate-500 hover:text-slate-800 transition"
                    >
                      ← Ganti Email
                    </button>

                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      {isForgotLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mereset...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reset Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Success Screen */}
              {forgotStep === 'SUCCESS' && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Password Berhasil Direset!
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Kata sandi untuk akun <strong>{forgotEmail}</strong> telah diperbarui. Silakan masuk sekarang.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSuccessClose}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <span>Masuk Sekarang</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer Modal Info */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-center">
              <p className="text-[10px] text-slate-400">
                Hubungi Super Administrator di <span className="font-semibold text-slate-600">superadmin@mitraca.com</span> jika mengalami kendala akun.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">Memuat halaman...</div>}>
      <LoginForm />
    </Suspense>
  );
}
