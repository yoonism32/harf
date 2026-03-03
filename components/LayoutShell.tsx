'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import type { ReactNode } from 'react';

/**
 * Renders the app chrome (skip-link, navbar, main wrapper) for all routes
 * EXCEPT the landing page (/), which manages its own full-screen layout.
 */
export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/') {
    return <>{children}</>;
  }

  const isWide = pathname.startsWith('/drill');

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gold focus:text-bg focus:rounded-lg"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className={isWide ? 'w-full px-4 py-6' : 'max-w-5xl mx-auto px-4 py-6'}
      >
        {children}
      </main>
    </>
  );
}
