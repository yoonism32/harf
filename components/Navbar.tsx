'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AyahSearchInput } from '@/components/ayah/AyahSearchInput';

const LEFT_LINKS = [
  { href: '/app',      label: 'Dashboard' },
  { href: '/study',    label: 'Study'     },
  { href: '/words',    label: 'Words'     },
  { href: '/coverage', label: 'Coverage'  },
  { href: '/search',   label: 'Search'    },
  { href: '/drill',    label: 'Drill'     },
  { href: '/quiz',     label: 'Quiz'      },
];

const RIGHT_LINKS = [
  { href: '/names',    label: '99 Names'  },
  { href: '/settings', label: 'Settings'  },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
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

  const isActive = (href: string) =>
    href === '/app' ? pathname === '/app' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 glass">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span
            className="font-amiri text-3xl leading-none text-gold transition-opacity duration-200 group-hover:opacity-80"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            حرف
          </span>
          <span className="text-muted/70 text-sm group-hover:text-muted transition-colors hidden sm:block tracking-wider font-light">
            Harf
          </span>
        </Link>

        {/* Nav: left links | [Ayah search] | right links */}
        <nav aria-label="Main navigation" className="flex items-center gap-0.5">
          {LEFT_LINKS.map(link => (
            <NavLink key={link.href} {...link} active={isActive(link.href)} />
          ))}

          {/* Ayah search — expands in-place */}
          <AyahSearchInput />

          {RIGHT_LINKS.map(link => (
            <NavLink key={link.href} {...link} active={isActive(link.href)} />
          ))}
        </nav>
      </div>
    </header>
  );
}
