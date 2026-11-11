'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Building2,
  KeyRound,
  Users,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Save,
  Eye,
  Type,
  Info,
  ShieldAlert,
  Sliders,
  Palette,
  Layers,
  Lock,
  Mail,
  ArrowRight,
  Smartphone,
  Monitor,
  Check,
} from 'lucide-react';
import { UserSessionPayload } from '@/lib/auth/session';
import { useAppBranding } from '@/context/branding-context';
import { hexToRgba, isColorDark, getCardBlurClass } from '@/lib/branding/glassmorphism';

const BG_PRESETS = [
  {
    id: 'midnight',
    name: 'Midnight Executive',
    class: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900',
    swatch: 'from-slate-950 via-indigo-950 to-slate-900',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean Blue',
    class: 'bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950',
    swatch: 'from-blue-950 via-slate-900 to-indigo-950',
  },
  {
    id: 'emerald',
    name: 'Emerald Night',
    class: 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950',
    swatch: 'from-emerald-950 via-slate-900 to-teal-950',
  },
  {
    id: 'charcoal',
    name: 'Charcoal Minimalist',
    class: 'bg-gradient-to-br from-neutral-950 via-stone-900 to-zinc-950',
    swatch: 'from-neutral-950 via-stone-900 to-zinc-950',
  },
] as const;

const CARD_THEMES = [
  { id: 'white', name: 'Putih Bersih (White Frosted)', color: '#ffffff', desc: 'Klasik, elegan, teks hitam tajam' },
  { id: 'dark', name: 'Gelap Obsidian (Dark Smoke)', color: '#0f172a', desc: 'Futuristik, mewah, teks putih bersinar' },
  { id: 'navy', name: 'Biru Korporat (Deep Navy)', color: '#0c1938', desc: 'Kesan perbankan & asuransi berwibawa' },
  { id: 'emerald', name: 'Emerald Night', color: '#062419', desc: 'Nuansa hijau syariah & pertumbuhan' },
  { id: 'custom', name: 'Kustom Warna Brand', color: '#1e293b', desc: 'Bebas pilih kode HEX / Color Picker' },
] as const;

const BLUR_OPTIONS = [
  { id: 'none', name: 'Tanpa Blur', desc: '0px' },
  { id: 'sm', name: 'Halus', desc: '4px' },
  { id: 'md', name: 'Sedang', desc: '12px' },
  { id: 'xl', name: 'Kuat (Default)', desc: '24px' },
  { id: '2xl', name: 'Maksimal', desc: '40px' },
] as const;

export default function AppBrandingSettingsPage() {
  const router = useRouter();
  const { branding, updateBranding, refreshBranding } = useAppBranding();

  const [session, setSession] = useState<UserSessionPayload | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Form states: 1. Identitas & Logo
  const [appName, setAppName] = useState('');
  const [appSubtitle, setAppSubtitle] = useState('');
  const [logoType, setLogoType] = useState<'text' | 'image'>('text');
  const [logoText, setLogoText] = useState('M');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [directImageUrl, setDirectImageUrl] = useState('');

  // Form states: 2. Background Halaman Login
  const [loginBgType, setLoginBgType] = useState<'default' | 'preset' | 'image'>('default');
  const [loginBgPreset, setLoginBgPreset] = useState<'midnight' | 'ocean' | 'emerald' | 'charcoal'>('midnight');
  const [loginBgUrl, setLoginBgUrl] = useState<string | null>(null);
  const [loginBgOverlay, setLoginBgOverlay] = useState(60);
  const [bgInputMode, setBgInputMode] = useState<'upload' | 'url'>('upload');
  const [directBgUrl, setDirectBgUrl] = useState('');

  // Form states: 3. Kustomisasi Kartu Glassmorphism (Warna, Blur, Transparansi)
  const [cardTheme, setCardTheme] = useState<'white' | 'dark' | 'navy' | 'emerald' | 'custom'>('white');
  const [cardColor, setCardColor] = useState('#ffffff');
  const [cardBlur, setCardBlur] = useState<'none' | 'sm' | 'md' | 'xl' | '2xl'>('xl');
  const [cardMobileOpacity, setCardMobileOpacity] = useState(85);
  const [cardDesktopOpacity, setCardDesktopOpacity] = useState(90);

  // Status & Notification states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load User Session and verify SUPERADMIN role
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

  // 2. Synchronize form when branding data is ready
  useEffect(() => {
    if (branding) {
      setAppName(branding.appName || 'MitracaMSA');
      setAppSubtitle(branding.appSubtitle || 'Agency Management System');
      setLogoType(branding.logoType || 'text');
      setLogoText(branding.logoText || 'M');
      setLogoUrl(branding.logoUrl || null);
      if (branding.logoUrl && !branding.logoUrl.startsWith('data:')) {
        setDirectImageUrl(branding.logoUrl);
      }

      setLoginBgType(branding.loginBgType || 'default');
      setLoginBgPreset(branding.loginBgPreset || 'midnight');
      setLoginBgUrl(branding.loginBgUrl || null);
      setLoginBgOverlay(typeof branding.loginBgOverlay === 'number' ? branding.loginBgOverlay : 60);
      if (branding.loginBgUrl && !branding.loginBgUrl.startsWith('data:')) {
        setDirectBgUrl(branding.loginBgUrl);
      }

      setCardTheme(branding.cardTheme || 'white');
      setCardColor(branding.cardColor || '#ffffff');
      setCardBlur(branding.cardBlur || 'xl');
      setCardMobileOpacity(typeof branding.cardMobileOpacity === 'number' ? branding.cardMobileOpacity : 85);
      setCardDesktopOpacity(typeof branding.cardDesktopOpacity === 'number' ? branding.cardDesktopOpacity : 90);
    }
  }, [branding]);

  // Handle Logo File Upload (Convert to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Ukuran file logo terlalu besar. Maksimal ukuran gambar adalah 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format file tidak didukung. Harap unggah gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoUrl(result);
      setLogoType('image');
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca file gambar logo.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Background File Upload (Convert to Base64)
  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      setErrorMessage('Ukuran file background terlalu besar. Maksimal ukuran gambar adalah 3.5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format file background tidak didukung. Harap unggah gambar (PNG, JPG, atau WebP).');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLoginBgUrl(result);
      setLoginBgType('image');
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca file gambar background.');
    };
    reader.readAsDataURL(file);
  };

  // Handle URL Image apply
  const handleApplyImageUrl = () => {
    const trimmed = directImageUrl.trim();
    if (!trimmed || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))) {
      setErrorMessage('Harap masukkan URL logo gambar yang diawali http:// atau https://');
      return;
    }
    setLogoUrl(trimmed);
    setLogoType('image');
    setErrorMessage(null);
  };

  // Handle URL Background apply
  const handleApplyBgUrl = () => {
    const trimmed = directBgUrl.trim();
    if (!trimmed || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))) {
      setErrorMessage('Harap masukkan URL background gambar yang diawali http:// atau https://');
      return;
    }
    setLoginBgUrl(trimmed);
    setLoginBgType('image');
    setErrorMessage(null);
  };

  // Remove Logo
  const handleRemoveImage = () => {
    setLogoUrl(null);
    setLogoType('text');
    setDirectImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove Background Image
  const handleRemoveBgImage = () => {
    setLoginBgUrl(null);
    setLoginBgType('default');
    setDirectBgUrl('');
    if (bgFileInputRef.current) bgFileInputRef.current.value = '';
  };

  // Switch Theme Preset
  const handleSelectCardTheme = (themeId: 'white' | 'dark' | 'navy' | 'emerald' | 'custom') => {
    setCardTheme(themeId);
    const preset = CARD_THEMES.find((t) => t.id === themeId);
    if (preset && themeId !== 'custom') {
      setCardColor(preset.color);
    }
  };

  // Handle Reset to Default
  const handleResetToDefault = () => {
    setAppName('MitracaMSA');
    setAppSubtitle('Agency Management System');
    setLogoType('text');
    setLogoText('M');
    setLogoUrl(null);
    setDirectImageUrl('');
    setLoginBgType('default');
    setLoginBgPreset('midnight');
    setLoginBgUrl(null);
    setLoginBgOverlay(60);
    setDirectBgUrl('');
    setCardTheme('white');
    setCardColor('#ffffff');
    setCardBlur('xl');
    setCardMobileOpacity(85);
    setCardDesktopOpacity(90);
    setIsResetConfirmOpen(false);
    setSuccessMessage('Konfigurasi dikembalikan ke standar awal. Klik "Simpan Perubahan" untuk menerapkan permanen.');
  };

  // Submit Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = appName.trim();
    if (!cleanName) {
      setErrorMessage('Nama aplikasi wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        appName: cleanName,
        appSubtitle: appSubtitle.trim(),
        logoType,
        logoText: logoText.trim() || cleanName.charAt(0).toUpperCase(),
        logoUrl: logoType === 'image' ? logoUrl : null,
        loginBgType,
        loginBgPreset,
        loginBgUrl: loginBgType === 'image' ? loginBgUrl : null,
        loginBgOverlay,
        cardTheme,
        cardColor,
        cardBlur,
        cardMobileOpacity,
        cardDesktopOpacity,
      };

      const res = await fetch('/api/settings/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan perubahan identitas aplikasi.');
      }

      updateBranding(payload);
      await refreshBranding();

      setSuccessMessage('Pengaturan identitas, logo, background, dan warna kartu berhasil disimpan!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan pengaturan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Memuat konfigurasi sistem...</span>
        </div>
      </div>
    );
  }

  // RBAC Access Guard: Only SUPERADMIN is allowed
  if (session && session.role !== 'SUPERADMIN') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-rose-100 p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Halaman pengaturan identitas dan logo aplikasi ini bersifat privat dan hanya dapat dikelola oleh peran <span className="font-bold text-purple-700">SUPERADMIN</span>.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/analytics"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Helper background style preview
  const getPreviewBgStyle = () => {
    if (loginBgType === 'image' && loginBgUrl) {
      return {
        backgroundImage: `url(${loginBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {};
  };

  const getPreviewBgClass = () => {
    if (loginBgType === 'preset') {
      const found = BG_PRESETS.find((p) => p.id === loginBgPreset);
      return found ? found.class : 'bg-slate-900';
    }
    if (loginBgType === 'image') {
      return 'bg-slate-950';
    }
    return 'bg-slate-900';
  };

  // Smart Contrast for Preview Card
  const isDarkPreviewCard = isColorDark(cardColor);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb & Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/analytics" className="hover:text-blue-600 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-medium">Pengaturan</span>
              <span>/</span>
              <span className="text-purple-600 font-semibold">Identitas, Logo, Background & Warna Kartu</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Pengaturan Identitas & Tampilan Layar
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Sesuaikan nama aplikasi, logo resmi, latar belakang, serta warna & efek kaca (*Glassmorphism*) kartu login.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Role: SUPERADMIN
            </span>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-semibold">
          <Link
            href="/settings/app"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 text-white shadow-sm font-bold"
          >
            <Sparkles className="w-4 h-4" />
            <span>Identitas & Tampilan</span>
          </Link>
          <Link
            href="/settings/change-password"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition"
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Ganti Password</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition"
          >
            <Users className="w-4 h-4 text-purple-600" />
            <span>Kelola User</span>
          </Link>
          <Link
            href="/admin/branches"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Master Cabang</span>
          </Link>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-sm block mb-0.5">Berhasil Diperbarui</span>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-sm block mb-0.5">Perhatian</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Main Content Grid: Form (Left 7 Cols) & Live Preview (Right 5 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Configuration Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-7 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* BAGIAN 1: Identitas Aplikasi */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Type className="w-4 h-4 text-purple-600" />
                    1. Identitas & Nama Aplikasi
                  </h2>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nama Aplikasi <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">{appName.length}/100</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Contoh: MitracaMSA atau Mega Agency Portal"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Sub-Judul / Tagline
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">{appSubtitle.length}/150</span>
                  </div>
                  <input
                    type="text"
                    maxLength={150}
                    value={appSubtitle}
                    onChange={(e) => setAppSubtitle(e.target.value)}
                    placeholder="Contoh: Agency Management System"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition font-medium"
                  />
                </div>
              </div>

              {/* BAGIAN 2: Format Logo */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    2. Format & File Logo
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLogoType('text')}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                      logoType === 'text'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                      {logoText || 'M'}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Inisial Teks</span>
                      <span className="text-[10px] text-slate-400 block">Gradien modern</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoType('image')}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                      logoType === 'image'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Gambar Logo</span>
                      <span className="text-[10px] text-slate-400 block">PNG / SVG / JPG</span>
                    </div>
                  </button>
                </div>

                {logoType === 'text' && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Huruf Inisial (1-4 Karakter)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={logoText}
                      onChange={(e) => setLogoText(e.target.value.toUpperCase())}
                      placeholder="M"
                      className="w-20 text-center font-bold tracking-wider text-sm bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 uppercase"
                    />
                  </div>
                )}

                {logoType === 'image' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sumber Logo</span>
                      <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px]">
                        <button
                          type="button"
                          onClick={() => setImageInputMode('upload')}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            imageInputMode === 'upload' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'
                          }`}
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputMode('url')}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            imageInputMode === 'url' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'
                          }`}
                        >
                          URL
                        </button>
                      </div>
                    </div>

                    {imageInputMode === 'upload' ? (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-2xl bg-white cursor-pointer transition text-center"
                        >
                          <Upload className="w-5 h-5 text-purple-600 mb-1" />
                          <span className="text-xs font-bold text-slate-800">Klik untuk upload file logo</span>
                          <span className="text-[10px] text-slate-400">PNG transparan, SVG, JPG (maks 2MB)</span>
                        </label>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={directImageUrl}
                          onChange={(e) => setDirectImageUrl(e.target.value)}
                          placeholder="https://perusahaan.co.id/logo.png"
                          className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleApplyImageUrl}
                          className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
                        >
                          Terapkan
                        </button>
                      </div>
                    )}

                    {logoUrl && (
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2">
                          <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                          <span className="text-xs font-bold text-slate-800">Logo Aktif</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* BAGIAN 3: Background Halaman Login */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    3. Latar Belakang Halaman Login
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginBgType('default')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      loginBgType === 'default'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs block">Default Klasik</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Dark Slate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginBgType('preset')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      loginBgType === 'preset'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs block">Preset Gradien</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">4 Tema Mewah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginBgType('image')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      loginBgType === 'image'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-xs block">Kustom Gambar</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Foto Gedung</span>
                  </button>
                </div>

                {loginBgType === 'preset' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Pilih Palet Gradien Latar Belakang
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {BG_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setLoginBgPreset(p.id as any)}
                          className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer text-left ${
                            loginBgPreset === p.id
                              ? 'border-purple-600 bg-white shadow-sm ring-2 ring-purple-500/20'
                              : 'border-slate-200 bg-white/70 hover:bg-white'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.swatch} border border-slate-700 shrink-0 shadow-sm`} />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">{p.name}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-mono">{p.id}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {loginBgType === 'image' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sumber Gambar</span>
                      <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px]">
                        <button
                          type="button"
                          onClick={() => setBgInputMode('upload')}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            bgInputMode === 'upload' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'
                          }`}
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setBgInputMode('url')}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            bgInputMode === 'url' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'
                          }`}
                        >
                          URL
                        </button>
                      </div>
                    </div>

                    {bgInputMode === 'upload' ? (
                      <div>
                        <input
                          ref={bgFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBgFileUpload}
                          className="hidden"
                          id="bg-upload"
                        />
                        <label
                          htmlFor="bg-upload"
                          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-2xl bg-white cursor-pointer transition text-center"
                        >
                          <Upload className="w-5 h-5 text-purple-600 mb-1" />
                          <span className="text-xs font-bold text-slate-800">Unggah foto latar belakang</span>
                          <span className="text-[10px] text-slate-400">JPG, PNG, atau WebP (maks 3.5MB)</span>
                        </label>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={directBgUrl}
                          onChange={(e) => setDirectBgUrl(e.target.value)}
                          placeholder="https://perusahaan.co.id/gedung.jpg"
                          className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleApplyBgUrl}
                          className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
                        >
                          Terapkan
                        </button>
                      </div>
                    )}

                    {loginBgUrl && (
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <img src={loginBgUrl} alt="Background" className="w-12 h-8 object-cover rounded-md border" />
                          <span className="text-xs font-bold text-slate-800">Foto Terpasang</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveBgImage}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200/70">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-purple-600" />
                          Intensitas Overlay Kegelapan Latar
                        </label>
                        <span className="text-xs font-extrabold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-mono">
                          {loginBgOverlay}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="90"
                        step="5"
                        value={loginBgOverlay}
                        onChange={(e) => setLoginBgOverlay(Number(e.target.value))}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BAGIAN 4: Kustomisasi Kartu Glassmorphism (Warna, Blur, Transparansi) */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-600" />
                    4. Warna & Efek Kaca Kartu Login (Glassmorphism)
                  </h2>
                  <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded-full">
                    Manual Setting
                  </span>
                </div>

                {/* 1. Pemilihan Tema & Warna Dasar Kartu */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Warna Dasar Kartu
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CARD_THEMES.map((theme) => {
                      const isSelected = cardTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => handleSelectCardTheme(theme.id as any)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/70 shadow-sm ring-1 ring-purple-600'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className="w-6 h-6 rounded-lg border shadow-xs shrink-0"
                            style={{ backgroundColor: theme.id === 'custom' ? cardColor : theme.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                              {theme.name}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">{theme.desc}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Jika Memilih Kustom Warna */}
                  {cardTheme === 'custom' && (
                    <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80 flex items-center gap-3 mt-2">
                      <label className="text-xs font-bold text-slate-700 shrink-0">Color Picker:</label>
                      <input
                        type="color"
                        value={cardColor}
                        onChange={(e) => setCardColor(e.target.value)}
                        className="w-9 h-8 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={cardColor}
                        onChange={(e) => setCardColor(e.target.value)}
                        placeholder="#ffffff"
                        className="w-28 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 uppercase"
                      />
                      <span className="text-[10px] text-slate-500">
                        {isColorDark(cardColor) ? '💡 Mode Teks Putih Terang Otomatis' : '💡 Mode Teks Hitam Tajam Otomatis'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Pilihan Tingkat Blur Kaca */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tingkat Blur Kaca (Backdrop Blur)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {BLUR_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCardBlur(opt.id as any)}
                        className={`py-2 px-1 rounded-xl border text-center transition cursor-pointer ${
                          cardBlur === opt.id
                            ? 'border-purple-600 bg-purple-600 text-white font-bold shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-[11px] block">{opt.name}</span>
                        <span className={`text-[9px] block ${cardBlur === opt.id ? 'text-purple-200' : 'text-slate-400'}`}>
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Slider Transparansi HP & Desktop */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5">
                  {/* Slider Layar HP */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                        Kepekatan Kartu Layar HP (<span className="font-mono text-[11px]">bg-color/xx</span>)
                      </label>
                      <span className="text-xs font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono">
                        {cardMobileOpacity}% Solid ({100 - cardMobileOpacity}% Transparan)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="100"
                      step="5"
                      value={cardMobileOpacity}
                      onChange={(e) => setCardMobileOpacity(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Slider Layar Desktop */}
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-purple-600" />
                        Kepekatan Kartu Layar Desktop (<span className="font-mono text-[11px]">sm:bg-color/xx</span>)
                      </label>
                      <span className="text-xs font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-mono">
                        {cardDesktopOpacity}% Solid ({100 - cardDesktopOpacity}% Transparan)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="100"
                      step="5"
                      value={cardDesktopOpacity}
                      onChange={(e) => setCardDesktopOpacity(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Simpan & Reset */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kembalikan ke Default</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Interactive Preview Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold block mb-0.5">Live Interactive Preview</span>
                Warna kartu, tingkat blur kaca, dan transparansi di bawah ini langsung merespons slider formulir secara *real-time*.
              </div>
            </div>

            {/* Preview: Layar Login Glassmorphism Unified Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-600" />
                  Pratinjau Layar Login
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {cardBlur.toUpperCase()} Blur · {cardDesktopOpacity}%
                </span>
              </div>

              {/* Box Preview Kontainer Latar Belakang */}
              <div
                className={`p-6 min-h-[500px] flex items-center justify-center relative overflow-hidden transition-all duration-300 ${getPreviewBgClass()}`}
                style={getPreviewBgStyle()}
              >
                {/* Overlay Kegelapan untuk Mode Gambar */}
                {loginBgType === 'image' && (
                  <div
                    className="absolute inset-0 bg-black transition-opacity"
                    style={{ opacity: loginBgOverlay / 100 }}
                  />
                )}

                {/* Lingkaran Gradien Blur untuk Mode Default */}
                {loginBgType === 'default' && (
                  <>
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-600/30 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-600/30 rounded-full blur-2xl pointer-events-none" />
                  </>
                )}

                {/* THE UNIFIED GLASSMORPHISM CARD DENGAN SMART CONTRAST */}
                <div
                  className={`relative z-10 w-full max-w-xs rounded-3xl p-5 shadow-2xl border transition-all duration-200 text-center space-y-4 ${getCardBlurClass(
                    cardBlur
                  )}`}
                  style={{
                    backgroundColor: hexToRgba(cardColor, cardDesktopOpacity),
                    borderColor: isDarkPreviewCard ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {/* Header: Logo + App Name + Tagline */}
                  <div className="flex flex-col items-center">
                    <div className="mb-2">
                      {logoType === 'image' && logoUrl ? (
                        <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow flex items-center justify-center p-1 overflow-hidden">
                          <img src={logoUrl} alt={appName} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/30 uppercase">
                          {logoText || 'M'}
                        </div>
                      )}
                    </div>
                    <h3
                      className={`text-base font-extrabold tracking-tight leading-tight truncate max-w-[220px] ${
                        isDarkPreviewCard ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {appName || 'MitracaMSA'}
                    </h3>
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wider truncate max-w-[220px] mt-0.5 ${
                        isDarkPreviewCard ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {appSubtitle || 'Agency Management System'}
                    </p>
                  </div>

                  {/* Dummy Mini Form Inputs dengan Smart Contrast */}
                  <div className="space-y-2 text-left">
                    <div>
                      <div
                        className={`text-[9px] font-bold uppercase mb-1 ${
                          isDarkPreviewCard ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        Email
                      </div>
                      <div
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs border ${
                          isDarkPreviewCard
                            ? 'bg-slate-900/60 border-slate-700 text-slate-300'
                            : 'bg-white/70 border-slate-200 text-slate-400'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span className="text-[11px]">nama@mitraca.com</span>
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-[9px] font-bold uppercase mb-1 ${
                          isDarkPreviewCard ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        Password
                      </div>
                      <div
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs border ${
                          isDarkPreviewCard
                            ? 'bg-slate-900/60 border-slate-700 text-slate-300'
                            : 'bg-white/70 border-slate-200 text-slate-400'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-[11px]">••••••••</span>
                      </div>
                    </div>
                  </div>

                  {/* Dummy Button */}
                  <div className="py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5">
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>

                  {/* Mini Accordion Indicator */}
                  <div
                    className={`pt-2 border-t flex items-center justify-between text-[10px] ${
                      isDarkPreviewCard ? 'border-slate-700 text-slate-300' : 'border-slate-200/70 text-slate-500'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-bold">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      1-Click Login
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] ${
                        isDarkPreviewCard ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      7 Akun Demo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview: Header Navigasi Atas (Light) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Pratinjau Header Bar (Light Mode)</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  {logoType === 'image' && logoUrl ? (
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 overflow-hidden">
                      <img src={logoUrl} alt={appName} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                      {logoText || 'M'}
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block truncate max-w-[160px] leading-tight">
                      {appName || 'Nama Aplikasi'}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold block truncate max-w-[160px]">
                      {appSubtitle || 'Agency Management'}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Portal Aktif
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Konfirmasi Reset Default */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-900">Kembalikan ke Default?</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Nama aplikasi, logo, background, dan warna kartu akan dikembalikan ke pengaturan bawaan awal.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Ya, Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
