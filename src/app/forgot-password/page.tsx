'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  Mail,
  Lock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  Check,
  Copy,
} from 'lucide-react';
import { useAppBranding } from '@/context/branding-context';
import { hexToRgba, isColorDark, getCardBlurClass } from '@/lib/branding/glassmorphism';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { branding } = useAppBranding();

  const cardColor = branding.cardColor || '#ffffff';
  const cardMobileOpacity = branding.cardMobileOpacity ?? 85;
  const cardDesktopOpacity = branding.cardDesktopOpacity ?? 90;
  const isDark = isColorDark(cardColor);
  const cardBlurClass = getCardBlurClass(branding.cardBlur);

  // Step states: 'REQUEST' | 'RESET' | 'SUCCESS'
  const [step, setStep] = useState<'REQUEST' | 'RESET' | 'SUCCESS'>('REQUEST');

  // Request form state
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Reset form state
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading & Alert states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Request Reset Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Alamat email wajib diisi.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membuat kode reset.');
      }

      setUserName(data.name || '');
      setUserRole(data.role || '');
      setGeneratedCode(data.resetCode || '');
      setVerificationCode(data.resetCode || ''); // Auto-fill for convenience
      setStep('RESET');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!verificationCode.trim() || !newPassword || !confirmPassword) {
      setErrorMessage('Semua kolom wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mereset password.');
      }

      setSuccessMessage('Password berhasil diperbarui! Silakan kembali ke halaman login.');
      setStep('SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat memperbarui password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const getForgotBgClass = () => {
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

  const getForgotBgStyle = () => {
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
      className={`min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-all duration-300 ${getForgotBgClass()}`}
      style={getForgotBgStyle()}
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

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div
          className={`${cardBlurClass} bg-[var(--card-bg-mobile)] sm:bg-[var(--card-bg-desktop)] rounded-3xl shadow-2xl border shadow-black/40 p-6 sm:p-8 transition-all ${
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
          <div className={`text-center pb-5 mb-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200/70'}`}>
            <div className="flex items-center justify-center gap-3 mb-2">
              {branding.logoType === 'image' && branding.logoUrl ? (
                <div
                  className={`w-10 h-10 rounded-2xl bg-white border shadow-sm flex items-center justify-center p-1 overflow-hidden shrink-0 ${
                    isDark ? 'border-slate-700' : 'border-slate-200'
                  }`}
                >
                  <img src={branding.logoUrl} alt={branding.appName} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  suppressHydrationWarning
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/30 shrink-0 uppercase tracking-tight"
                >
                  {branding.logoText || 'M'}
                </div>
              )}
              <div className="text-left" suppressHydrationWarning>
                <h2
                  suppressHydrationWarning
                  className={`text-xl font-black tracking-tight leading-none truncate max-w-[240px] ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {branding.appName || 'MitracaMSA'}
                </h2>
                <p
                  suppressHydrationWarning
                  className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 truncate max-w-[240px] ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {branding.appSubtitle || 'Agency Management System'}
                </p>
              </div>
            </div>
          </div>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`p-2 rounded-xl ${isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <KeyRound className="w-5 h-5" />
              </span>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {step === 'REQUEST' && 'Lupa Password Akun'}
                {step === 'RESET' && 'Verifikasi & Password Baru'}
                {step === 'SUCCESS' && 'Password Berhasil Direset'}
              </h1>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {step === 'REQUEST' &&
                'Masukkan alamat email terdaftar Anda untuk membuat kode verifikasi keamanan.'}
              {step === 'RESET' &&
                `Masukkan kode verifikasi 6 digit yang diterbitkan untuk akun ${email}`}
              {step === 'SUCCESS' &&
                'Kata sandi Anda telah berhasil diatur ulang. Silakan masuk dengan kata sandi baru Anda.'}
            </p>
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Step 1: Input Email */}
          {step === 'REQUEST' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Alamat Email Terdaftar
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjutkan & Dapatkan Kode</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className={`pt-4 border-t flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <Link
                  href="/login"
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold transition ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Halaman Login
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: Verification Code & New Password */}
          {step === 'RESET' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Security Banner with Generated Code */}
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  isDark
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                    : 'bg-amber-50 border border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Kode Verifikasi Keamanan:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`text-[11px] flex items-center gap-1 font-semibold underline ${
                      isDark ? 'text-amber-300 hover:text-amber-100' : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" /> Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Salin Kode
                      </>
                    )}
                  </button>
                </div>
                <div
                  className={`text-xl font-extrabold tracking-widest px-3 py-1.5 rounded-lg border text-center font-mono ${
                    isDark
                      ? 'text-amber-200 bg-slate-900/80 border-amber-800/60'
                      : 'text-amber-950 bg-white/80 border-amber-200'
                  }`}
                >
                  {generatedCode}
                </div>
                <p className={`text-[10px] text-center ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  Berlaku selama 15 menit untuk akun: <strong>{email}</strong> ({userName} - {userRole})
                </p>
              </div>

              {/* Input Kode Verifikasi */}
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Kode Verifikasi (6 Digit)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Contoh: 123456"
                  className={`w-full text-center font-mono text-base tracking-widest rounded-xl px-4 py-2.5 font-bold transition focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-900/60 border border-slate-700 text-white focus:ring-blue-500/40 focus:border-blue-400'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Password Baru */}
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Password Baru (Min. 6 Karakter)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Masukkan kata sandi baru..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full text-sm rounded-xl px-4 py-2.5 pl-10 pr-10 transition font-medium focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500/40 focus:border-blue-400'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`absolute right-3.5 top-3 transition ${
                      isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Ulangi kata sandi baru..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full text-sm rounded-xl px-4 py-2.5 pl-10 pr-10 transition font-medium focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500/40 focus:border-blue-400'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3.5 top-3 transition ${
                      isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mereset Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reset Password Sekarang</span>
                  </>
                )}
              </button>

              <div className={`pt-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setStep('REQUEST');
                    setErrorMessage(null);
                  }}
                  className={`transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  ← Ganti Email Lain
                </button>
                <Link href="/login" className="text-blue-500 hover:underline">
                  Batal
                </Link>
              </div>
            </form>
          )}

          {/* Step 3: Success Screen */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Password Anda Berhasil Diperbarui!
                </h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Kredensial login Anda untuk akun <strong>{email}</strong> telah diperbarui secara aman.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition"
              >
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Bantuan Administrator Footer */}
          <div className={`mt-6 pt-4 border-t text-center ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <p className="text-[11px] text-slate-400">
              Butuh bantuan atau kendala login? Hubungi Super Administrator di{' '}
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>superadmin@mitraca.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
