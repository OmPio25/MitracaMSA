'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NavigationProvider, useNavigation } from './navigation-context';
import { FloatingSidebar } from './floating-sidebar';
import { Menu } from 'lucide-react';

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isCollapsed, toggleMobile, setIsMobileOpen } = useNavigation();
  const isLoginPage = pathname === '/login';

  // Tutup menu mobile setiap kali rute berpindah
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col">
      {/* Floating Left Sidebar */}
      <FloatingSidebar />

      {/* Mobile Floating Menu Button (Hanya tampil di layar ponsel < md) */}
      <div className="md:hidden fixed top-3 left-3 z-30">
        <button
          onClick={toggleMobile}
          className="p-2 rounded-xl bg-white/90 backdrop-blur border border-slate-200 shadow-md text-slate-700 hover:text-slate-900 hover:bg-white active:scale-95 transition flex items-center gap-2"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Main Content Area dengan margin kiri dinamis sesuai status sidebar */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:pl-28' : 'md:pl-72'
        } pt-12 md:pt-0`}
      >
        {children}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <ShellInner>{children}</ShellInner>
    </NavigationProvider>
  );
}
