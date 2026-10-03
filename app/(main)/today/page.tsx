'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {useHarfStore} from '@/lib/data/store';
import {getCatalog} from '@/lib/content/client';
import {useResource,ResourceMessage} from '@/components/learning/useResource';
import {buildQueue} from '@/lib/learning/queue';
import {activity} from '@/lib/learning/metrics';
import {localDate} from '@/lib/learning/calendar';
import {startCourse} from '@/components/learning/start';
import {DailyAyah} from '@/components/today/DailyAyah';
import {PrayerTimes} from '@/components/today/PrayerTimes';
import {ContinueReading,RevisitEntry} from '@/components/today/ReadingContext';
import {Skeleton} from '@/components/ui';

export default function Today(){
 const store=useHarfStore(),catalog=useResource(getCatalog),router=useRouter();const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 if(!catalog.data)return <ResourceMessage {...catalog}/>;
 const catalogData=catalog.data,now=new Date(),today=localDate(now),entries=catalogData.entries.map(entry=>({id:entry.id,order:entry.courseOrder}));
 const queue=store.status==='ready'?buildQueue(store,'vocabulary',entries,now):[],validIds=new Set(entries.map(entry=>entry.id));
 const due=store.cards.filter(card=>card.collection==='vocabulary'&&validIds.has(card.entryId)&&!card.paused&&Date.parse(card.card.due)<=now.getTime()).length;
 const queuedReviews=queue.filter(item=>!item.isNew).length,queuedNew=queue.length-queuedReviews,stats=activity(store.reviews);
 const last=typeof store.meta.lastVerse==='string'?store.meta.lastVerse:'1:1';
 const reviews=store.reviews.filter(event=>!event.undone),todayReviews=reviews.filter(event=>event.localDate===today);
 const todayEntries=new Set(todayReviews.map(event=>event.after.entryId)),todayIntroduced=new Set(todayReviews.filter(event=>!event.before||event.before.card.reps===0).map(event=>event.after.entryId));
 const recentIds=[...new Set(reviews.filter(event=>event.after.collection==='vocabulary').sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).map(event=>event.after.entryId))].slice(0,5);
 const recent=recentIds.map(id=>catalogData.entries.find(entry=>entry.id===id)).filter((entry):entry is NonNullable<typeof entry>=>!!entry);
 const namesStarted=store.cards.some(card=>card.collection==='names'),namesDue=store.cards.filter(card=>card.collection==='names'&&!card.paused&&Date.parse(card.card.due)<=now.getTime()).length;
 async function begin(){setBusy(true);setError('');try{const session=store.activeSession??await startCourse();router.push(`/study?session=${encodeURIComponent(session.id)}`);}catch(cause){setError(cause instanceof Error?cause.message:'Could not begin. Try again.');}finally{setBusy(false);}}
 return <div className="stack">
  <header className="page-header"><p className="eyebrow">One small practice at a time</p><h1>Today</h1><p className="muted">{now.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})}</p></header>
  {store.status==='loading'?<Skeleton height={420} label="Opening your progress"/>:store.status==='unavailable'?<div role="alert"><h2>Progress storage is unavailable</h2><p>{store.error}</p><Link href="/settings">Backup and recovery</Link></div>:<><section className="sheet stack"><p className="eyebrow">Your next step</p><h2>{store.activeSession?'Pick up where you left off':queuedReviews?`${queuedReviews} ${queuedReviews===1?'word is':'words are'} in your next review`:queue.length?'Meet a few familiar words':'Make room for a little reading'}</h2><p>{store.activeSession?`${store.activeSession.queue.length-store.activeSession.cursor} cards remain in this saved session.`:`This session contains ${queuedReviews} reviews and ${queuedNew} new entries.${due>queuedReviews?` ${due-queuedReviews} more reviews remain in the backlog.`:''}`}</p>{store.activeSession||queue.length?<button className="button button-primary" disabled={busy} onClick={()=>void begin()}>{busy?'Preparing…':store.activeSession?'Resume session':queuedReviews?'Review now':'Learn new words'}</button>:<Link className="button button-primary" href={`/read/${last.replace(':','/')}`}>Continue reading</Link>}{error&&<p role="alert">{error}</p>}</section>
  <section className="today-summary" aria-labelledby="today-summary-title"><div><p className="eyebrow">Today so far</p><h2 id="today-summary-title">{todayEntries.size} practiced · {todayIntroduced.size} introduced</h2></div>{namesStarted&&<p>{namesDue?`${namesDue} ${namesDue===1?'Name is':'Names are'} ready to revisit. `:'Your Names collection is up to date. '}<Link href="/collections/names">Open the Names</Link></p>}</section>
  <div className="today-columns"><ContinueReading reference={last}/><RevisitEntry entryId={recent[0]?.id} lastReference={last}/></div>
  <div className="today-columns"><section className="stack"><p className="eyebrow">Your week</p><h2>{stats.studyDaysThisWeek} days of practice</h2><p>{stats.reviewedThisWeek} distinct entries reviewed since Monday.</p><ol className="week-strip" aria-label="Review actions during the last seven days">{stats.days.slice(-7).map(day=><li key={day.date}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short'})}</span><strong>{day.count}</strong></li>)}</ol><Link href="/progress">See your progress →</Link></section><section className="stack"><p className="eyebrow">Recently practiced</p><h2>Your last five words</h2>{recent.length?<ol className="recent-list">{recent.map(entry=><li key={entry.id}><Link href={`/learn/${entry.id}`}><span className="entry-arabic" dir="rtl" lang="ar">{entry.arabic}</span> {entry.gloss}</Link></li>)}</ol>:<p>Your practiced words will appear here after your first session.</p>}</section></div></>}
  <div className="today-columns"><DailyAyah surahs={catalogData.surahs} reciter={store.settings.reciter}/><PrayerTimes location={store.settings.prayerLocation}/></div>
  {new Set(store.reviews.filter(event=>!event.undone&&(!store.meta.lastExportAt||event.timestamp>String(store.meta.lastExportAt))).map(event=>event.localDate)).size>=7&&<div className="status-message">Keep a copy of your progress. <Link href="/settings">Export a backup</Link>.</div>}
  <footer className="muted">Guest progress stays in this browser. Account sync is available in Profile. <Link className="underline" href="/sources">About the content and your data</Link></footer>
 </div>;
}
