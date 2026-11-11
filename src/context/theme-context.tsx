'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAppBranding } from './branding-context';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

export const THEME_STORAGE_KEY = 'mitraca_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { branding } = useAppBranding();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  const isLoginPage = pathname === '/login';

  // Sinkronisasi kelas 'dark' pada <html> root
  const applyThemeToDOM = useCallback((currentTheme: ThemeMode, onLogin: boolean) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // PENGECUALIAN MUTLAK: Halaman /login tidak boleh terpengaruh dark mode global
    if (onLogin) {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      return;
    }

    if (currentTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, []);

  // Inisialisasi awal tema dari localStorage atau fallback default branding
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored);
        applyThemeToDOM(stored, pathname === '/login');
      } else if (branding.defaultTheme) {
        setThemeState(branding.defaultTheme);
        applyThemeToDOM(branding.defaultTheme, pathname === '/login');
      }
    } catch {
      // localStorage may be disabled or restricted
    }
    setMounted(true);
  }, [branding.defaultTheme, pathname, applyThemeToDOM]);

  // Pantau perubahan rute (khusus keluar/masuk halaman login)
  useEffect(() => {
    if (!mounted) return;
    applyThemeToDOM(theme, pathname === '/login');
  }, [pathname, theme, mounted, applyThemeToDOM]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
    applyThemeToDOM(newTheme, pathname === '/login');
  }, [pathname, applyThemeToDOM]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
