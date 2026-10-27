'use client';
import {ExploreLink as Link} from '@/components/shell/QuickReturn';
import {useCallback} from 'react';
import {getAyah} from '@/lib/content/client';
import type {TranslationTarget} from '@/lib/content/schema';
import {useResource,ResourceMessage} from '@/components/learning/useResource';
import {Dialog} from '@/components/ui/Dialog';
import {StructuredTranslation} from './StructuredTranslation';
export function ReferencePreview({history,onNavigate,onBack,onClose}:{history:TranslationTarget[];onNavigate:(target:TranslationTarget)=>void;onBack:()=>void;onClose:()=>void}){
 const target=history[history.length-1];
 return <Dialog open={!!target} onClose={onClose} title={target?`${target.kind==='note'?'Footnotes for':'Ayah'} ${target.ref}`:'Reference preview'}>{target&&<>{history.length>1&&<button className="button button-secondary" onClick={onBack}>← Back in preview</button>}<PreviewContent key={`${target.kind}:${target.ref}:${target.noteId??''}`} target={target} onNavigate={onNavigate}/></>}</Dialog>;
}
function PreviewContent({target,onNavigate}:{target:TranslationTarget;onNavigate:(target:TranslationTarget)=>void}){
 const load=useCallback(()=>getAyah(target.ref),[target.ref]);const resource=useResource(load);
 if(!resource.data)return <ResourceMessage {...resource}/>;
 const ayah=resource.data;
 const notes=target.noteId?ayah.notes.filter(n=>n.id===target.noteId):ayah.notes;
 return <div className="stack">{target.kind==='ayah'?<><p className="quran-text" dir="rtl" lang="ar">{ayah.tokens.map(t=>t.arabic).join(' ')}</p><StructuredTranslation paragraphs={ayah.paragraphs} text={ayah.translation} onReference={onNavigate}/></>:notes.length?<ol className="stack">{notes.map((note,i)=><li key={note.id??i}><StructuredTranslation paragraphs={note.paragraphs} text={note.text} onReference={onNavigate}/></li>)}</ol>:<p>No footnote is available for this reference.</p>}<Link href={`/read/${target.ref.replace(':','/')}`}>Open full ayah {target.ref} →</Link></div>;
}
