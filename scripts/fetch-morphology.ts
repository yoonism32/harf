/**
 * fetch-morphology.ts
 *
 * Build-time script: fetches QuranWBW CDN morphology data for the 300 Harf
 * vocabulary words and writes data/wbw-morphology.json.
 *
 * Run once with:  npx tsx scripts/fetch-morphology.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CDN = 'https://static.quranwbw.com/data/v4';

// ── Types ────────────────────────────────────────────────────────────────────

interface WordEntry {
  id: string;
  root: string;
  example_verse: string;
}

interface MorphologyEntry {
  wordId: string;
  rootArabic: string;
  summary: string | null;
  rootFamily: string[];       // all word keys e.g. ["2:2:3", ...]
  rootFamilyCount: number;
  rootFamilyWords: Array<{ key: string; uthmani: string; english: string }>;
  verbForms: Record<string, string> | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/**
 * Normalise an Arabic root string for fuzzy matching.
 * Removes: spaces, diacritics, superscript alef, tatweel
 * Collapses: hamza forms → alef, alef maqsura → ya, teh marbuta → ha
 */
function normalise(r: string): string {
  return r
    .replace(/\s+/g, '')                          // remove whitespace
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')  // diacritics, tatweel
    .replace(/[أإآ]/g, 'ا')                        // hamza → plain alef
    .replace(/ى/g, 'ي')                            // alef maqsura → ya
    .replace(/ة/g, 'ه');                           // teh marbuta → ha
}

/**
 * Manual overrides for words whose root in words.json doesn't match the CDN.
 * Causes:
 *   - Hollow roots with ya/waw alternation (q-y-m → قوم i.e. q-w-m)
 *   - Surface form stored instead of classical root (a-s-m → سمو)
 *   - Wrong letter representation for hamza roots (j-a-a → جيا)
 * Keys are word IDs; values are the canonical CDN root key.
 */
const CDN_ROOT_OVERRIDES: Record<string, string> = {
  'q-y-m':  'قوم',  // hollow root: CDN uses q-w-m (660 occurrences)
  'j-a-a':  'جيا',  // hamza root: CDN uses j-y-a (278 occurrences)
  'a-s-m':  'سمو',  // surface noun stored as root: CDN uses s-m-w (381 occurrences)
  // a-r-s-l is handled algorithmically: strip Form-IV alef prefix → رسل
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching CDN static files in parallel…');

  const [uthmaniAndRootsRaw, wordsWithSameRootRaw, wordVerbsRaw] = await Promise.all([
    fetchJson(`${CDN}/morphology-data/word-uthmani-and-roots.json?version=1`),
    fetchJson(`${CDN}/morphology-data/words-with-same-root-keys.json?version=3`),
    fetchJson(`${CDN}/morphology-data/word-verbs.json?version=1`),
  ]) as [
    { data: Record<string, [string, string]> },
    { data: Record<string, string[]> },
    { data: Record<string, Record<string, string | null>> }
  ];

  const keyToMeta  = uthmaniAndRootsRaw.data  ?? {};   // "1:1:1" → [uthmaniText, rootLetters]
  const rootToKeys = wordsWithSameRootRaw.data ?? {};  // rootLetters → ["1:1:1", ...]
  const verbData   = wordVerbsRaw.data         ?? {};  // "1:1:1" → { formKey: value | null }

  // Load local WBW translation file: flat map "ch:vs:w" → English gloss
  const wbwPath = path.join(__dirname, '../data/english-wbw.json');
  const translationData: Record<string, string> = JSON.parse(fs.readFileSync(wbwPath, 'utf-8'));

  console.log(`  word keys loaded : ${Object.keys(keyToMeta).length}`);
  console.log(`  root keys loaded : ${Object.keys(rootToKeys).length}`);
  console.log(`  verb keys loaded : ${Object.keys(verbData).length}`);

  // Build normalised root → canonical CDN root letters map
  const normToCanonical = new Map<string, string>();
  for (const rootLetters of Object.keys(rootToKeys)) {
    const norm = normalise(rootLetters);
    if (!normToCanonical.has(norm)) {
      normToCanonical.set(norm, rootLetters);
    }
  }

  // Load vocabulary
  const wordsPath = path.join(__dirname, '../data/words.json');
  const words: WordEntry[] = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
  console.log(`Processing ${words.length} words…`);

  // Chapter summary cache: chapter number → { wordKey → HTML }
  const summaryCache = new Map<number, Record<string, string>>();

  async function getChapterSummary(chapter: number): Promise<Record<string, string>> {
    if (summaryCache.has(chapter)) return summaryCache.get(chapter)!;
    try {
      const data = await fetchJson(
        `${CDN}/lexicon/word-summaries/${chapter}.json?version=2`
      ) as { data?: Record<string, string> };
      const summaries = data.data ?? {};
      summaryCache.set(chapter, summaries);
      return summaries;
    } catch {
      summaryCache.set(chapter, {});
      return {};
    }
  }

  const result: Record<string, MorphologyEntry> = {};
  let matched = 0;
  let unmatched = 0;

  for (const word of words) {
    const normRoot = normalise(word.root);

    // 1. Manual override (irregular roots)
    // 2. Direct normalised match
    // 3. Algorithmic fallback: strip leading alef (Form IV prefix) for 4-letter roots
    let cdnRoot = CDN_ROOT_OVERRIDES[word.id]
      ?? normToCanonical.get(normRoot)
      ?? (normRoot.length === 4 && normRoot.startsWith('ا')
           ? normToCanonical.get(normRoot.slice(1))
           : undefined);

    if (!cdnRoot) {
      console.warn(`  [UNMATCHED] ${word.id} — "${word.root}" → "${normRoot}"`);
      unmatched++;
    } else {
      matched++;
    }

    const rootFamily: string[] = cdnRoot ? (rootToKeys[cdnRoot] ?? []) : [];

    // ── Verb forms: first key in rootFamily that has verb data ───────────────
    let verbForms: Record<string, string> | null = null;
    for (const key of rootFamily) {
      const forms = verbData[key];
      if (forms) {
        const filtered: Record<string, string> = {};
        for (const [k, v] of Object.entries(forms)) {
          if (v !== null) filtered[k] = v;
        }
        if (Object.keys(filtered).length > 0) {
          verbForms = filtered;
          break;
        }
      }
    }

    // ── Summary: first key in rootFamily within example_verse chapter ────────
    let summary: string | null = null;
    const [chapterStr] = word.example_verse.split(':');
    const chapter = parseInt(chapterStr ?? '0', 10);

    const chapterSummaries = await getChapterSummary(chapter);

    // Prefer a key from the example_verse itself
    for (const key of rootFamily) {
      const [keyChapter, keyVerse] = key.split(':');
      if (
        parseInt(keyChapter ?? '0', 10) === chapter &&
        keyVerse === word.example_verse.split(':')[1] &&
        chapterSummaries[key]
      ) {
        summary = chapterSummaries[key] ?? null;
        break;
      }
    }

    // Fallback: any key in the chapter
    if (!summary) {
      for (const key of rootFamily) {
        const [keyChapter] = key.split(':');
        if (parseInt(keyChapter ?? '0', 10) === chapter && chapterSummaries[key]) {
          summary = chapterSummaries[key] ?? null;
          break;
        }
      }
    }

    result[word.id] = {
      wordId: word.id,
      rootArabic: word.root,
      summary,
      rootFamily,
      rootFamilyCount: rootFamily.length,
      rootFamilyWords: rootFamily.slice(0, 40).map(key => ({
        key,
        uthmani: keyToMeta[key]?.[0] ?? '',
        english: translationData[key] ?? '',
      })),
      verbForms,
    };
  }

  console.log(`\nMatched: ${matched}  |  Unmatched: ${unmatched}`);

  const outPath = path.join(__dirname, '../data/wbw-morphology.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\nWrote ${Object.keys(result).length} entries to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
