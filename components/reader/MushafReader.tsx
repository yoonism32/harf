'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {CONTENT_VERSION,getMushafIndex,getMushafPage,getSurah} from '@/lib/content/client';
import {getAudioState,getServerAudioState,subscribeAudio} from '@/lib/audio';
import {useResource,ResourceMessage} from '@/components/learning/useResource';
import {Dialog} from '@/components/ui/Dialog';
import {WordAnalysis} from './WordAnalysis';
import {StructuredTranslation} from './StructuredTranslation';
import {ReferencePreview} from './ReferencePreview';
import {setLastVerse} from '@/lib/learning/commands';
import {useHarfStore} from '@/lib/data/store';
import surahs from '@/data/quran-surah-meta.json';
import type {Token,TranslationTarget} from '@/lib/content/schema';

export function MushafReader({reference,onTopReference}:{reference:string;onTopReference:(ref:string|null)=>void}){
 const index=useResource(getMushafIndex),params=useSearchParams(),router=useRouter();
 const [navigationError,setNavigationError]=useState('');
 const audio=useSyncExternalStore(subscribeAudio,getAudioState,getServerAudioState);
 const explicit=Number(params.get('page'));
 const page=Number.isInteger(explicit)&&explicit>=1&&explicit<=604?explicit:index.data?.[reference];
 const navigate=useCallback((n:number)=>{const next=new URLSearchParams(params);next.set('mode','reading');next.set('page',String(n));next.delete('word');router.replace(`/read/${reference.replace(':','/')}?${next}`,{scroll:false});},[params,reference,router]);
 async function browse(n:number){
  setNavigationError('');
  try{const layout=await getMushafPage(n);const ref=layout.lines.flatMap(l=>l.words)[0]!.key.split(':').slice(0,2).join('/');router.replace(`/read/${ref}?mode=reading&page=${n}`,{scroll:false});}
  catch{setNavigationError('Page could not load. Please try again.');}
 }
 const playing=audio.status==='playing'||audio.status==='loading'?audio.url?.match(/\/(\d{3})(\d{3})\.mp3$/):null;
 const playingRef=playing?`${Number(playing[1])}:${Number(playing[2])}`:null;
 const followed=useRef<string|null>(null);
 // Follow each new ayah, but allow manual page browsing during the same recording.
 useEffect(()=>{if(playingRef&&index.data?.[playingRef]&&followed.current!==playingRef){followed.current=playingRef;navigate(index.data[playingRef]);}},[playingRef,index.data,navigate]);
 if(!index.data)return <ResourceMessage {...index}/>;
 if(!page)return <p role="alert">No Mushaf page found for this ayah.</p>;
 return <div className="stack mushaf-shell"><nav className="mushaf-nav" aria-label="Mushaf page navigation"><div className="mushaf-nav-controls"><button type="button" className="icon-button" aria-label="Previous page" disabled={page===1} onClick={()=>void browse(page-1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><select aria-label="Mushaf page" value={page} onChange={e=>void browse(Number(e.target.value))}>{Array.from({length:604},(_,i)=><option key={i+1} value={i+1}>{i+1} / 604</option>)}</select><button type="button" className="icon-button" aria-label="Next page" disabled={page===604} onClick={()=>void browse(page+1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div></nav>{navigationError&&<p role="alert">{navigationError}</p>}<MushafPage key={page} page={page} playingRef={playingRef} onTopReference={onTopReference}/></div>;
}

function MushafPage({page,playingRef,onTopReference}:{page:number;playingRef:string|null;onTopReference:(ref:string|null)=>void}){
 const [translationRef,setTranslationRef]=useState(''),[preview,setPreview]=useState<TranslationTarget[]>([]);
 const [selected,setSelected]=useState<Token|null>(null),[wide,setWide]=useState(false),store=useHarfStore();
 useEffect(()=>{const media=matchMedia('(min-width:1200px)');const update=()=>setWide(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 const load=useCallback(async()=>{
  const layout=await getMushafPage(page);
  const chapters=[...new Set(layout.lines.flatMap(l=>l.words.map(w=>Number(w.key.split(':')[0]))))];
  const ayahs=(await Promise.all(chapters.map(getSurah))).flat();
  const tokens=new Map(ayahs.flatMap(a=>a.tokens).map(t=>[t.key,t]));
  for(const line of layout.lines)for(const word of line.words)if(!tokens.has(word.key))throw Error('Mushaf word data is incomplete. Please reload.');
  return {layout,tokens,ayahs};
 },[page]);
 const resource=useResource(load);
 const [fontReady,setFontReady]=useState(false),[fontError,setFontError]=useState(''),[fontAttempt,setFontAttempt]=useState(0);
 useEffect(()=>{
  let active=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
  const font=new FontFace(`MushafV2-${page}`,`url(/content/${CONTENT_VERSION}/mushaf/fonts/p${page}.woff)`);
  setFontReady(false);setFontError('');
  // Fetch with a deadline so an unavailable font never leaves unreadable glyphs on screen.
  void fetch(`/content/${CONTENT_VERSION}/mushaf/fonts/p${page}.woff`,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw Error('Page font could not load.');
   const loaded=new FontFace(font.family,await response.arrayBuffer());await loaded.load();
   if(active){document.fonts.add(loaded);setFontReady(true);}
   return loaded;
  }).then(loaded=>{if(!active)document.fonts.delete(loaded);else loadedFont=loaded;}).catch(()=>{if(active)setFontError('Page font could not load. Try again.');}).finally(()=>clearTimeout(timeout));
  let loadedFont:FontFace|undefined;
  return()=>{active=false;controller.abort();clearTimeout(timeout);if(loadedFont)document.fonts.delete(loadedFont);};
 },[page,fontAttempt]);
 useEffect(()=>{onTopReference(null);return()=>onTopReference(null);},[onTopReference]);
 const first=resource.data?.layout.lines.flatMap(l=>l.words)[0]?.key.split(':').slice(0,2).join(':');
 useEffect(()=>{if(first)onTopReference(first);},[first,onTopReference]);
 useEffect(()=>{if(!first||!fontReady||store.status!=='ready')return;const timer=setTimeout(()=>{if(document.visibilityState==='visible')void setLastVerse(first).catch(()=>{});},2000);return()=>clearTimeout(timer);},[first,fontReady,store.status]);
 if(!resource.data)return <ResourceMessage {...resource}/>;
 if(fontError)return <ResourceMessage error={fontError} retry={()=>setFontAttempt(n=>n+1)}/>;
 if(!fontReady)return <p role="status">Loading page font…</p>;
 const {layout,tokens,ayahs}=resource.data;
 const references=[...new Set(layout.lines.flatMap(l=>l.words.map(w=>w.key.split(':').slice(0,2).join(':'))))];
 const translationAyah=ayahs.find(a=>a.ref===translationRef);
 const translation=<div className="stack"><h2>Ayah translation</h2>{translationAyah?<><label className="field">Translation ayah<select value={translationRef} onChange={e=>setTranslationRef(e.target.value)}>{references.map(ref=><option key={ref} value={ref}>Ayah {ref}</option>)}</select></label><StructuredTranslation paragraphs={translationAyah.paragraphs} text={translationAyah.translation} onReference={target=>setPreview(h=>[...h,target])}/><Link href={'/read/'+translationRef.replace(':','/')}>Open ayah {translationRef} →</Link></>:<p>Select a word to read the translation of its ayah.</p>}</div>;
 const panel=selected&&<div className="stack"><p className="study-word arabic-text" dir="rtl" lang="ar">{selected.arabic}</p><h3>{selected.gloss||'No word gloss available'}</h3><p>{selected.transliteration}</p><WordAnalysis key={selected.key} wordKey={selected.key}/>{selected.entryId&&<Link href={`/learn/${selected.entryId}`}>Explore vocabulary entry →</Link>}<Link href={`/read/${selected.key.split(':').slice(0,2).join('/')}`}>Open this ayah →</Link></div>;
 return <div className="reader-layout mushaf-layout">{wide&&<aside className="word-panel sheet stack translation-panel" aria-label="Ayah translation">{translation}</aside>}<article className="mushaf-page" aria-label={`Mushaf page ${page}`}><div className="mushaf-lines" dir="rtl" lang="ar" style={{fontFamily:`MushafV2-${page}`}}>{layout.lines.map(line=>line.type==='surah_name'?<h2 key={line.number} className="mushaf-heading arabic-text">سورة {surahs[(line.surah??1)-1]!.arabic}</h2>:line.type==='basmallah'?<p key={line.number} className="mushaf-heading arabic-text">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>:<div key={line.number} className={`mushaf-line ${line.centered?'mushaf-centered':''}`}>{line.words.map(word=>{const token=tokens.get(word.key)!;const ref=word.key.split(':').slice(0,2).join(':');return token.kind==='end-marker'?<Link key={word.key} className="mushaf-word" href={`/read/${ref.replace(':','/')}`} aria-label={`Open ayah ${ref}`}>{word.glyph}</Link>:<button type="button" key={word.key} className={`mushaf-word ${playingRef===ref?'mushaf-playing':''}`} aria-label={`${token.arabic}, ${token.gloss}, ${word.key}`} aria-pressed={selected?.key===word.key} onClick={()=>{setSelected(token);setTranslationRef(ref);}}>{word.glyph}</button>;})}</div>)}</div><p className="muted mushaf-caption">Page {page} · Madinah V2 · Tap a word to explore</p></article><Dialog open={!wide&&!!selected} onClose={()=>setSelected(null)} title="Word meaning"><div className="stack">{panel}{translation}</div></Dialog>{wide&&<aside className="word-panel sheet stack" aria-label="Selected word">{selected?<><div className="row between"><h2>Word meaning</h2><button type="button" className="button button-secondary" onClick={()=>setSelected(null)}>Close</button></div>{panel}</>:<><h2>Explore a word</h2><p>Select an Arabic word to see its meaning and analysis.</p></>}</aside>}<ReferencePreview history={preview} onNavigate={target=>setPreview(h=>[...h,target])} onBack={()=>setPreview(h=>h.slice(0,-1))} onClose={()=>setPreview([])}/></div>;
}
