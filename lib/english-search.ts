// lib/english-search.ts

const STOPWORDS = new Set([
  'the','a','an','and','or','in','of','to','is','are','was','were',
  'be','been','being','have','has','had','do','does','did','will',
  'would','could','should','may','might','shall','can','not','no',
  'nor','but','for','with','at','by','from','on','up','into','out',
  'about','over','he','she','it','they','we','you','i','his','her',
  'its','their','our','your','my','this','that','those','these',
  'who','whom','which','what','when','where','how','why','so','if',
  'as','than','them','him','me','us','upon','lo','o','indeed',
  'verily','then','even','also','only','just','all','both','each',
  'few','more','most','other','some','such','own','same','there',
  'here','now','after','before','until',
]);

const IRREGULAR: Record<string, string> = {
  gave:'give',  given:'give',
  came:'come',  come:'come',
  went:'go',    gone:'go',
  saw:'see',    seen:'see',
  took:'take',  taken:'take',
  made:'make',
  said:'say',   says:'say',
  knew:'know',  known:'know',
  sent:'send',
  brought:'bring',
  led:'lead',
  stood:'stand',
  fell:'fall',  fallen:'fall',
  held:'hold',
  kept:'keep',
  left:'leave',
  ran:'run',
  bore:'bear',  born:'bear',  borne:'bear',
  chose:'choose', chosen:'choose',
  drew:'draw',  drawn:'draw',
  drove:'drive', driven:'drive',
  ate:'eat',    eaten:'eat',
  flew:'fly',   flown:'fly',
  hid:'hide',   hidden:'hide',
  wrote:'write', written:'write',
  spoke:'speak', spoken:'speak',
  threw:'throw', thrown:'throw',
  won:'win',
  bought:'buy',
  thought:'think',
  taught:'teach',
  caught:'catch',
  sought:'seek',
  forgave:'forgive', forgiven:'forgive',
  slew:'slay',  slain:'slay',
  strove:'strive', striven:'strive',
  swore:'swear', sworn:'swear',
  woke:'wake',  woken:'wake',
  forbade:'forbid', forbidden:'forbid',
  misled:'mislead',
};

export function stemWord(raw: string): string {
  const w = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (IRREGULAR[w]) return IRREGULAR[w]!;
  if (w.endsWith('ness') && w.length > 7)  return w.slice(0, -4);
  if (w.endsWith('tion') && w.length > 6)  return w.slice(0, -4);
  if (w.endsWith('ment') && w.length > 6)  return w.slice(0, -4);
  if (w.endsWith('ing')  && w.length > 6)  return w.slice(0, -3);
  if (w.endsWith('ers')  && w.length > 5)  return w.slice(0, -2);
  if (w.endsWith('ies')  && w.length > 5)  return w.slice(0, -3) + 'y';
  if (w.endsWith('ed')   && w.length > 5)  return w.slice(0, -2);
  if (w.endsWith('es')   && w.length > 4)  return w.slice(0, -1);
  if (w.endsWith('s')    && w.length > 4)  return w.slice(0, -1);
  return w;
}

export function isStopword(word: string): boolean {
  return STOPWORDS.has(word.toLowerCase().replace(/[^a-z]/g, ''));
}

export type SearchResult = {
  verseRef: string;  // "2:255"
  surah:    number;
  ayah:     number;
  gloss:    string;  // first matching WBW gloss for this verse
};

export function searchEnglish(
  query:      string,
  glosses:    Record<string, string>,
  maxResults = 30,
): SearchResult[] {
  const qStem = stemWord(query);
  if (!qStem || qStem.length < 3 || isStopword(query)) return [];

  const seen = new Set<string>();
  const out: SearchResult[] = [];

  for (const [key, gloss] of Object.entries(glosses)) {
    const tokens = gloss.toLowerCase().split(/[\s,;()\-]+/);
    const match = tokens.some(t => {
      const s = stemWord(t);
      if (s === qStem) return true;
      const minLen = Math.max(4, Math.min(s.length, qStem.length));
      return (
        (s.length >= minLen && s.startsWith(qStem.slice(0, minLen))) ||
        (qStem.length >= minLen && qStem.startsWith(s.slice(0, minLen)))
      );
    });

    if (!match) continue;

    const parts    = key.split(':');
    const surah    = Number(parts[0]);
    const ayah     = Number(parts[1]);
    const verseRef = `${surah}:${ayah}`;

    if (seen.has(verseRef)) continue;
    seen.add(verseRef);
    out.push({ verseRef, surah, ayah, gloss });
    if (out.length >= maxResults) break;
  }

  return out;
}
