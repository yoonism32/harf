// lib/transliteration-search.ts
//
// Local romanized-Arabic verse search.
// Pipeline:
//   user input → normalize → tokenize → strip particles →
//   score against transliteration.json via exact/substring/skeleton match →
//   IDF-weighted ranking → top N results

export interface TranslitSearchResult {
  verseRef:      string;    // "4:113"
  surah:         number;
  ayah:          number;
  score:         number;
  translitWords?: string[]; // raw space-split of the verse transliteration (word-for-word aligned with Arabic)
}

// ---------------------------------------------------------------------------
// 1. Normalisation
// ---------------------------------------------------------------------------

// Map extended Latin / Arabic-influenced digraphs to plain ASCII vowels
const DIACRITIC_MAP: Record<string, string> = {
  // Macron long vowels (aa → a, etc.)
  ā: 'a', Ā: 'a',
  ī: 'i', Ī: 'i',
  ū: 'u', Ū: 'u',
  // Dot-below emphatics → plain
  ḥ: 'h', Ḥ: 'h',
  ḍ: 'd', Ḍ: 'd',
  ṭ: 't', Ṭ: 't',
  ẓ: 'z', Ẓ: 'z',
  ṣ: 's', Ṣ: 's',
  // Dot-above
  ġ: 'g', Ġ: 'g',
  // Tilde / combining
  ñ: 'n',
};

/** Collapse aa→a  oo→u  ee→i  repeated vowels, strip diacritics, lowercase. */
export function normalizeInput(s: string): string {
  // Replace known extended chars
  let out = s.replace(/[āĀīĪūŪḥḤḍḌṭṬẓẒṣṢġĠñ]/g, c => DIACRITIC_MAP[c] ?? c);
  out = out.toLowerCase();
  // Digraph consonant normalization: dh → z (ذ), gh → g (غ)
  out = out.replace(/dh/g, 'z').replace(/gh/g, 'g');
  // Map digraph long vowels written by users
  out = out.replace(/aa/g, 'a').replace(/oo/g, 'u').replace(/uu/g, 'u').replace(/ee/g, 'i').replace(/ii/g, 'i');
  // Collapse runs of same vowel
  out = out.replace(/a{2,}/g, 'a').replace(/i{2,}/g, 'i').replace(/u{2,}/g, 'u');
  // Strip apostrophes / hamza markers — users almost never type ع correctly
  out = out.replace(/['''`]/g, '');
  // Keep only alpha + spaces
  out = out.replace(/[^a-z ]/g, ' ');
  // Collapse whitespace
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

// ---------------------------------------------------------------------------
// 2. Particle / inflection stripping
// ---------------------------------------------------------------------------

// Arabic particles that fuse to the front of words in romanization
const LEADING_PARTICLES = ['wala', 'wal', 'wa', 'fal', 'fa', 'bil', 'bi', 'lil', 'li', 'al', 'wabil', 'wabi'];
// Trailing pronouns/inflections
const TRAILING_SUFFIXES = ['hum', 'kum', 'tum', 'na', 'ni', 'ani', 'ahu', 'hu', 'ha', 'ka'];

/** Strip leading particles and trailing inflections from a single token. */
function stripParticles(token: string): string {
  let t = token;
  // Try leading particles (longest first)
  for (const p of LEADING_PARTICLES) {
    if (t.startsWith(p) && t.length - p.length >= 3) {
      t = t.slice(p.length);
      break;
    }
  }
  // Try trailing suffixes (longest first)
  for (const s of TRAILING_SUFFIXES) {
    if (t.endsWith(s) && t.length - s.length >= 3) {
      t = t.slice(0, t.length - s.length);
      break;
    }
  }
  return t;
}

// ---------------------------------------------------------------------------
// 3. Consonant skeleton
// ---------------------------------------------------------------------------

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** Strip all vowels → consonant skeleton ("kitaba" → "ktb", "hikmata" → "hkmt"). */
export function conskel(s: string): string {
  return s.split('').filter(c => !VOWELS.has(c)).join('');
}

/** Return ordered subsequence match fraction (0–1) of queryFrag vs verse-token skeleton. */
export function skelMatchFraction(qs: string, vs: string): number {
  if (!qs || !vs) return 0;
  let qi = 0;
  for (let vi = 0; vi < vs.length && qi < qs.length; vi++) {
    if (vs[vi] === qs[qi]) qi++;
  }
  const common = qi;
  return common / Math.max(qs.length, vs.length);
}

// ---------------------------------------------------------------------------
// 4. Token similarity
// ---------------------------------------------------------------------------

/** Score similarity between one query token and one verse token (0–1). */
export function tokenSim(qt: string, vt: string): number {
  if (qt === vt) return 1.0;

  // Substring (verse token contains query, or query contains verse token)
  if (qt.length >= 4 && vt.includes(qt)) return 0.85;
  if (vt.length >= 4 && qt.includes(vt)) return 0.85;

  // Prefix match (longer shares ≥4 chars prefix)
  const minPfx = 4;
  if (qt.length >= minPfx && vt.length >= minPfx) {
    const pfxLen = Math.min(qt.length, vt.length);
    if (qt.slice(0, pfxLen) === vt.slice(0, pfxLen)) return 0.80;
    // Partial prefix overlap of ≥4
    let overlap = 0;
    for (let i = 0; i < pfxLen; i++) {
      if (qt[i] === vt[i]) overlap++;
      else break;
    }
    if (overlap >= minPfx) return 0.78;
  }

  // Consonant skeleton subsequence
  const qs = conskel(qt);
  const vs = conskel(vt);
  if (qs.length >= 3 && vs.length >= 3) {
    const frac = skelMatchFraction(qs, vs);
    if (frac >= 0.62) return frac * 0.8;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// 5. Tokenisation
// ---------------------------------------------------------------------------

const SHORT_PARTICLES = new Set([
  'wa', 'fa', 'bi', 'li', 'la', 'al', 'ma', 'fi', 'min', 'an', 'in',
  'ila', 'ala', 'hum', 'kum', 'hu', 'ha', 'ka', 'na', 'ya', 'ta',
]);

export function tokenize(normalized: string): string[] {
  return normalized
    .split(' ')
    .filter(t => t.length >= 2 && !SHORT_PARTICLES.has(t));
}

/** Generate candidate variants for a query token (original + stripped). */
function tokenVariants(raw: string): string[] {
  const variants = new Set<string>([raw]);
  const stripped = stripParticles(raw);
  if (stripped !== raw) variants.add(stripped);
  // Also try stripping from stripped (double fusion)
  const stripped2 = stripParticles(stripped);
  if (stripped2 !== stripped) variants.add(stripped2);
  // Detect "bismillah" compound: split bism + allah
  if (raw.includes('bism')) {
    variants.add('bism');
    variants.add('allah');
  }
  if (raw.includes('allah') || raw.includes('illah')) {
    variants.add('alah');
    variants.add('ilah');
  }
  return [...variants];
}

// ---------------------------------------------------------------------------
// 6. Index + IDF
// ---------------------------------------------------------------------------

type VerseTokens = Record<string, string[]>;  // verseRef → normalized tokens[]
type IDF = Record<string, number>;            // token → idf weight

let _verseTokens: VerseTokens | null = null;
let _idf: IDF | null = null;
let _rawVerses: Record<string, string> | null = null;

function buildIndex(translitData: Record<string, string>): { verseTokens: VerseTokens; idf: IDF } {
  const verseTokens: VerseTokens = {};
  const docCount: Record<string, number> = {};

  for (const [ref, text] of Object.entries(translitData)) {
    const norm = normalizeInput(text);
    const tokens = norm.split(' ').filter(t => t.length >= 2);
    verseTokens[ref] = tokens;
    const seen = new Set<string>();
    for (const t of tokens) {
      if (!seen.has(t)) {
        docCount[t] = (docCount[t] ?? 0) + 1;
        seen.add(t);
      }
    }
  }

  const N = Object.keys(verseTokens).length;
  const idf: IDF = {};
  for (const [token, count] of Object.entries(docCount)) {
    idf[token] = Math.log(N / (count + 1));
  }

  return { verseTokens, idf };
}

function ensureIndex(translitData: Record<string, string>): { verseTokens: VerseTokens; idf: IDF } {
  if (!_verseTokens || !_idf) {
    const built = buildIndex(translitData);
    _verseTokens = built.verseTokens;
    _idf = built.idf;
    _rawVerses = translitData;
  }
  return { verseTokens: _verseTokens!, idf: _idf! };
}

// ---------------------------------------------------------------------------
// 7. Main search function
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal helpers for streaming search
// ---------------------------------------------------------------------------

interface QueryTokenData {
  raw:      string;
  variants: string[];
  skel:     string;
}

function buildQueryTokenData(norm: string): QueryTokenData[] {
  return tokenize(norm).map(qt => ({
    raw:      qt,
    variants: tokenVariants(qt),
    skel:     conskel(qt),
  }));
}

function scoreEntry(
  vTokens: string[],
  queryTokenData: QueryTokenData[],
  idf: IDF,
): { score: number; hits: number } {
  let totalScore = 0;
  let hitCount   = 0;

  for (const qtData of queryTokenData) {
    let bestSim = 0;
    let bestIdf = 0;

    for (const variant of qtData.variants) {
      for (const vt of vTokens) {
        const sim = tokenSim(variant, vt);
        if (sim > bestSim) { bestSim = sim; bestIdf = idf[vt] ?? Math.log(6236); }
      }
    }

    if (bestSim < 0.55 && qtData.skel.length >= 3) {
      for (const vt of vTokens) {
        const vs = conskel(vt);
        if (vs.length >= 3) {
          const frac = skelMatchFraction(qtData.skel, vs);
          if (frac >= 0.62) {
            const sim = frac * 0.8;
            if (sim > bestSim) { bestSim = sim; bestIdf = idf[vt] ?? Math.log(6236); }
          }
        }
      }
    }

    if (bestSim > 0) { totalScore += bestSim * bestIdf; hitCount++; }
  }

  const coverage = hitCount / queryTokenData.length;
  return { score: totalScore * coverage, hits: hitCount };
}

function toResults(
  scores: Record<string, number>,
  maxResults: number,
  rawVerses?: Record<string, string>,
): TranslitSearchResult[] {
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxResults)
    .map(([ref, score]) => {
      const [s, a] = ref.split(':');
      return {
        verseRef: ref,
        surah: Number(s),
        ayah: Number(a),
        score,
        translitWords: rawVerses?.[ref]?.split(' '),
      };
    });
}

/**
 * Generator that yields progressive search results as it scans verses in chunks.
 * Yields up to `maxResults` sorted results after every `chunkSize` verses.
 * Useful for streaming results to a Web Worker's postMessage.
 */
export function* searchVersesStreaming(
  query: string,
  translitData: Record<string, string>,
  chunkSize  = 2000,
  maxResults = 15,
): Generator<TranslitSearchResult[]> {
  const raw = query.trim();
  if (raw.length < 6) return;

  const { verseTokens, idf } = ensureIndex(translitData);
  const norm        = normalizeInput(raw);
  const queryTokens = tokenize(norm);
  if (queryTokens.length < 2) return;

  const qtData   = buildQueryTokenData(norm);
  const minHits  = Math.max(1, Math.ceil(qtData.length * 0.4));
  const entries  = Object.entries(verseTokens);
  const scores: Record<string, number> = {};

  for (let i = 0; i < entries.length; i++) {
    const [ref, vTokens] = entries[i]!;
    const { score, hits } = scoreEntry(vTokens, qtData, idf);
    if (hits >= minHits && score > 0) scores[ref] = score;

    if ((i + 1) % chunkSize === 0) {
      yield toResults(scores, maxResults, _rawVerses ?? undefined);
    }
  }

  // Final (complete) result
  yield toResults(scores, maxResults, _rawVerses ?? undefined);
}

// ---------------------------------------------------------------------------
// 7. Main search function
// ---------------------------------------------------------------------------

/**
 * Search for Quran verses by romanized Arabic input.
 *
 * @param query       Raw user input (any romanization style)
 * @param translitData The transliteration.json data (Record<"ch:vs", string>)
 * @param maxResults  Max number of results to return (default 15)
 */
export function searchVerses(
  query: string,
  translitData: Record<string, string>,
  maxResults = 15,
): TranslitSearchResult[] {
  // Minimum query length gate
  const raw = query.trim();
  if (raw.length < 6) return [];

  const { verseTokens, idf } = ensureIndex(translitData);

  const norm = normalizeInput(raw);
  const queryTokens = tokenize(norm);

  // Need at least 2 significant tokens for quality results
  if (queryTokens.length < 2) return [];

  // Pre-compute variants + skeletons for each query token
  const queryTokenData = queryTokens.map(qt => ({
    raw: qt,
    variants: tokenVariants(qt),
    skel: conskel(qt),
  }));

  const MIN_HIT_FRACTION = 0.4;
  const scores: Record<string, number> = {};
  const hitCounts: Record<string, number> = {};

  for (const [ref, vTokens] of Object.entries(verseTokens)) {
    let totalScore = 0;
    let hitCount = 0;

    for (const qtData of queryTokenData) {
      // Find best matching verse token for this query token
      let bestSim = 0;
      let bestIdf = 0;

      for (const variant of qtData.variants) {
        for (const vt of vTokens) {
          const sim = tokenSim(variant, vt);
          if (sim > bestSim) {
            bestSim = sim;
            // IDF of the verse token (rarer = higher weight)
            bestIdf = idf[vt] ?? Math.log(6236);
          }
        }
      }

      // Also try skeleton match against all verse token skeletons
      if (bestSim < 0.55 && qtData.skel.length >= 3) {
        for (const vt of vTokens) {
          const vs = conskel(vt);
          if (vs.length >= 3) {
            const frac = skelMatchFraction(qtData.skel, vs);
            if (frac >= 0.62) {
              const sim = frac * 0.8;
              if (sim > bestSim) {
                bestSim = sim;
                bestIdf = idf[vt] ?? Math.log(6236);
              }
            }
          }
        }
      }

      if (bestSim > 0) {
        totalScore += bestSim * bestIdf;
        hitCount++;
      }
    }

    const minHits = Math.max(1, Math.ceil(queryTokenData.length * MIN_HIT_FRACTION));
    if (hitCount >= minHits && totalScore > 0) {
      const coverage = hitCount / queryTokenData.length;
      scores[ref] = totalScore * coverage;
      hitCounts[ref] = hitCount;
    }
  }

  // Sort by score desc
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxResults);

  return sorted.map(([ref, score]) => {
    const [s, a] = ref.split(':');
    return {
      verseRef: ref,
      surah: Number(s),
      ayah: Number(a),
      score,
      translitWords: translitData[ref]?.split(' '),
    };
  });
}
