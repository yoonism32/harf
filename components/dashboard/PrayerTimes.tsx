'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchPrayerTimesByCity, getNextPrayer, type PrayerTimes } from '@/lib/aladhan-api';

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
  const [location, setLocation] = useState<{ city: string; country: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('harf-location');
    if (saved) {
      try {
        setLocation(JSON.parse(saved));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoading(true);
    fetchPrayerTimesByCity(location.city, location.country).then(data => {
      if (!cancelled) {
        setTimes(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [location]);

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

      {times && (
        <>
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
