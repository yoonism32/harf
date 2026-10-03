'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import { getAyah } from '@/lib/content/client';
import { positionsInRanges } from '@/lib/insights/compare';
import type { SimilarPair } from '@/lib/insights/types';
import { ResourceMessage, useResource } from '@/components/learning/useResource';

export function SimilarPassagesPractice({ pairs }: { pairs: SimilarPair[] }) {
  const params=useSearchParams(),router=useRouter();
  const raw=params.get('pair'),parsed=raw&&/^\d{1,3}$/.test(raw)?Number(raw):0;
  const index=parsed>=0&&parsed<pairs.length?parsed:0;
  const complete=parsed===pairs.length;
  if(complete)return <section className="study-sheet stack"><p className="eyebrow">Practice complete</p><h2>You compared all {pairs.length} passages.</h2><p>Return whenever you want to look for the shared wording again.</p><div className="row"><Link className="button button-primary" href="/insights/practice?pair=0">Practice again</Link><Link className="button button-secondary" href="/insights">Back to Quran insights</Link></div></section>;
  return <Comparison pairs={pairs} index={index} onNext={()=>router.push(`/insights/practice?pair=${index+1}`)}/>;
}

function Comparison({pairs,index,onNext}:{pairs:SimilarPair[];index:number;onNext:()=>void}){
  const [revealed, setRevealed] = useState(false);
  const pair = pairs[index]!;
  const loadA = useCallback(() => getAyah(pair.verseA), [pair.verseA]);
  const loadB = useCallback(() => getAyah(pair.verseB), [pair.verseB]);
  const ayahA = useResource(loadA);
  const ayahB = useResource(loadB);
  const sharedPositions = positionsInRanges(pair.matchWordsInB);

  useEffect(() => setRevealed(false), [index]);

  if (!ayahA.data) return <ResourceMessage error={ayahA.error} retry={ayahA.retry} />;

  return (
    <section className="study-sheet stack" aria-labelledby="practice-heading">
      <div className="row between">
        <div>
          <p className="eyebrow">Comparison {index + 1} of {pairs.length}</p>
          <h2 id="practice-heading">Recall the parallel wording</h2>
        </div>
        <Link href={`/insights/${pair.verseA.replace(':', '/')}`}>Context for {pair.verseA}</Link>
      </div>
      <progress value={index + 1} max={pairs.length}>Comparison {index + 1} of {pairs.length}</progress>
      <article className="sheet stack">
        <p className="muted">Read {pair.verseA}. Before revealing, recall where a similar passage appears and which words change.</p>
        <p className="quran-text" dir="rtl" lang="ar">
          {ayahA.data.tokens.map(token => token.arabic).join(' ')}
        </p>
        <p className="translation">{ayahA.data.translation}</p>
      </article>
      {!revealed ? (
        <button className="button button-primary" onClick={() => setRevealed(true)}>Reveal the similar passage</button>
      ) : !ayahB.data ? (
        <ResourceMessage error={ayahB.error} retry={ayahB.retry} />
      ) : (
        <article className="sheet stack" aria-live="polite">
          <div className="row between">
            <h3>Compare with {pair.verseB}</h3>
            <span className="badge">Text match score {pair.score}</span>
          </div>
          <p className="muted">Highlighted words are identified as shared. Bold words differ in this comparison.</p>
          <p className="quran-text" dir="rtl" lang="ar">
            {ayahB.data.tokens.map(token => {
              if (token.kind !== 'word') return <span key={token.key}>{token.arabic} </span>;
              return sharedPositions.has(token.position)
                ? <mark key={token.key} className="selected-token">{token.arabic} </mark>
                : <strong key={token.key}>{token.arabic} </strong>;
            })}
          </p>
          <p className="translation">{ayahB.data.translation}</p>
          <div className="row between">
            <Link href={`/insights/${pair.verseB.replace(':', '/')}`}>Explore {pair.verseB} in context</Link>
            <button className="button button-primary" onClick={onNext}>{index===pairs.length-1?'Finish practice':'Next comparison'}</button>
          </div>
        </article>
      )}
    </section>
  );
}
