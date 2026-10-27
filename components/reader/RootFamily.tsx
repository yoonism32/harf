'use client';
import {ExploreLink as Link} from '@/components/shell/QuickReturn';
import {useCallback} from 'react';
import {z} from 'zod';
import {useVisitState} from '@/lib/data/use-visit-state';
import {getRootFamily} from '@/lib/content/client';
import {ResourceMessage,useResource} from '@/components/learning/useResource';
export function RootFamily({id}:{id:string}){
 const [open,setOpen]=useVisitState(`root:${id}:open`,false,z.boolean());
 return <section className="stack"><button className="button button-secondary" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Hide full root family':'Explore full root family'}</button>{open&&<Family key={id} id={id}/>}</section>;
}
function Family({id}:{id:string}){
 const load=useCallback(()=>getRootFamily(id),[id]),resource=useResource(load);const[page,setPage]=useVisitState(`root:${id}:page`,0,z.number().int().min(0).max(5000));
 if(!resource.data)return <ResourceMessage {...resource}/>;
 const family=resource.data,pages=Math.ceil(family.occurrences.length/20);
 return <div className="stack"><h3>Root family: <span lang="ar" dir="rtl">{family.root}</span></h3><p>{family.occurrences.length.toLocaleString()} word positions across the Quran, including words outside the course. Related words have different meanings and separate learning progress.</p><ol className="entry-list root-family" start={page*20+1}>{family.occurrences.slice(page*20,page*20+20).map(word=><li key={word.key}><Link className="list-row" href={`/read/${word.key.split(':').slice(0,2).join('/')}?word=${word.key.split(':')[2]}`}><span lang="ar" dir="rtl" className="entry-arabic">{word.arabic}</span><span>{word.gloss||'Inspect in context'}<small className="muted"> · {word.key}{!word.entryId?' · Outside course':''}</small></span></Link></li>)}</ol><nav className="row between" aria-label="Root family pages"><button className="button button-secondary" disabled={page===0} onClick={()=>setPage(page-1)}>Previous examples</button><span role="status">Page {page+1} of {pages}</span><button className="button button-secondary" disabled={page+1>=pages} onClick={()=>setPage(page+1)}>Next examples</button></nav>{family.notes.length>0&&<details><summary>Original QuranWBW notes and verb forms</summary><p>These notes describe their original examples. The verb forms illustrate this root family, not necessarily the word selected above.</p>{family.notes.map(note=><article key={note.legacyId} className="stack section"><h4>Original entry: {note.legacyId}</h4>{note.summary&&<p>{note.summary}</p>}{note.summaryKeys.length?<Link href={`/read/${note.summaryKeys[0]!.split(':').slice(0,2).join('/')}?word=${note.summaryKeys[0]!.split(':')[2]}`}>Read the original example ({note.summaryKeys.join(', ')})</Link>:<p className="muted">The original example location is not linked because its alignment could not be established.</p>}<dl>{Object.entries(note.verbForms).map(([label,value])=><div key={label}><dt>{label.replaceAll('_',' ')}</dt><dd className="arabic-text" lang="ar" dir="rtl">{value}</dd></div>)}</dl></article>)}</details>}</div>;
}
