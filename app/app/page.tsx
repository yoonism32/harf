import Link from 'next/link';
import { CoverageHero } from '@/components/dashboard/CoverageHero';
import { StudyQueue } from '@/components/dashboard/StudyQueue';
import { PrayerTimesWidget } from '@/components/dashboard/PrayerTimes';
import { DailyAyah } from '@/components/dashboard/DailyAyah';
import { ContinueReading } from '@/components/dashboard/ContinueReading';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Quranic Arabic study dashboard — track coverage, review due words, and explore the 99 Names.',
  openGraph: {
    title: 'Dashboard — Harf',
    description: 'Your Quranic Arabic study dashboard. See your coverage and review due words.',
  },
};

const QUICK_LINKS = [
  {
    href: '/words',
    label: 'Word Library',
    sub: '300 roots',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    href: '/coverage',
    label: 'Quran Coverage',
    sub: '114 surahs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    href: '/names',
    label: '99 Names',
    sub: 'Asmā al-Ḥusnā',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  {
    href: '/tadabbur',
    label: 'Tadabbur',
    sub: 'Deep reflection · themes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <ErrorBoundary>
        <CoverageHero />
      </ErrorBoundary>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ErrorBoundary><StudyQueue /></ErrorBoundary>
        <ErrorBoundary><PrayerTimesWidget /></ErrorBoundary>
        <ErrorBoundary><DailyAyah /></ErrorBoundary>
      </div>

      {/* Resume actions — Study Now leads with deliberately unequal weight;
          the rest is a repeating list of equal destinations, so a uniform
          grid is the right call there, not here. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/study"
          className="card card-interactive sm:col-span-2 p-6 flex items-center gap-4 group relative overflow-hidden bg-gold/5 border-gold/20"
        >
          <span
            aria-hidden="true"
            className="absolute -right-6 -bottom-8 w-32 h-32 rounded-full bg-gold/10 blur-2xl"
          />
          <span className="relative text-gold shrink-0">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </span>
          <div className="relative flex flex-col gap-0.5">
            <div className="text-harf-text text-lg font-semibold group-hover:text-gold transition-colors duration-200">
              Study Now
            </div>
            <div className="text-muted text-sm">Review due words with SRS flashcards</div>
          </div>
          <svg
            aria-hidden="true"
            className="relative w-5 h-5 text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all duration-200 ml-auto shrink-0"
            fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
        <ErrorBoundary><ContinueReading /></ErrorBoundary>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className="card card-interactive p-4 flex flex-col gap-3 group animate-rise"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            <span className="text-muted group-hover:text-gold transition-colors duration-200">
              {link.icon}
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="text-harf-text text-sm font-medium group-hover:text-gold transition-colors duration-200">
                {link.label}
              </div>
              <div className="text-muted text-xs">{link.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
