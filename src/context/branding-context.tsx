'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AppBranding {
  appName: string;
  appSubtitle: string;
  logoType: 'text' | 'image';
  logoText: string;
  logoUrl?: string | null;
  loginBgType?: 'default' | 'preset' | 'image';
  loginBgPreset?: 'midnight' | 'ocean' | 'emerald' | 'charcoal';
  loginBgUrl?: string | null;
  loginBgOverlay?: number;
  cardTheme?: 'white' | 'dark' | 'navy' | 'emerald' | 'custom';
  cardColor?: string;
  cardBlur?: 'none' | 'sm' | 'md' | 'xl' | '2xl';
  cardMobileOpacity?: number;
  cardDesktopOpacity?: number;
  updatedAt?: string;
}

const DEFAULT_BRANDING: AppBranding = {
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
};

interface BrandingContextType {
  branding: AppBranding;
  isLoading: boolean;
  updateBranding: (newBranding: Partial<AppBranding>) => void;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  isLoading: false,
  updateBranding: () => {},
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  // Always start with DEFAULT_BRANDING on initial render to prevent SSR Hydration mismatch
  const [branding, setBranding] = useState<AppBranding>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/app', { cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setBranding(result.data);
          try {
            localStorage.setItem('mitraca_app_branding', JSON.stringify(result.data));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to fetch branding settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hydration-safe initial sync from localStorage, followed by server fetch
  useEffect(() => {
    try {
      const cached = localStorage.getItem('mitraca_app_branding');
      if (cached) {
        setBranding(JSON.parse(cached));
      }
    } catch {}

    fetchBranding();
  }, [fetchBranding]);

  // Synchronize document.title
  useEffect(() => {
    if (typeof document !== 'undefined' && branding.appName) {
      const titleSuffix = branding.appSubtitle ? ` — ${branding.appSubtitle}` : '';
      document.title = `${branding.appName}${titleSuffix}`;
    }
  }, [branding.appName, branding.appSubtitle]);

  const updateBranding = useCallback((newBranding: Partial<AppBranding>) => {
    setBranding((prev) => {
      const updated = { ...prev, ...newBranding };
      try {
        localStorage.setItem('mitraca_app_branding', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        isLoading,
        updateBranding,
        refreshBranding: fetchBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useAppBranding() {
  return useContext(BrandingContext);
}
