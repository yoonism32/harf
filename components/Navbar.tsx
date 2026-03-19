'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AyahSearchInput } from '@/components/ayah/AyahSearchInput';

const LEFT_LINKS = [
  { href: '/app',      label: 'Dashboard' },
  { href: '/study',    label: 'Study'     },
  { href: '/words',    label: 'Words'     },
  { href: '/coverage', label: 'Coverage'  },
  { href: '/tadabbur', label: 'Tadabbur'  },
  { href: '/search',   label: 'Search'    },
  { href: '/drill',    label: 'Drill'     },
  { href: '/quiz',     label: 'Quiz'      },
];

const RIGHT_LINKS = [
  { href: '/names',    label: '99 Names'  },
  { href: '/settings', label: 'Settings'  },
];

const ALL_LINKS = [...LEFT_LINKS, ...RIGHT_LINKS];

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`
        relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap
        ${active
          ? 'text-gold'
          : 'text-muted hover:text-harf-text hover:bg-surface-plus/60'
        }
      `}
    >
      {label}
      {active && <span className="nav-active-dot" aria-hidden="true" />}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === '/app' ? pathname === '/app' : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 glass">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" aria-label="Harf — home" className="flex items-center gap-2 group shrink-0">
            <span
              lang="ar"
              className="font-amiri text-3xl leading-none text-gold transition-opacity duration-200 group-hover:opacity-80"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              حرف
            </span>
            <span className="text-muted/70 text-sm group-hover:text-muted transition-colors hidden sm:block tracking-wider font-light">
              Harf
            </span>
          </Link>

          {/* Desktop nav — hidden below md */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-0.5">
            {LEFT_LINKS.map(link => (
              <NavLink key={link.href} {...link} active={isActive(link.href)} />
            ))}
            <AyahSearchInput />
            {RIGHT_LINKS.map(link => (
              <NavLink key={link.href} {...link} active={isActive(link.href)} />
            ))}
          </nav>

          {/* Mobile: Ayah search + hamburger */}
          <div className="flex items-center gap-1 md:hidden">
            <AyahSearchInput />
            <button
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              className="p-2 rounded-lg text-muted hover:text-harf-text hover:bg-surface-plus/60 transition-colors"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <div
        id="mobile-nav"
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
        className={`
          fixed top-14 left-0 right-0 z-40 md:hidden glass border-b border-border
          transition-all duration-200 ease-out
          ${mobileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}
        `}
      >
        <nav className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-4 xs:grid-cols-5 gap-1">
          {ALL_LINKS.map(link => (
            <NavLink
              key={link.href}
              {...link}
              active={isActive(link.href)}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </div>

      {/* Backdrop — closes menu on outside tap */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-14 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
