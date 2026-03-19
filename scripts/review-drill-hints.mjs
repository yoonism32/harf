#!/usr/bin/env node
/**
 * Interactive curation tool for ALL ListeningDrill hint fields.
 *
 * For each surah, shows every hint clue (Themes, Context, Names, Virtue,
 * Overview items) numbered sequentially. Lets you mark individual clues as:
 *   r<n> = remove clue N entirely
 *   b<n> = blank specific text inside clue N
 *
 * Output: data/hint-overrides.json  (sparse — only modified clues written)
 * If no entry in output → hint loads unchanged from surah-info.json.
 *
 * Usage:
 *   node scripts/review-drill-hints.mjs
 *   node scripts/review-drill-hints.mjs --from 40
 *   node scripts/review-drill-hints.mjs --only 2,40,67
 */

import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA  = join(__dir, '..', 'data');
const OUT   = join(DATA, 'hint-overrides.json');

const surahInfoRaw = JSON.parse(readFileSync(join(DATA, 'surah-info.json'),       'utf8'));
const meta         = JSON.parse(readFileSync(join(DATA, 'quran-surah-meta.json'), 'utf8'));

// ── ANSI ──────────────────────────────────────────────────────────────────────
const R    = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM  = '\x1b[2m';
const CLUE_COLORS = ['\x1b[96m', '\x1b[93m', '\x1b[95m', '\x1b[92m', '\x1b[94m', '\x1b[91m'];
const WARN       = '\x1b[31m⚠ NAME LEAK\x1b[0m';
const OK         = '\x1b[32m✓\x1b[0m';
const BLANK_MARK = '\x1b[33m[___]\x1b[0m';

// ── Args ──────────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const fromIdx   = args.indexOf('--from');
const onlyIdx   = args.indexOf('--only');
const fromSurah = fromIdx >= 0 ? parseInt(args[fromIdx + 1]) : 1;
const onlySet   = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(',').map(Number)) : null;

// ── Load existing overrides ────────────────────────────────────────────────────
let overrides = {};
if (existsSync(OUT)) {
  try { overrides = JSON.parse(readFileSync(OUT, 'utf8')); }
  catch { console.warn(`\x1b[33m⚠ ${OUT} was corrupt — starting fresh\x1b[0m`); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Diacritic-insensitive normalisation (ā→a, Ḥ→H, etc.) */
function norm(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** True if text contains the surah name (diacritic-insensitive, al- stripped) */
function leaksName(text, surahName) {
  const nc     = norm(text);
  const tokens = [norm(surahName)];
  const noAl   = norm(surahName).replace(/^al-/, '');
  if (noAl !== norm(surahName)) tokens.push(noAl);
  return tokens.some(t => t.length > 2 && nc.includes(t));
}

/**
 * Enumerate all hint clues for a surah in the canonical order used by
 * buildHintPool in ListeningDrill.tsx.  Clue numbers are 1-indexed.
 * Empty / missing fields are skipped (no gap in numbering).
 */
function enumerateClues(si) {
  const clues = [];
  if (si.themes)  clues.push({ field: 'Themes',   text: si.themes });
  if (si.context) clues.push({ field: 'Context',  text: si.context });
  if (si.names)   clues.push({ field: 'Names',    text: si.names });
  if (si.virtue)  clues.push({ field: 'Virtue',   text: si.virtue });
  for (const item of si.overview ?? []) clues.push({ field: 'Overview', text: item });
  return clues;
}

/** Apply blank/remove override to display text (for preview). */
function applyOverride(text, override) {
  if (!override || override.remove) return text;
  if (override.blank)  text = text.replaceAll(override.blank,  '[___]');
  if (override.blanks) for (const b of override.blanks) text = text.replaceAll(b, '[___]');
  return text;
}

// ── Atomic save ───────────────────────────────────────────────────────────────
function save() {
  const tmp   = OUT + '.tmp';
  writeFileSync(tmp, JSON.stringify(overrides, null, 2));
  renameSync(tmp, OUT);
  const total = Object.values(overrides).reduce((n, s) => n + Object.keys(s).length, 0);
  console.log(`\n${OK} Saved (${Object.keys(overrides).length} surahs, ${total} overrides) → ${OUT}\n`);
}

// ── Readline ──────────────────────────────────────────────────────────────────
const rl  = createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, r));

// ── Legend (printed inline so you never have to scroll up) ───────────────────
const LEGEND = [
  `${DIM}  Commands (comma-separate for multiple):`,
  `    k / Enter = keep all unchanged`,
  `    r<n>      = remove clue n  (e.g. r3)`,
  `    b<n>      = blank text in clue n  (e.g. b3 → prompted for exact text)`,
  `    q         = quit & save${R}`,
].join('\n');

// ── Main loop ─────────────────────────────────────────────────────────────────
const surahs = meta.filter(s =>
  surahInfoRaw[String(s.id)] &&
  s.id >= fromSurah &&
  (!onlySet || onlySet.has(s.id))
);

console.log(`\n${BOLD}ListeningDrill — Full Hint Curation${R}`);
console.log(`${DIM}${surahs.length} surahs · ${Object.keys(overrides).length} already have overrides · output: ${OUT}${R}\n`);

for (const s of surahs) {
  const id             = String(s.id);
  const si             = surahInfoRaw[id];
  const clues          = enumerateClues(si);
  const surahOverrides = overrides[id] ?? {};
  const hasOverrides   = Object.keys(surahOverrides).length > 0;

  // ── Surah header ──
  const overrideLabel = hasOverrides ? ` ${DIM}[has overrides — press Enter to skip]${R}` : '';
  console.log(`${'─'.repeat(72)}`);
  console.log(`${BOLD}S${s.id.toString().padStart(3)}  ${s.name}  ${s.arabic}${R}${overrideLabel}`);
  console.log(`${DIM}  ${si.revelationPlace} · ${clues.length} clues${R}\n`);

  // ── Print all clues ──
  clues.forEach((c, i) => {
    const clueNum = i + 1;
    const col     = CLUE_COLORS[i % CLUE_COLORS.length];
    const override = surahOverrides[String(clueNum)];
    const leak    = leaksName(c.text, s.name);

    let displayText  = override ? applyOverride(c.text, override) : c.text;
    const isRemoved  = override?.remove === true;

    const leakFlag    = isRemoved  ? `  ${DIM}[removed]${R}`
                      : leak       ? `  ${WARN}`
                      : `  ${OK}`;
    const overrideTag = override && !isRemoved ? ` ${DIM}[blanked]${R}` : '';

    console.log(`  ${col}[${clueNum}] ${c.field.toUpperCase()}${R}${overrideTag}${leakFlag}`);

    if (isRemoved) {
      console.log(`  ${DIM}(removed)${R}\n`);
    } else {
      // Word-wrap at ~90 chars, indented 4 spaces, coloured
      const marked = displayText.replace(/\[___\]/g, '[___]');
      const words  = marked.split(' ');
      const lines  = [];
      let   line   = '';
      for (const w of words) {
        if (line && line.length + 1 + w.length > 90) { lines.push(line); line = w; }
        else line = line ? line + ' ' + w : w;
      }
      if (line) lines.push(line);
      for (const l of lines) {
        console.log(`  ${col}${l.replace(/\[___\]/g, BLANK_MARK + col)}${R}`);
      }
      console.log('');
    }
  });

  // ── Legend + prompt ──
  console.log(LEGEND);
  const raw = await ask('> ');
  const ans = raw.trim().toLowerCase();

  if (ans === 'q') { save(); rl.close(); process.exit(0); }
  if (ans === '' || ans === 'k') {
    console.log(`${DIM}  → no changes${R}\n`);
    continue;
  }

  // ── Parse commands: r2, b3, r1,b3, etc. ──
  const tokens  = ans.split(',').map(t => t.trim()).filter(Boolean);
  const removes = new Set();
  const blanks  = [];   // clue numbers to blank

  for (const token of tokens) {
    const m = token.match(/^([rb])(\d+)$/);
    if (!m) { console.log(`${DIM}  ⚠ unknown command "${token}" — skipped${R}`); continue; }
    const [, cmd, numStr] = m;
    const n = parseInt(numStr);
    if (n < 1 || n > clues.length) { console.log(`${DIM}  ⚠ clue ${n} out of range — skipped${R}`); continue; }
    if (cmd === 'r') removes.add(n);
    if (cmd === 'b') blanks.push(n);
  }

  // ── Prompt for text to blank (loop per clue — empty line = done) ──
  const blankMap = {};  // clueNum → string[]
  for (const n of blanks) {
    const clue = clues[n - 1];
    const col  = CLUE_COLORS[(n - 1) % CLUE_COLORS.length];
    console.log(`\n  ${col}[${n}] ${clue.field}:${R}`);
    console.log(`  ${col}${clue.text}${R}`);
    console.log(`  ${DIM}(Enter each string to blank, empty line when done)${R}`);
    const collected = [];
    let working = clue.text;
    while (true) {
      const input = await ask(`  blank> `);
      if (!input.trim()) break;
      working = working.replace(input.trim(), '[___]');
      console.log(`  → ${DIM}${working.replace(/\[___\]/g, BLANK_MARK + R + DIM)}${R}`);
      collected.push(input.trim());
    }
    if (collected.length > 0) blankMap[n] = collected;
  }

  // ── Apply modifications to overrides ──
  let changed = false;
  const newSurahOverrides = { ...surahOverrides };

  for (const n of removes) {
    newSurahOverrides[String(n)] = { remove: true };
    console.log(`  ${DIM}[${n}] → REMOVED${R}`);
    changed = true;
  }

  for (const [nStr, newBlanks] of Object.entries(blankMap)) {
    const n        = parseInt(nStr);
    const clue     = clues[n - 1];
    const existing = newSurahOverrides[String(n)];

    // Merge with existing blanks
    const prevList = existing?.blanks ?? (existing?.blank ? [existing.blank] : []);
    const merged   = [...prevList, ...newBlanks];

    // Build preview from original text
    let preview = clue.text;
    for (const b of merged) preview = preview.replace(b, '[___]');
    console.log(`  [${n}] → ${DIM}${preview.replace(/\[___\]/g, BLANK_MARK + R + DIM)}${R}`);

    newSurahOverrides[String(n)] = merged.length === 1
      ? { blank: merged[0] }
      : { blanks: merged };
    changed = true;
  }

  if (changed) {
    if (Object.keys(newSurahOverrides).length === 0) {
      delete overrides[id];
    } else {
      overrides[id] = newSurahOverrides;
    }
    save();
  } else {
    console.log(`${DIM}  → no changes${R}\n`);
  }
}

save();
rl.close();
