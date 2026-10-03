/** Extended Buckwalter from corpus.quran.com/java/buckwalter.jsp. */
const latin = "'>&<}AbptvjHxd*rzs$SDTZEgfqklmnhwYyFNKaui~o`{^#:@\"[;,.!-+%]_";
const arabic = 'ءأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهويىًٌٍَُِّْٰٱۣٓٔۜ۟۠ۢۥۦ۪ۭۨ۫۬ـ';
const alphabet = Object.fromEntries([...latin].map((c, i) => [c, [...arabic][i]!]));
alphabet.Y = 'ى'; alphabet.y = 'ي';
export function fromBuckwalter(value: string) {
  return [...value].map(c => alphabet[c] ?? c).join('');
}
/** Comparison only. Never use this lossy spelling normalization to render scripture or identify lemmas. */
export function comparableArabic(value: string) {
  return value.normalize('NFC').replace(/ىٰ/g, 'ا').replace(/ٰ/g, 'ا')
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u0640\u200E\u200F\s]/g, '')
    .replace(/[ٱأإآ]/g, 'ا').replace(/ؤ/g, 'و').replace(/[ئى]/g, 'ي').replace(/ء/g, '');
}
export type LocatedWord = { key: string; arabic: string };
/** Ordered character spans, not matching numeric keys or searching for a similar-looking word. */
export function alignWordSpans(source: LocatedWord[], canonical: LocatedWord[]) {
  const ref = source[0]?.key.split(':').slice(0, 2).join(':');
  if (!ref || !canonical.length || [...source, ...canonical].some(w => w.key.split(':').slice(0, 2).join(':') !== ref))
    throw new Error('Alignment must stay within one ayah');
  const spans = (words: LocatedWord[]) => {
    let offset = 0;
    return words.map(w => {
      // These two exports share scripture spelling; only spacing differs. No fuzzy text normalization here.
      const text = w.arabic.replace(/\s/g, '');
      if (!text) throw new Error(`Empty alignment word ${w.key}`);
      const start = offset; offset += text.length;
      return { ...w, text, start, end: offset };
    });
  };
  const left = spans(source), right = spans(canonical);
  if (left.map(w => w.text).join('') !== right.map(w => w.text).join(''))
    throw new Error(`Scripture differs while aligning ${ref}`);
  return left.map(w => ({ sourceKey: w.key, canonicalKeys: right.filter(t => t.start < w.end && t.end > w.start).map(t => t.key) }));
}
