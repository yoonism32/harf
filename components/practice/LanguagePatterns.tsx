'use client';
import Link from 'next/link';
import {useCallback, useState} from 'react';
import {languagePatterns} from '@/lib/learning/language-patterns';
import {getWordDetail} from '@/lib/content/client';
import {useResource, ResourceMessage} from '@/components/learning/useResource';
import {GrammarSegments} from '@/components/reader/GrammarAnalysis';

function Pattern({pattern}: {pattern: typeof languagePatterns[number]}) {
 const [open, setOpen] = useState(false);
 const load = useCallback(() => open ? getWordDetail(pattern.wordKey) : Promise.resolve(null), [open, pattern.wordKey]);
 const resource = useResource(load);
 return <article className="stack"><h3>{pattern.title}</h3><p>{pattern.explanation}</p><details onToggle={event => setOpen(event.currentTarget.open)}><summary>Inspect the source analysis · {pattern.wordKey}</summary>{open && (resource.data ? <GrammarSegments detail={resource.data}/> : <ResourceMessage {...resource}/>)}<p>Quranic Arabic Corpus v0.4, aligned to Harf’s canonical word positions. <Link href="/sources">Sources and methodology</Link></p></details></article>;
}
export function LanguagePatterns({reference}: {reference: string}) {
 const examples = languagePatterns.filter(pattern => pattern.reference === reference);
 return <section className="sheet stack" aria-label="Language patterns"><h2>Notice the language</h2>
  {examples.length ? examples.map(pattern => <Pattern key={pattern.id} pattern={pattern}/>) : <p>Keep a note of any construction that blocks your understanding. These short examples are a starting set.</p>}
  <details><summary>Explore four passage examples</summary><ul>{languagePatterns.map(pattern => <li key={pattern.id}><Link href={`/read/${pattern.reference.replace(':','/')}/study`}>{pattern.title} · {pattern.reference}</Link></li>)}</ul></details>
 </section>;
}
