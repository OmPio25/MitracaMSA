import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/navigation/app-shell';
import { BrandingProvider } from '@/context/branding-context';

export const metadata: Metadata = {
  title: 'MitracaMSA — Insurance Agency Management System',
  description: 'Enterprise Insurance Agency Management, Hierarchy Self-Healing & Production Reporting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        <BrandingProvider>
          <AppShell>
            {children}
          </AppShell>
        </BrandingProvider>
      </body>
    </html>
  );
}
