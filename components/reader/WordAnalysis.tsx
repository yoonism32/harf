'use client';
import {useCallback,useEffect} from 'react';
import {getWordDetail} from '@/lib/content/client';
import {fromBuckwalter} from '@/lib/content/alignment';
import {recordedWordAudioUrl,stopAudio} from '@/lib/audio';
import {ResourceMessage,useResource} from '@/components/learning/useResource';
import {AudioControl} from './AudioControl';
import {RootFamily} from './RootFamily';
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
export function WordAnalysis({wordKey}:{wordKey:string}){
 const load=useCallback(()=>getWordDetail(wordKey),[wordKey]),resource=useResource(load);
 useEffect(()=>()=>stopAudio(),[wordKey]);
 if(!resource.data)return <ResourceMessage {...resource}/>;
 const detail=resource.data,shared=detail.canonicalKeys.length>1;
 const [surah,ayah,word]=detail.sourceKey.split(':');
 return <div className="stack">{shared&&<p className="status-message">Meaning and analysis cover the phrase <span lang="ar" dir="rtl">{detail.sourceArabic}</span> together. The reader displays it as {detail.canonicalKeys.length} words.</p>}{detail.audioPath?<AudioControl url={recordedWordAudioUrl(detail.audioPath)} label={shared?'Listen to phrase':'Listen to word'}/>:<p className="muted">No individual recording is listed for this word. Use the ayah recording above.</p>}<details><summary>Grammar and word parts</summary><p>Quranic Arabic Corpus analysis of <span lang="ar" dir="rtl">{detail.sourceArabic}</span>.</p><ol className="stack">{detail.segments.map((segment,i)=><li key={i}><p><strong>{labels[segment.features[0]!]??segment.features[0]} · {labels[segment.tag]??segment.tag}</strong></p><p className="arabic-text" lang="ar" dir="rtl">{segment.arabic}</p><ul>{segment.features.slice(1).map((value,j)=><li key={j}>{feature(value)}</li>)}</ul></li>)}</ol><a href={`https://corpus.quran.com/wordmorphology.jsp?location=(${surah}:${ayah}:${word})`} target="_blank" rel="noopener noreferrer">View the original Corpus analysis ↗</a></details>{detail.rootId&&<RootFamily id={detail.rootId}/>}</div>;
}
