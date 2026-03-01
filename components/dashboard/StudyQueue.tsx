'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllWordProgress, getStreak, getFutureReviews } from '@/lib/storage';
import wordsData from '@/data/words.json';

export function StudyQueue() {
  const [dueCount, setDueCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [forecast, setForecast] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const progress = getAllWordProgress();
    const today = new Date().toISOString().slice(0, 10);

    const due = Object.values(progress).filter(p => p.nextReview <= today).length;
    const allIds = (wordsData as Array<{ id: string }>).map(w => w.id);
    const newWords = allIds.filter(id => !progress[id]).length;

    setDueCount(due);
    setNewCount(Math.min(newWords, 10));
    setStreak(getStreak());
    setForecast(getFutureReviews(7));
  }, []);

  const total = dueCount + newCount;

  return (
    <div className="card p-6 flex flex-col gap-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold" />
          <h2 className="text-harf-text font-semibold">Study Queue</h2>
        </div>
        {mounted && streak > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-950/30 border border-orange-500/20">
            <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-orange-400">{streak} day streak</span>
          </div>
        )}
      </div>

      {!mounted ? (
        <div className="h-48 animate-pulse bg-surface-plus rounded-lg" />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {dueCount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted text-sm">Due for review</span>
                <span className="text-orange-400 font-semibold">{dueCount}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted text-sm">New words</span>
              <span className="text-blue-400 font-semibold">{newCount}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="text-harf-text text-sm font-medium">Total today</span>
              <span className="text-gold font-bold text-lg">{total}</span>
            </div>
          </div>

          <div className="mt-2">
            <h3 className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">7-Day Forecast</h3>
            <div className="flex justify-between items-end gap-1 h-12">
              {Object.entries(forecast).map(([date, count], i) => {
                const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'narrow' });
                const isToday = i === 0;
                const height = Math.min(100, Math.max(10, (count / 20) * 100)); // Normalize height

                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-500 ${isToday ? 'bg-gold' : 'bg-surface-plus group-hover:bg-gold/40'}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className={`text-[10px] font-medium ${isToday ? 'text-gold' : 'text-muted'}`}>
                      {dayName}
                    </span>
                    {count > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-bg border border-border px-1.5 py-0.5 rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-Above">
                        {count} cards
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/study"
            className={`
              w-full py-3 rounded-xl font-semibold text-center transition-all
              ${total > 0
                ? 'bg-gold text-bg animate-pulsing-gold hover:brightness-110 active:scale-95'
                : 'bg-surface-plus text-muted cursor-default'
              }
            `}
          >
            {total > 0 ? `Study Now — ${total} cards` : 'All caught up'}
          </Link>
        </>
      )}
    </div>
  );
}
