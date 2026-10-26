'use client';
import {useCallback,useEffect} from 'react';
import {getWordDetail} from '@/lib/content/client';
import {GrammarSegments} from './GrammarAnalysis';
import {recordedWordAudioUrl,stopAudio} from '@/lib/audio';
import {ResourceMessage,useResource} from '@/components/learning/useResource';
import {AudioControl} from './AudioControl';
import {RootFamily} from './RootFamily';
export function WordAnalysis({wordKey}:{wordKey:string}){
 const load=useCallback(()=>getWordDetail(wordKey),[wordKey]),resource=useResource(load);
 useEffect(()=>()=>stopAudio(),[wordKey]);
 if(!resource.data)return <ResourceMessage {...resource}/>;
 const detail=resource.data,shared=detail.canonicalKeys.length>1;
 const [surah,ayah,word]=detail.sourceKey.split(':');
 return <div className="stack">{shared&&<p className="status-message">Meaning and analysis cover the phrase <span lang="ar" dir="rtl">{detail.sourceArabic}</span> together. The reader displays it as {detail.canonicalKeys.length} words.</p>}{detail.audioPath?<AudioControl url={recordedWordAudioUrl(detail.audioPath)} label={shared?'Listen to phrase':'Listen to word'}/>:<p className="muted">No individual recording is listed for this word. Use the ayah recording above.</p>}<details><summary>Grammar and word parts</summary><GrammarSegments detail={detail}/><a href={`https://corpus.quran.com/wordmorphology.jsp?location=(${surah}:${ayah}:${word})`} target="_blank" rel="noopener noreferrer">View the original Corpus analysis ↗</a></details>{detail.rootId&&<RootFamily id={detail.rootId}/>}</div>;
}
