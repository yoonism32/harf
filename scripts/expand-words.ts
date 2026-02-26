/**
 * expand-words.ts
 *
 * Auto-generates new word entries for the highest-frequency Quranic roots
 * not already in data/words.json. Meanings come from WBW glosses.
 * Grows words.json from 93 → ~300 entries (tier: 2).
 *
 * Run once with:  npx tsx scripts/expand-words.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CDN = 'https://static.quranwbw.com/data/v4';
const TARGET_NEW = 250;

// ── Types ─────────────────────────────────────────────────────────────────────

interface WordEntry {
  id: string;
  root: string;
  arabic: string;
  transliteration: string;
  meanings: string[];
  frequency: number;
  tier: number;
  example_verse: string;
  derivatives: [];
  coverage_weight: number;
  corpus_root_bw: string;
}

// ── Arabic → Latin transliteration map ───────────────────────────────────────

const AR_TO_LATIN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'a', 'آ': 'a', 'ٱ': 'a',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'dh', 'ع': 'a', 'غ': 'gh',
  'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'y', 'ة': 'h',
};

function rootToSlug(root: string): string {
  // root is space-separated Arabic letters e.g. "ك ت ب"
  return root
    .split(/\s+/)
    .filter(Boolean)
    .map(ch => AR_TO_LATIN[ch] ?? ch)
    .join('-');
}

function rootToTranslit(root: string): string {
  return root
    .split(/\s+/)
    .filter(Boolean)
    .map(ch => AR_TO_LATIN[ch] ?? ch)
    .join('');
}

// ── Normalise (same as fetch-morphology.ts) ───────────────────────────────────

function normalise(r: string): string {
  return r
    .replace(/\s+/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Add spaces between Arabic letters (for the root field) */
function spaceRoot(letters: string): string {
  // letters like "كتب" → "ك ت ب"
  return letters
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // strip diacritics
    .split('')
    .filter(Boolean)
    .join(' ');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching CDN morphology files…');

  const [uthmaniAndRootsRaw, wordsWithSameRootRaw] = await Promise.all([
    fetchJson(`${CDN}/morphology-data/word-uthmani-and-roots.json?version=1`),
    fetchJson(`${CDN}/morphology-data/words-with-same-root-keys.json?version=3`),
  ]) as [
    { data: Record<string, [string, string]> },
    { data: Record<string, string[]> }
  ];

  const keyToMeta  = uthmaniAndRootsRaw.data  ?? {};
  const rootToKeys = wordsWithSameRootRaw.data ?? {};

  console.log(`  word keys: ${Object.keys(keyToMeta).length}`);
  console.log(`  root keys: ${Object.keys(rootToKeys).length}`);

  // Load local WBW translation
  const wbwPath = path.join(__dirname, '../data/english-wbw.json');
  const wbwGlosses: Record<string, string> = JSON.parse(fs.readFileSync(wbwPath, 'utf-8'));
  console.log(`  wbw glosses: ${Object.keys(wbwGlosses).length}`);

  // Load existing words.json
  const wordsPath = path.join(__dirname, '../data/words.json');
  const existingWords: WordEntry[] = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
  const totalWordKeys = Object.keys(keyToMeta).length; // 77429

  // Build set of existing normalised roots and existing IDs
  const existingNormRoots = new Set(existingWords.map(w => normalise(w.root)));
  // usedIds tracks both existing AND already-generated IDs to prevent any duplicates
  const usedIds = new Set(existingWords.map(w => w.id));

  console.log(`\nExisting words: ${existingWords.length}`);

  // Sort CDN roots by family size descending (frequency proxy)
  const sortedRoots = Object.entries(rootToKeys)
    .sort((a, b) => b[1].length - a[1].length);

  const newEntries: WordEntry[] = [];

  for (const [cdnRoot, family] of sortedRoots) {
    if (newEntries.length >= TARGET_NEW) break;

    // Skip if already covered
    if (existingNormRoots.has(normalise(cdnRoot))) continue;

    // Build spaced root string
    const spacedRoot = spaceRoot(cdnRoot);

    // Generate ID from root slug — disambiguate collisions by appending the
    // raw CDN root letters (stripped of spaces) as a suffix
    let id = rootToSlug(spacedRoot);
    if (!id) continue;
    if (usedIds.has(id)) {
      // Collision: append raw Arabic letters joined as latin to differentiate
      const rawSuffix = cdnRoot.split('').map(ch => AR_TO_LATIN[ch] ?? ch).join('');
      id = `${id}-${rawSuffix}`;
    }
    if (usedIds.has(id)) continue; // still collides, skip

    // Arabic: uthmani text of first occurrence
    const firstKey = family[0]!;
    const arabic = keyToMeta[firstKey]?.[0] ?? '';
    if (!arabic) continue;

    // Meanings: collect WBW glosses from first 8 occurrences, deduplicate, take top 3
    const glossSet = new Set<string>();
    for (const key of family.slice(0, 8)) {
      const gloss = wbwGlosses[key];
      if (gloss) {
        // Clean up: remove leading articles, trim, lowercase for dedup
        const cleaned = gloss.trim();
        if (cleaned) glossSet.add(cleaned);
      }
    }
    const meanings = [...glossSet].slice(0, 3);
    if (meanings.length === 0) continue;

    // example_verse: "ch:vs" from first key
    const [ch, vs] = firstKey.split(':');
    const example_verse = `${ch}:${vs}`;

    const transliteration = rootToTranslit(spacedRoot);
    const frequency = family.length;

    usedIds.add(id); // claim the ID before moving to next root

    newEntries.push({
      id,
      root: spacedRoot,
      arabic,
      transliteration,
      meanings,
      frequency,
      tier: 2,
      example_verse,
      derivatives: [],
      coverage_weight: parseFloat((frequency / totalWordKeys).toFixed(6)),
      corpus_root_bw: '',
    });
  }

  console.log(`Generated ${newEntries.length} new entries`);

  // Merge and write
  const merged = [...existingWords, ...newEntries];
  fs.writeFileSync(wordsPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`\nWrote ${merged.length} total entries to ${wordsPath}`);

  // Quick sanity output
  console.log('\nSample new entries:');
  newEntries.slice(0, 5).forEach(e => {
    console.log(`  ${e.id} (${e.frequency}×) → ${e.meanings.join(' | ')}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
