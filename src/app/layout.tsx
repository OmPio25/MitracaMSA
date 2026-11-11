import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/navigation/app-shell';
import { BrandingProvider } from '@/context/branding-context';
import { ThemeProvider } from '@/context/theme-context';

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
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC (Flash of Unstyled Content) Inline Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (window.location.pathname !== '/login') {
                  var theme = localStorage.getItem('mitraca_theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <BrandingProvider>
          <ThemeProvider>
            <AppShell>
              {children}
            </AppShell>
          </ThemeProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
