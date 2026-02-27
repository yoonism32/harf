import Link from 'next/link';
import { CoverageHero } from '@/components/dashboard/CoverageHero';
import { StudyQueue } from '@/components/dashboard/StudyQueue';
import { PrayerTimesWidget } from '@/components/dashboard/PrayerTimes';
import { DailyAyah } from '@/components/dashboard/DailyAyah';
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

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <ErrorBoundary>
        <CoverageHero />
      </ErrorBoundary>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ErrorBoundary><StudyQueue /></ErrorBoundary>
        <ErrorBoundary><PrayerTimesWidget /></ErrorBoundary>
        <ErrorBoundary><DailyAyah /></ErrorBoundary>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/words',    label: 'Word Library',   sub: '300 roots',      icon: '📖' },
          { href: '/coverage', label: 'Quran Coverage', sub: '114 surahs',     icon: '🕌' },
          { href: '/names',    label: '99 Names',        sub: 'Asma Al-Husna', icon: '✨' },
          { href: '/study',    label: 'Study Now',       sub: 'SRS flashcards', icon: '🎯' },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="card p-4 flex flex-col gap-2 hover:border-gold/50 transition-colors group"
          >
            <span className="text-2xl" aria-hidden="true">{link.icon}</span>
            <div className="text-harf-text font-medium group-hover:text-gold transition-colors">
              {link.label}
            </div>
            <div className="text-muted text-xs">{link.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
