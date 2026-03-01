/**
 * validate-data.ts
 *
 * Cross-references words.json, wbw-morphology.json, and english-wbw.json to
 * catch data integrity issues before they silently produce wrong UI.
 *
 * Run:  npx tsx scripts/validate-data.ts
 * Or:   npm run validate-data
 *
 * Exit codes:
 *   0 — all checks passed (warnings are printed but do not fail)
 *   1 — one or more ERROR-level issues found
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DATA_DIR   = path.resolve(__dirname, '../data');

// ── Types ──────────────────────────────────────────────────────────────────

interface Word {
  id: string;
  root: string;
  arabic: string;
  transliteration: string;
  frequency: number;
  tier: number;
  example_verse?: string;
  coverage_weight: number;
}

interface MorphEntry {
  wordId: string;
  rootArabic: string;
  summary: string;
  rootFamily: string[];
  rootFamilyCount: number;
  rootFamilyWords: Array<{ key: string; uthmani: string; english: string }>;
}

// ── Load files ─────────────────────────────────────────────────────────────

function load<T>(filename: string): T {
  const fullPath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as T;
}

const words      = load<Word[]>('words.json');
const morphology = load<Record<string, MorphEntry>>('wbw-morphology.json');
const englishWbw = load<Record<string, string>>('english-wbw.json');

// ── Helpers ────────────────────────────────────────────────────────────────

const VERSE_KEY_RE = /^\d+:\d+:\d+$/;

type Severity = 'ERROR' | 'WARN' | 'INFO';

interface Issue {
  severity: Severity;
  check: string;
  detail: string;
}

const issues: Issue[] = [];

function error(check: string, detail: string) {
  issues.push({ severity: 'ERROR', check, detail });
}
function warn(check: string, detail: string) {
  issues.push({ severity: 'WARN', check, detail });
}

// ── Check 1: words.json ↔ wbw-morphology.json key parity ──────────────────

const wordIds   = new Set(words.map(w => w.id));
const morphKeys = new Set(Object.keys(morphology));

for (const id of wordIds) {
  if (!morphKeys.has(id)) {
    error('missing_morphology', `"${id}" is in words.json but has no entry in wbw-morphology.json`);
  }
}
for (const key of morphKeys) {
  if (!wordIds.has(key)) {
    warn('orphaned_morphology', `"${key}" is in wbw-morphology.json but not in words.json`);
  }
}

// ── Check 2: rootArabic in morphology matches root in words.json ───────────

const wordMap = new Map(words.map(w => [w.id, w]));

for (const [id, morph] of Object.entries(morphology)) {
  const word = wordMap.get(id);
  if (!word) continue;

  const normMorph = morph.rootArabic.replace(/\s+/g, ' ').trim();
  const normWord  = word.root.replace(/\s+/g, ' ').trim();

  if (normMorph !== normWord) {
    error(
      'root_arabic_mismatch',
      `"${id}" — words.json root: "${normWord}" | morphology rootArabic: "${normMorph}"`
    );
  }
}

// ── Check 3: wordId field inside morphology entry matches its key ──────────

for (const [key, morph] of Object.entries(morphology)) {
  if (morph.wordId !== key) {
    error(
      'wordid_key_mismatch',
      `Morphology key "${key}" but entry.wordId is "${morph.wordId}"`
    );
  }
}

// ── Check 4: rootFamilyCount matches actual rootFamily array length ────────

for (const [id, morph] of Object.entries(morphology)) {
  const actual = morph.rootFamily?.length ?? 0;
  if (morph.rootFamilyCount !== actual) {
    warn(
      'count_mismatch',
      `"${id}" declares rootFamilyCount=${morph.rootFamilyCount} but rootFamily has ${actual} entries`
    );
  }
}

// ── Check 5: rootFamily verse key format and surah range ──────────────────

for (const [id, morph] of Object.entries(morphology)) {
  for (const key of morph.rootFamily ?? []) {
    if (!VERSE_KEY_RE.test(key)) {
      error('malformed_verse_key', `"${id}" rootFamily contains malformed key "${key}"`);
      continue;
    }
    const parts = key.split(':').map(Number);
    const s = parts[0]!;
    const a = parts[1]!;
    const w = parts[2]!;
    if (s < 1 || s > 114) {
      error('surah_out_of_range', `"${id}" rootFamily key "${key}" has surah ${s} (valid: 1–114)`);
    }
    if (a < 1) {
      error('ayah_zero', `"${id}" rootFamily key "${key}" has ayah ${a}`);
    }
    if (w < 1) {
      error('word_zero', `"${id}" rootFamily key "${key}" has word position ${w}`);
    }
  }
}

// ── Check 6: example_verse format in words.json ───────────────────────────

for (const word of words) {
  if (!word.example_verse) continue;
  const parts = word.example_verse.split(':');
  if (
    parts.length !== 2 ||
    isNaN(Number(parts[0])) ||
    isNaN(Number(parts[1]))
  ) {
    error('bad_example_verse', `"${word.id}" example_verse "${word.example_verse}" is not "surah:ayah" format`);
  }
}

// ── Check 7: rootFamilyWords keys present in english-wbw.json ─────────────
//
// NOTE: A tokenization difference exists between two upstream sources:
//   • english-wbw.json  — from quran.com word-by-word data
//   • wbw-morphology.json — from Quranic Arabic Corpus (QAC)
//
// In most verses both sources use the same word positions. However, QAC
// occasionally joins particles differently (e.g. بَعْدَمَا as one token
// at 2:181:3, leaving سَمِعَهُۥ at 2:181:4), while the quran.com dataset
// may have a gap at that position. These mismatches are WARNINGS, not errors,
// because they reflect upstream tokenization choices, not bugs in Harf code.
//
// Known gaps: 2:181:4 (samiʿahu — QAC pos 4 after combined baʿdamā token)

const missingGlossSamples: string[] = [];
let   missingGlossTotal = 0;

for (const [id, morph] of Object.entries(morphology)) {
  for (const fw of morph.rootFamilyWords ?? []) {
    if (!englishWbw[fw.key]) {
      missingGlossTotal++;
      if (missingGlossSamples.length < 10) {
        missingGlossSamples.push(`  "${id}" → ${fw.key} (${fw.uthmani})`);
      }
    }
  }
}

if (missingGlossTotal > 0) {
  warn(
    'rootFamilyWords_missing_english_gloss',
    `${missingGlossTotal} rootFamilyWords keys have no entry in english-wbw.json ` +
    `(likely tokenization gap between QAC and quran.com datasets):\n` +
    missingGlossSamples.join('\n') +
    (missingGlossTotal > 10 ? `\n  … and ${missingGlossTotal - 10} more` : '')
  );
}

// ── Check 8: coverage_weight sanity (high-frequency words should have > 0) ─

for (const word of words) {
  if (word.frequency > 100 && word.coverage_weight <= 0) {
    warn(
      'zero_coverage_weight',
      `"${word.id}" has frequency=${word.frequency} but coverage_weight=${word.coverage_weight}`
    );
  }
}

// ── Report ─────────────────────────────────────────────────────────────────

const errors   = issues.filter(i => i.severity === 'ERROR');
const warnings = issues.filter(i => i.severity === 'WARN');

const totalVerseKeys = Object.values(morphology).flatMap(m => m.rootFamily ?? []).length;

console.log('\n=== Harf Data Validation ===\n');
console.log(`  words.json             ${words.length} words`);
console.log(`  wbw-morphology.json    ${Object.keys(morphology).length} entries`);
console.log(`  english-wbw.json       ${Object.keys(englishWbw).length} glosses`);
console.log(`  rootFamily verse keys  ${totalVerseKeys} total\n`);

if (errors.length === 0 && warnings.length === 0) {
  console.log('  ✓ All checks passed.\n');
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`  ERRORS (${errors.length}):\n`);
  for (const e of errors) {
    console.log(`  [${e.check}]\n  ${e.detail}\n`);
  }
}

if (warnings.length > 0) {
  console.log(`  WARNINGS (${warnings.length}):\n`);
  for (const w of warnings) {
    console.log(`  [${w.check}]\n  ${w.detail}\n`);
  }
}

console.log(`  Summary: ${errors.length} error(s), ${warnings.length} warning(s)\n`);

if (errors.length > 0) {
  process.exit(1);
}
