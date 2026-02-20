'use client';

import { useEffect, useState } from 'react';
import { fetchPrayerTimes, getBrowserLocation, getNextPrayer, MECCA, type PrayerTimes } from '@/lib/aladhan-api';

const PRAYER_ICONS: Record<string, string> = {
  Fajr:    '🌙',
  Sunrise: '🌅',
  Dhuhr:   '☀️',
  Asr:     '🌤️',
  Maghrib: '🌇',
  Isha:    '🌃',
};

export function PrayerTimesWidget() {
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const coords = await getBrowserLocation().catch(() => MECCA);
        const data = await fetchPrayerTimes(coords);
        if (!cancelled) setTimes(data);
      } catch {
        if (!cancelled) setError('Could not load prayer times');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const nextPrayer = times ? getNextPrayer(times) : null;
  const prayerList = times
    ? [
        { name: 'Fajr',    time: times.Fajr    },
        { name: 'Dhuhr',   time: times.Dhuhr   },
        { name: 'Asr',     time: times.Asr     },
        { name: 'Maghrib', time: times.Maghrib  },
        { name: 'Isha',    time: times.Isha    },
      ]
    : [];

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green" />
        <h2 className="text-harf-text font-semibold">Prayer Times</h2>
        {times && (
          <span className="text-muted text-xs ml-auto">{times.hijriDate}</span>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-surface-plus rounded animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-muted text-sm">{error}</div>
      )}

      {times && (
        <div className="flex flex-col gap-1">
          {prayerList.map(prayer => {
            const isNext = nextPrayer?.name === prayer.name;
            return (
              <div
                key={prayer.name}
                className={`flex justify-between items-center px-3 py-2 rounded-lg transition-colors ${
                  isNext ? 'bg-gold/10 border border-gold/30' : 'hover:bg-surface-plus'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{PRAYER_ICONS[prayer.name]}</span>
                  <span className={`text-sm ${isNext ? 'text-gold font-semibold' : 'text-muted'}`}>
                    {prayer.name}
                  </span>
                  {isNext && (
                    <span className="text-xs text-gold/70 bg-gold/10 px-1.5 py-0.5 rounded">Next</span>
                  )}
                </div>
                <span className={`font-mono text-sm ${isNext ? 'text-gold font-bold' : 'text-harf-text'}`}>
                  {prayer.time}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
