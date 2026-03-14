'use client';

import morphologyData from '@/data/morphology.json';

interface MorphToken {
  w: number;         // word index
  s: number;         // segment index
  f: string;         // Arabic form
  tag: string;       // raw POS tag
  pos: string;       // human-readable POS
  type: string;      // PREFIX / STEM / SUFFIX
  lem?: string;      // lemma (Arabic)
  root?: string;     // root (Arabic)
  root_bw?: string;  // root (Buckwalter)
  case?: string;
  gender?: string;
  number?: string;
  tense?: string;
  mood?: string;
  voice?: string;
  form?: string;
}

interface MorphologyTableProps {
  verseRef: string;  // e.g. "2:255"
  verseArabic?: string;
}

const TYPE_COLORS: Record<string, string> = {
  PREFIX: 'text-blue-400 bg-blue-400/10',
  STEM:   'text-gold bg-gold/10',
  SUFFIX: 'text-purple-400 bg-purple-400/10',
};

const data = morphologyData as Record<string, MorphToken[]>;

export function MorphologyTable({ verseRef }: MorphologyTableProps) {
  const tokens = data[verseRef];

  if (!tokens || tokens.length === 0) {
    return (
      <div className="text-muted text-sm text-center py-4">
        Morphological data not available for this verse.
        <a
          href={`https://corpus.quran.com/wordbyword.jsp?chapter=${verseRef.split(':')[0]}&verse=${verseRef.split(':')[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold hover:underline ml-1"
        >
          View on corpus.quran.com ↗
        </a>
      </div>
    );
  }

  // Group by word number
  const wordGroups: Record<number, MorphToken[]> = {};
  for (const t of tokens) {
    const group = wordGroups[t.w];
    if (!group) wordGroups[t.w] = [t];
    else group.push(t);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Attribution */}
      <div className="text-xs text-muted text-right">
        Source:{' '}
        <a href="https://corpus.quran.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold">
          Quranic Arabic Corpus v0.4
        </a>
        {' '}— {verseRef}
      </div>

      {/* Word-by-word breakdown */}
      <div className="flex flex-col gap-2">
        {Object.entries(wordGroups).map(([wordNum, segs]) => {
          const stem = segs.find(s => s.type === 'STEM');
          return (
            <div key={wordNum} className="bg-surface-plus rounded-xl p-3 border border-border">
              {/* Word header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted text-xs">Word {wordNum}</span>
                {stem?.root && (
                  <span className="text-gold text-sm font-amiri" dir="rtl" style={{ fontFamily: 'Amiri, serif' }}>
                    {stem.root}
                  </span>
                )}
              </div>

              {/* Segment rows */}
              <table className="w-full text-sm border-collapse">
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Analysis</th>
                    <th scope="col">Features</th>
                  </tr>
                </thead>
                <tbody>
                  {segs.map((seg, i) => (
                    <tr key={i} className="border-t border-border/40 first:border-t-0">
                      <td className="py-1.5 pr-3 align-middle">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${TYPE_COLORS[seg.type] ?? 'text-muted'}`}>
                          {seg.type}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 align-middle">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className="font-amiri text-xl text-harf-text"
                            dir="rtl"
                            style={{ fontFamily: 'Amiri, serif' }}
                          >
                            {seg.f}
                          </span>
                          <span className="text-harf-text text-sm">{seg.pos}</span>
                          {seg.lem && (
                            <span className="text-muted text-xs">
                              lem: <span className="font-amiri" dir="rtl" style={{ fontFamily: 'Amiri, serif' }}>{seg.lem}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 align-middle text-right">
                        <div className="flex gap-1 flex-wrap justify-end">
                          {[seg.tense, seg.voice, seg.mood, seg.gender, seg.number, seg.case, seg.form]
                            .filter(Boolean)
                            .map((feat, fi) => (
                              <span key={fi} className="text-xs text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                                {feat}
                              </span>
                            ))
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
