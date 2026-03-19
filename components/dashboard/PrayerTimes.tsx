'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchPrayerTimesByCity, getNextPrayer, type PrayerTimes } from '@/lib/aladhan-api';
import { getLocation } from '@/lib/storage';

/** Subtle dot color per prayer — replaces emoji with clean semantic color coding */
const PRAYER_COLOR: Record<string, string> = {
  Fajr:    'bg-indigo-400',
  Sunrise: 'bg-amber-400',
  Dhuhr:   'bg-yellow-400',
  Asr:     'bg-orange-400',
  Maghrib: 'bg-rose-400',
  Isha:    'bg-blue-400',
};

export function PrayerTimesWidget() {
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ city: string; country: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    const saved = getLocation();
    if (saved) {
      setLocation(saved);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrayerTimesByCity(location.city, location.country).then(data => {
      if (!cancelled) {
        if (data) {
          setTimes(data);
        } else {
          setTimes(null);
          setError('Could not load prayer times. Check your connection and retry.');
        }
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setTimes(null);
        setError('Could not load prayer times. Check your connection and retry.');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [location, reloads]);

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

      {!location && !loading && (
        <div className="text-center py-4 flex flex-col gap-3">
          <p className="text-muted text-sm">Set your location to see prayer times.</p>
          <Link
            href="/settings"
            className="text-gold text-sm hover:underline"
          >
            Go to Settings →
          </Link>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-surface-plus rounded animate-pulse" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col gap-2 text-sm">
          <span className="text-red-400">{error}</span>
          <button
            onClick={() => setReloads(r => r + 1)}
            className="self-start px-3 py-1.5 rounded-lg bg-surface-plus border border-border hover:border-gold/50 hover:text-gold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {times && (
        <>
          <ul aria-label="Prayer times today" className="flex flex-col gap-1 list-none p-0 m-0">
            {prayerList.map(prayer => {
              const isNext = nextPrayer?.name === prayer.name;
              return (
                <li
                  key={prayer.name}
                  className={`flex justify-between items-center px-3 py-2 rounded-lg transition-colors ${
                    isNext ? 'bg-gold/10 border border-gold/30' : 'hover:bg-surface-plus'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isNext ? 'bg-gold' : (PRAYER_COLOR[prayer.name] ?? 'bg-border')}`} aria-hidden="true" />
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
                </li>
              );
            })}
          </ul>
          <div className="text-right">
            <Link href="/settings" className="text-muted text-xs hover:text-gold transition-colors">
              {location?.city} · change
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
