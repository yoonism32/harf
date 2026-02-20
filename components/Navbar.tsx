'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/app',      label: 'Dashboard' },
  { href: '/study',    label: 'Study'     },
  { href: '/words',    label: 'Words'     },
  { href: '/coverage', label: 'Coverage'  },
  { href: '/names',    label: '99 Names'  },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border" style={{ background: 'var(--surface)' }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="font-amiri text-3xl text-gold leading-none"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            حرف
          </span>
          <span className="text-muted text-sm group-hover:text-harf-text transition-colors hidden sm:block">
            Harf
          </span>
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          {NAV_LINKS.map(link => {
            const active = link.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-gold/10 text-gold'
                    : 'text-muted hover:text-harf-text hover:bg-surface-plus'
                  }
                `}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
