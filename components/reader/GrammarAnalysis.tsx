'use client';
import {useCallback,useState} from 'react';
import {getAyah,getWordDetail} from '@/lib/content/client';
import {fromBuckwalter} from '@/lib/content/alignment';
import type {WordDetail} from '@/lib/content/morphology-schema';
import {ResourceMessage,useResource} from '@/components/learning/useResource';
const labels:Record<string,string>={PREFIX:'Prefix',STEM:'Stem',SUFFIX:'Suffix',N:'Noun',PN:'Proper noun',ADJ:'Adjective',V:'Verb',P:'Preposition',PRON:'Pronoun',DET:'Determiner',CONJ:'Conjunction',REL:'Relative pronoun',NEG:'Negative particle',ACC:'Accusative',GEN:'Genitive',NOM:'Nominative',M:'Masculine',F:'Feminine',S:'Singular',D:'Dual',PL:'Plural',PERF:'Perfect',IMPF:'Imperfect',IMPV:'Imperative',ACT:'Active',PASS:'Passive',PCPL:'Participle',VN:'Verbal noun',DEF:'Definite',INDEF:'Indefinite',IND:'Indicative',SUBJ:'Subjunctive',JUS:'Jussive',T:'Time adverb',LOC:'Location adverb',DEM:'Demonstrative',INTG:'Interrogative'};
function feature(value:string):string{
 if(value.startsWith('LEM:'))return `Lemma: ${fromBuckwalter(value.slice(4))}`;
 if(value.startsWith('ROOT:'))return `Root: ${fromBuckwalter(value.slice(5))}`;
 if(value.startsWith('POS:'))return `Part of speech: ${labels[value.slice(4)]??value.slice(4)}`;
 if(value.startsWith('MOOD:'))return `Mood: ${labels[value.slice(5)]??value.slice(5)}`;
 if(/^\([IVX]+\)$/.test(value))return `Form ${value.slice(1,-1)}`;
 const agreement=/^(?:PRON:)?([123])?([MF])?([SDP])$/.exec(value);
 if(agreement)return [agreement[1]?`${agreement[1]}${agreement[1]==='1'?'st':agreement[1]==='2'?'nd':'rd'} person`:null,agreement[2]?labels[agreement[2]]:null,agreement[3]==='P'?'Plural':labels[agreement[3]!]].filter(Boolean).join(' · ');
 return labels[value]??value;
}

export function GrammarSegments({detail}:{detail:WordDetail}){return <div className="stack">{detail.canonicalKeys.length>1&&<p className="muted">Shared analysis for {detail.canonicalKeys.length} displayed words.</p>}<p lang="ar" dir="rtl" className="arabic-text">{detail.sourceArabic}</p><ol>{detail.segments.map((segment,i)=><li key={i}><strong>{labels[segment.tag]??segment.tag}</strong> <span lang="ar" dir="rtl">{segment.arabic}</span><ul>{segment.features.map((v,j)=><li key={j}>{feature(v)}</li>)}</ul></li>)}</ol><p className="muted">A prefix comes before a word's stem; a suffix follows it. Case and mood labels describe grammatical form in this passage.</p></div>}
export function ContextGrammar({wordKey}:{wordKey:string}){const load=useCallback(()=>getWordDetail(wordKey),[wordKey]);const resource=useResource(load);const[open,setOpen]=useState(false);return <section className="stack"><h3>Grammar in this example</h3>{resource.data?<GrammarSegments detail={resource.data}/>:<ResourceMessage {...resource}/>}<details onToggle={e=>setOpen(e.currentTarget.open)}><summary>Grammar across this ayah</summary>{open&&<AyahGrammar reference={wordKey.split(':').slice(0,2).join(':')}/>}</details></section>}
function AyahGrammar({reference}:{reference:string}){const load=useCallback(async()=>{const ayah=await getAyah(reference);const details=await Promise.all(ayah.tokens.filter(t=>t.kind==='word').map(t=>getWordDetail(t.key)));return [...new Map(details.map(d=>[d.sourceKey,d])).values()];},[reference]);const resource=useResource(load);if(!resource.data)return <ResourceMessage {...resource}/>;return <div className="table-scroll"><table><caption>Word forms in {reference}</caption><thead><tr><th scope="col">Word or phrase</th><th scope="col">Analysis</th></tr></thead><tbody>{resource.data.map(detail=><tr key={detail.sourceKey}><th scope="row" lang="ar" dir="rtl">{detail.sourceArabic}</th><td><GrammarSegments detail={detail}/></td></tr>)}</tbody></table></div>}
