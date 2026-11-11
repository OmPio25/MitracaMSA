import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { systemSettings, AppBrandingValue } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export const dynamic = 'force-dynamic';

const DEFAULT_BRANDING: AppBrandingValue = {
  appName: 'MitracaMSA',
  appSubtitle: 'Agency Management System',
  logoType: 'text',
  logoText: 'M',
  logoUrl: null,
  loginBgType: 'default',
  loginBgPreset: 'midnight',
  loginBgUrl: null,
  loginBgOverlay: 60,
  cardTheme: 'white',
  cardColor: '#ffffff',
  cardBlur: 'xl',
  cardMobileOpacity: 85,
  cardDesktopOpacity: 90,
  defaultTheme: 'light',
};

/**
 * GET /api/settings/app
 * Mengambil konfigurasi identitas aplikasi (Nama, Tagline, Logo, Background, dan Glassmorphism Card)
 * Dapat diakses secara publik / seluruh pengguna aktif
 */
export async function GET() {
  try {
    const records = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, 'app_branding'))
      .limit(1);

    if (records.length === 0 || !records[0].value) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_BRANDING,
      });
    }

    const value = records[0].value as AppBrandingValue;
    return NextResponse.json({
      success: true,
      data: {
        appName: value.appName || DEFAULT_BRANDING.appName,
        appSubtitle: value.appSubtitle !== undefined ? value.appSubtitle : DEFAULT_BRANDING.appSubtitle,
        logoType: value.logoType || DEFAULT_BRANDING.logoType,
        logoText: value.logoText || DEFAULT_BRANDING.logoText,
        logoUrl: value.logoUrl || null,
        loginBgType: value.loginBgType || DEFAULT_BRANDING.loginBgType,
        loginBgPreset: value.loginBgPreset || DEFAULT_BRANDING.loginBgPreset,
        loginBgUrl: value.loginBgUrl || null,
        loginBgOverlay: typeof value.loginBgOverlay === 'number' ? value.loginBgOverlay : DEFAULT_BRANDING.loginBgOverlay,
        cardTheme: value.cardTheme || DEFAULT_BRANDING.cardTheme,
        cardColor: value.cardColor || DEFAULT_BRANDING.cardColor,
        cardBlur: value.cardBlur || DEFAULT_BRANDING.cardBlur,
        cardMobileOpacity: typeof value.cardMobileOpacity === 'number' ? value.cardMobileOpacity : DEFAULT_BRANDING.cardMobileOpacity,
        cardDesktopOpacity: typeof value.cardDesktopOpacity === 'number' ? value.cardDesktopOpacity : DEFAULT_BRANDING.cardDesktopOpacity,
        defaultTheme: value.defaultTheme || DEFAULT_BRANDING.defaultTheme,
        updatedAt: value.updatedAt,
      },
    });
  } catch (err: any) {
    console.error('Error fetching app branding:', err);
    return NextResponse.json({
      success: true,
      data: DEFAULT_BRANDING,
    });
  }
}

/**
 * POST /api/settings/app
 * Memperbarui nama, logo, dan background aplikasi
 * KHUSUS role SUPERADMIN
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== 'SUPERADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak: Hanya peran SUPERADMIN yang memiliki wewenang mengubah nama, logo, dan background aplikasi.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      appName,
      appSubtitle,
      logoType,
      logoText,
      logoUrl,
      loginBgType,
      loginBgPreset,
      loginBgUrl,
      loginBgOverlay,
      cardTheme,
      cardColor,
      cardBlur,
      cardMobileOpacity,
      cardDesktopOpacity,
      defaultTheme,
    } = body;

    const cleanAppName = String(appName ?? '').trim();
    if (!cleanAppName) {
      return NextResponse.json(
        { success: false, error: 'Nama aplikasi tidak boleh kosong.' },
        { status: 400 }
      );
    }

    if (cleanAppName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Nama aplikasi maksimal 100 karakter.' },
        { status: 400 }
      );
    }

    const cleanSubtitle = String(appSubtitle ?? '').trim();
    if (cleanSubtitle.length > 150) {
      return NextResponse.json(
        { success: false, error: 'Sub-judul / Tagline aplikasi maksimal 150 karakter.' },
        { status: 400 }
      );
    }

    const cleanLogoType = logoType === 'image' ? 'image' : 'text';

    let cleanLogoText = String(logoText ?? '').trim();
    if (!cleanLogoText) {
      cleanLogoText = cleanAppName.charAt(0).toUpperCase();
    }
    if (cleanLogoText.length > 6) {
      cleanLogoText = cleanLogoText.slice(0, 6);
    }

    let cleanLogoUrl: string | null = null;
    if (cleanLogoType === 'image' && logoUrl) {
      const urlStr = String(logoUrl).trim();
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.startsWith('data:image/')) {
        if (urlStr.length > 3 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: 'Ukuran file gambar logo terlalu besar (maksimal 2MB).' },
            { status: 400 }
          );
        }
        cleanLogoUrl = urlStr;
      } else {
        return NextResponse.json(
          { success: false, error: 'Format logo gambar tidak valid. Gunakan URL https:// atau upload file gambar.' },
          { status: 400 }
        );
      }
    }

    // Process Background Settings
    const cleanBgType = ['default', 'preset', 'image'].includes(loginBgType) ? loginBgType : 'default';
    const cleanBgPreset = ['midnight', 'ocean', 'emerald', 'charcoal'].includes(loginBgPreset)
      ? loginBgPreset
      : 'midnight';
    const cleanBgOverlay =
      typeof loginBgOverlay === 'number' ? Math.max(10, Math.min(95, Math.round(loginBgOverlay))) : 60;

    let cleanBgUrl: string | null = null;
    if (cleanBgType === 'image' && loginBgUrl) {
      const bgUrlStr = String(loginBgUrl).trim();
      if (bgUrlStr.startsWith('http://') || bgUrlStr.startsWith('https://') || bgUrlStr.startsWith('data:image/')) {
        if (bgUrlStr.length > 4 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: 'Ukuran file gambar background terlalu besar (maksimal 3MB).' },
            { status: 400 }
          );
        }
        cleanBgUrl = bgUrlStr;
      } else {
        return NextResponse.json(
          { success: false, error: 'Format URL gambar background tidak valid.' },
          { status: 400 }
        );
      }
    }

    // Process Card Glassmorphism Settings
    const cleanCardTheme = ['white', 'dark', 'navy', 'emerald', 'custom'].includes(cardTheme)
      ? cardTheme
      : 'white';

    const THEME_HEX_MAP: Record<string, string> = {
      white: '#ffffff',
      dark: '#0f172a',
      navy: '#0c1938',
      emerald: '#062419',
    };

    let cleanCardColor = THEME_HEX_MAP[cleanCardTheme] || '#ffffff';
    if (cleanCardTheme === 'custom' && typeof cardColor === 'string') {
      const trimmedHex = cardColor.trim();
      if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmedHex)) {
        cleanCardColor = trimmedHex;
      }
    }

    const cleanCardBlur = ['none', 'sm', 'md', 'xl', '2xl'].includes(cardBlur) ? cardBlur : 'xl';
    const cleanCardMobileOpacity =
      typeof cardMobileOpacity === 'number' ? Math.max(30, Math.min(100, Math.round(cardMobileOpacity))) : 85;
    const cleanCardDesktopOpacity =
      typeof cardDesktopOpacity === 'number' ? Math.max(30, Math.min(100, Math.round(cardDesktopOpacity))) : 90;
    const cleanDefaultTheme: 'light' | 'dark' = defaultTheme === 'dark' ? 'dark' : 'light';

    const brandingPayload: AppBrandingValue = {
      appName: cleanAppName,
      appSubtitle: cleanSubtitle,
      logoType: cleanLogoType,
      logoText: cleanLogoText,
      logoUrl: cleanLogoUrl,
      loginBgType: cleanBgType,
      loginBgPreset: cleanBgPreset,
      loginBgUrl: cleanBgUrl,
      loginBgOverlay: cleanBgOverlay,
      cardTheme: cleanCardTheme as any,
      cardColor: cleanCardColor,
      cardBlur: cleanCardBlur as any,
      cardMobileOpacity: cleanCardMobileOpacity,
      cardDesktopOpacity: cleanCardDesktopOpacity,
      defaultTheme: cleanDefaultTheme,
      updatedAt: new Date().toISOString(),
    };

    await db
      .insert(systemSettings)
      .values({
        key: 'app_branding',
        value: brandingPayload,
        updatedBy: session.userId,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: brandingPayload,
          updatedBy: session.userId,
          updatedAt: sql`NOW()`,
        },
      });

    // Catat log pembaruan branding
    await logActivity({
      userId: session.userId,
      userName: session.name,
      userEmail: session.email,
      userRole: session.role,
      action: 'SETTINGS_BRANDING_UPDATED',
      category: 'SETTINGS',
      status: 'SUCCESS',
      description: `Pembaruan identitas aplikasi: Nama '${cleanAppName}', Tagline '${cleanSubtitle}'`,
      req,
      metadata: { appName: cleanAppName, logoType: cleanLogoType, loginBgType: cleanBgType },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan identitas, logo, dan background berhasil diperbarui!',
      data: brandingPayload,
    });
  } catch (err: any) {
    console.error('Error saving app branding:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menyimpan pengaturan identitas aplikasi.' },
      { status: 500 }
    );
  }
}
