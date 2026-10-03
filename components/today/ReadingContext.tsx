'use client';
import Link from 'next/link';
import {useCallback} from 'react';
import {getAyah,getEntry} from '@/lib/content/client';
import {useResource} from '@/components/learning/useResource';
import {Skeleton} from '@/components/ui';

export function ContinueReading({reference}:{reference:string}){
 const load=useCallback(()=>getAyah(reference),[reference]),resource=useResource(load);
 return <section className="stack" aria-labelledby="continue-reading-title"><p className="eyebrow">Continue reading</p><h2 id="continue-reading-title">Ayah {reference}</h2>{!resource.data?resource.error?<p role="alert">{resource.error}</p>:<Skeleton height={150} label="Loading your last ayah"/>:<><p className="quran-text" dir="rtl" lang="ar">{resource.data.tokens.map(token=>token.arabic).join(' ')}</p><p>{resource.data.translation}</p></>}<Link href={`/read/${reference.replace(':','/')}`}>Open ayah {reference} →</Link></section>;
}

export function RevisitEntry({entryId,lastReference}:{entryId?:string;lastReference:string}){
 const load=useCallback(async()=>entryId?getEntry(entryId):null,[entryId]),resource=useResource(load);
 if(!entryId)return <section className="stack"><p className="eyebrow">In the Quran</p><h2>Begin with Al-Fatihah</h2><p>Read an ayah and select a word to explore its meaning.</p><Link href="/read/1/1">Read Al-Fatihah →</Link></section>;
 if(!resource.data)return <section className="stack"><p className="eyebrow">In the Quran</p><h2>Meet a recent word again</h2>{resource.error?<p role="alert">{resource.error}</p>:<Skeleton height={150} label="Loading a recent word"/>}</section>;
 const {entry,examples}=resource.data,example=examples.find(item=>item.ref!==lastReference)??examples[0]!;
 return <section className="stack"><p className="eyebrow">In the Quran</p><h2>Meet a recent word again</h2><p className="entry-arabic" dir="rtl" lang="ar">{entry.arabic}</p><p><strong>{entry.gloss}</strong>{entry.root?` · root ${entry.root}`:''}</p><p className="quran-text" dir="rtl" lang="ar">{example.tokens.map(token=>token.arabic).join(' ')}</p><p>{example.translation}</p><Link href={`/read/${example.ref.replace(':','/')}`}>Read ayah {example.ref} →</Link></section>;
}
