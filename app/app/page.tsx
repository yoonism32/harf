import { CoverageHero } from '@/components/dashboard/CoverageHero';
import { StudyQueue } from '@/components/dashboard/StudyQueue';
import { PrayerTimesWidget } from '@/components/dashboard/PrayerTimes';
import { DailyAyah } from '@/components/dashboard/DailyAyah';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
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
          <a
            key={link.href}
            href={link.href}
            className="card p-4 flex flex-col gap-2 hover:border-gold/50 transition-colors group"
          >
            <div className="text-2xl">{link.icon}</div>
            <div className="text-harf-text font-medium group-hover:text-gold transition-colors">
              {link.label}
            </div>
            <div className="text-muted text-xs">{link.sub}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
