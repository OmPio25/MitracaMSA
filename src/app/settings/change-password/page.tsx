'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowLeft,
  User,
  Building2,
  Settings,
  Users,
  Check,
  Sparkles,
} from 'lucide-react';
import { UserSessionPayload } from '@/lib/auth/session';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSessionPayload | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Submission & Alert states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setSession(data.user);
          } else {
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Failed to load user session', err);
      } finally {
        setLoadingSession(false);
      }
    }

    loadUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side quick checks
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Semua kolom password wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password baru minimal harus terdiri dari 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok dengan password baru.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('Password baru tidak boleh sama dengan password saat ini.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah password.');
      }

      setSuccessMessage('Password akun Anda berhasil diperbarui! Gunakan password baru ini untuk login berikutnya.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat memperbarui password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const role = session?.role;
  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0b0f19] py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/analytics" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Pengaturan</span>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">Ganti Password</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Ganti Password Akun
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola keamanan kredensial login akun Anda di sistem Mitraca MSA.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/analytics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Dashboard
            </Link>
          </div>
        </div>

        {/* Tab Submenu Pengaturan (Sesuai Role Pengguna) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm flex flex-wrap gap-1.5 items-center">
          {isSuperAdmin && (
            <Link
              href="/settings/app"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Identitas & Logo
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800/60">
                Superadmin
              </span>
            </Link>
          )}

          <Link
            href="/settings/change-password"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            Ganti Password
          </Link>

          {isSuperAdmin && (
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Kelola User Akses
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800/60">
                Superadmin
              </span>
            </Link>
          )}

          {(isSuperAdmin || isAdmin) && (
            <Link
              href="/admin/branches"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Master Cabang
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800/60">
                Admin
              </span>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Profil Singkat & Petunjuk Keamanan */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
                Informasi Akun Anda
              </h3>
              {loadingSession ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Memuat profil pengguna...
                </div>
              ) : session ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                      {session.name ? session.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {session.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {session.email}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Peran Akun:</span>
                      <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                        {session.role}
                      </span>
                    </div>

                    {(session.role === 'KACAB' || session.role === 'PIC_CABANG') && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Cabang:</span>
                        <span className="font-semibold text-slate-800">
                          {session.branchName || session.branchCode || '-'}
                        </span>
                      </div>
                    )}

                    {(session.role === 'AGENT' || session.role === 'OFFICER_AGENT') && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Kode Agen:</span>
                        <span className="font-semibold text-slate-800">
                          {session.agentCode || session.parentAgentCode || '-'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Tips Keamanan */}
            <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-2xl p-5 text-xs text-blue-900 dark:text-blue-300 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300 text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Tips Keamanan Password
              </div>
              <ul className="space-y-1.5 text-blue-800/90 dark:text-blue-300/80 list-disc list-inside">
                <li>Gunakan minimal <strong>6 karakter</strong> atau lebih.</li>
                <li>Kombinasikan huruf kapital, huruf kecil, angka, atau simbol.</li>
                <li>Hindari menggunakan nama pribadi, tanggal lahir, atau pola umum (seperti 123456).</li>
                <li>Jangan pernah membagikan password Anda kepada siapa pun.</li>
              </ul>
            </div>
          </div>

          {/* Kolom Kanan: Form Ganti Password */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Formulir Pembaruan Kata Sandi
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Masukkan password saat ini untuk verifikasi, kemudian tentukan password baru yang diinginkan.
                </p>
              </div>

              {/* Success Alert */}
              {successMessage && (
                <div className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Berhasil!</p>
                    <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Gagal Memperbarui Password</p>
                    <p className="mt-0.5 text-rose-700 dark:text-rose-400">{errorMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Password Saat Ini */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Password Saat Ini <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan kata sandi lama Anda..."
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      tabIndex={-1}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2" />

                {/* 2. Password Baru */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan kata sandi baru (min. 6 karakter)..."
                      required
                      minLength={6}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <div
                        className={`flex items-center gap-1 ${
                          newPassword.length >= 6 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        Minimal 6 karakter ({newPassword.length}/6)
                      </div>
                      {newPassword === currentPassword && currentPassword.length > 0 && (
                        <div className="text-rose-500 font-medium ml-2">
                          (Tidak boleh sama dengan password lama)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Konfirmasi Password Baru */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Konfirmasi Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru..."
                      required
                      minLength={6}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className="mt-1.5 text-[11px]">
                      {confirmPassword === newPassword ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Konfirmasi password cocok
                        </span>
                      ) : (
                        <span className="text-rose-500 dark:text-rose-400 font-medium">
                          Konfirmasi password belum cocok
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    Reset Form
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menyimpan Password...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        Simpan Password Baru
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
