'use client';

import { useEffect, useState } from 'react';
import { fetchAyah, getDailyAyahRef } from '@/lib/quran-api';
import { getDailyAyahCache, setDailyAyahCache } from '@/lib/storage';
import { AudioButton } from '@/components/study/AudioButton';

export function DailyAyah() {
  const [arabic, setArabic] = useState('');
  const [english, setEnglish] = useState('');
  const [ref, setRef] = useState('');
  const [surahName, setSurahName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Check cache first
      const cached = getDailyAyahCache();
      if (cached) {
        if (!cancelled) {
          setArabic(cached.arabic);
          setEnglish(cached.english);
          setRef(`${cached.surah}:${cached.ayah}`);
          setSurahName(cached.surahName);
          setLoading(false);
        }
        return;
      }

      const dayRef = getDailyAyahRef();
      const data = await fetchAyah(dayRef);

      if (!cancelled) {
        if (data) {
          setArabic(data.arabic);
          setEnglish(data.english);
          setRef(data.reference);
          setSurahName(data.surahName);

          setDailyAyahCache({
            date: new Date().toISOString().slice(0, 10),
            surah: data.surahNumber,
            ayah: data.ayahNumber,
            arabic: data.arabic,
            english: data.english,
            surahName: data.surahName,
          });
        }
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card p-6 flex flex-col gap-4 col-span-full md:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold" />
          <h2 className="text-harf-text font-semibold" lang="ar">آية اليوم</h2>
          <span className="text-muted text-sm">Daily Ayah</span>
        </div>
        {!loading && arabic && <AudioButton text={arabic} />}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-12 bg-surface-plus rounded animate-pulse" />
          <div className="h-4 bg-surface-plus rounded w-3/4 animate-pulse" />
        </div>
      ) : arabic ? (
        <>
          <div
            className="font-amiri text-3xl text-harf-text leading-loose text-right animate-fade-in"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            {arabic}
          </div>
          <div className="text-muted text-sm italic leading-relaxed">
            "{english}"
          </div>
          <div className="text-muted text-xs">
            Surah {surahName} • {ref}
          </div>
        </>
      ) : (
        <div className="text-muted text-sm">Could not load verse. Check your connection.</div>
      )}
    </div>
  );
}
