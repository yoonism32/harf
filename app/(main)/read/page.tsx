'use client';
import Link from 'next/link';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {QuranSearch} from '@/components/reader/QuranSearch';
import {useHarfStore} from '@/lib/data/store';
import {getCatalog} from '@/lib/content/client';
import {useResource,ResourceMessage} from '@/components/learning/useResource';
function Directory(){const store=useHarfStore(),catalog=useResource(getCatalog),params=useSearchParams();const bookmarks=params.get('view')==='bookmarks';return <div className="stack"><header className="page-header"><p className="eyebrow">Notice the words you know</p><h1>Read</h1><p>Select an ayah, then explore its words.</p></header><QuranSearch/><nav className="row" aria-label="Reader sections"><Link className="button button-secondary" aria-current={!bookmarks?'page':undefined} href="/read">Surahs</Link><Link className="button button-secondary" aria-current={bookmarks?'page':undefined} href="/read?view=bookmarks">Bookmarks ({store.bookmarks.length})</Link><Link className="button button-secondary" href="/insights">Quran insights</Link></nav>{bookmarks?<section><h2>Your bookmarks</h2>{store.bookmarks.length?<ul className="entry-list">{store.bookmarks.map(b=><li key={b.id}><Link className="list-row" href={`/read/${b.id.replace(':','/')}`}>Ayah {b.id} →</Link></li>)}</ul>:<p>No bookmarks yet. Save an ayah from the reader.</p>}</section>:!catalog.data?<ResourceMessage {...catalog}/>:<ol className="surah-grid">{catalog.data.surahs.map(s=><li key={s.number}><Link className="list-row" href={`/read/${s.number}/1`}><span><strong>{s.number}. {s.englishName}</strong><br/><small className="muted">{s.ayahCount} ayahs</small></span><span className="entry-arabic" lang="ar" dir="rtl">{s.arabicName}</span></Link></li>)}</ol>}</div>;}
export default function Read(){return <Suspense fallback={<p>Opening reader…</p>}><Directory/></Suspense>;}
