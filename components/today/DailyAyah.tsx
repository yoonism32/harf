'use client';
import Link from 'next/link';
import { useCallback } from 'react';
import { getAyah } from '@/lib/content/client';
import type { Surah } from '@/lib/content/schema';
import { localDate } from '@/lib/learning/calendar';
import { verseAudioUrl } from '@/lib/audio';
import { AudioControl } from '@/components/reader/AudioControl';
import { useResource } from '@/components/learning/useResource';
import { Skeleton } from '@/components/ui';
import { dailyAyahReference } from './daily';

export function DailyAyah({surahs,reciter}:{surahs:Surah[];reciter:string}) {
  const reference=dailyAyahReference(localDate(new Date()),surahs);
  const load=useCallback(()=>getAyah(reference),[reference]);
  const resource=useResource(load);
  const ayah=resource.data;
  const surah=surahs.find(item=>item.number===Number(reference.split(':')[0]));
  return <section className="sheet stack" aria-labelledby="daily-ayah-title">
    <div><p className="eyebrow">From the Quran</p><h2 id="daily-ayah-title">Daily ayah</h2></div>
    {!ayah?resource.error?<div role="alert"><p>{resource.error}</p><button className="button button-secondary" onClick={resource.retry}>Try again</button></div>:<Skeleton height={220} label="Loading daily ayah"/>:<>
      <p className="quran-text" dir="rtl" lang="ar">{ayah.tokens.map(token=>token.arabic).join(' ')}</p>
      <p className="translation">{ayah.translation}</p>
      <p className="muted">{surah?.englishName??`Surah ${reference.split(':')[0]}`} · {reference}<br/>Translation: {ayah.translationSource==='qul-301-hilali-khan'?'Hilali–Khan, Quranic Universal Library resource 301':ayah.translationSource}</p>
      <div className="row">
        <AudioControl url={verseAudioUrl(...reference.split(':') as [string,string],reciter)} label="Listen to ayah"/>
        <Link className="button button-secondary" href={`/read/${reference.replace(':','/')}`}>Read in context</Link>
      </div>
    </>}
  </section>;
}
