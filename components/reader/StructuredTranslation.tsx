'use client';
import type {TranslationParagraphs,TranslationTarget} from '@/lib/content/schema';
export function StructuredTranslation({paragraphs,text,onReference}:{paragraphs?:TranslationParagraphs;text:string;onReference:(target:TranslationTarget)=>void}){
 if(!paragraphs)return <p className="translation">{text}</p>;
 return <div className="translation stack">{paragraphs.map((runs,i)=><p key={i}>{runs.map((run,j)=>{
  if(run.kind==='reference')return <button key={j} type="button" className="underline" onClick={()=>onReference(run.target)} aria-label={run.target.kind==='note'?`Open footnote ${run.text}`:`Preview ayah ${run.target.ref}`}>{run.text}</button>;
  const value=run.emphasis==='both'?<strong><em>{run.text}</em></strong>:run.emphasis==='bold'?<strong>{run.text}</strong>:run.emphasis==='italic'?<em>{run.text}</em>:run.text;
  return <span key={j}>{value}</span>;
 })}</p>)}</div>;
}
