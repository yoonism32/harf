// Tadabbur data utilities — lazy-loaded JSON lookups for reflection section

export interface ThemeEntry {
  theme: string;
  surah: number;
  from: number;
  to: number;
  keywords: string;
  count: number;
}

export interface TopicIndex {
  id: number;
  name: string;
  ar: string;
  parent: number | null;
  thematic: boolean;
  ontology: boolean;
  ayahs: string[];
}

export interface MatchEntry {
  matched_ayah_key: string;
  matched_words_count: number;
  coverage: number;
  score: number;
  match_words: number[][];
}

export interface PhraseEntry {
  id: string;
  surahs: number;
  ayahs: number;
  count: number;
  source: { key: string; from: number; to: number };
  /** verse key → list of [wordFrom, wordTo] position pairs */
  ayah: Record<string, number[][]>;
}

export interface SurahInfo {
  id: number;
  name: string;
  nameArabic: string;
  translation: string;
  verses: number;
  revelationPlace: string;
  chronologicalOrder: number;
  juz: number[];
  summary: string;
  themes?: string;
  context?: string;
  names?: string;
  virtue?: string;
  overview?: string[];
}

type RawPhrase = Omit<PhraseEntry, 'id'>;

export interface MutashabihatPair {
  id: string;             // "verseA__verseB"
  verseA: string;         // e.g. "1:1"
  verseB: string;         // e.g. "27:30"
  score: number;
  matchWordsInB: number[][];  // word position ranges in verseB that match verseA
}

export interface MutashabihatGroup {
  id: string;      // verseA key — used as SRS card ID
  verseA: string;
  twins: {
    verseB: string;
    score: number;
    matchWordsInB: number[][];
  }[];
}

// ── Lazy-loaded caches ────────────────────────────────────────────

let themesCache: ThemeEntry[] | null = null;
let topicsIndexCache: TopicIndex[] | null = null;
let verseTopicsCache: Record<string, number[]> | null = null;
let matchingAyahCache: Record<string, MatchEntry[]> | null = null;
let phrasesCache: Record<string, RawPhrase> | null = null;
let phraseVersesCache: Record<string, number[]> | null = null;
let surahInfoCache: Record<string, SurahInfo> | null = null;
let mutashabihatPairsCache: MutashabihatPair[] | null = null;
let mutashabihatGroupsCache: MutashabihatGroup[] | null = null;

async function loadThemes(): Promise<ThemeEntry[]> {
  if (themesCache) return themesCache;
  const mod = await import('@/data/ayah-themes.json');
  themesCache = mod.default as ThemeEntry[];
  return themesCache;
}

async function loadTopicsIndex(): Promise<TopicIndex[]> {
  if (topicsIndexCache) return topicsIndexCache;
  const mod = await import('@/data/topics-index.json');
  topicsIndexCache = mod.default as TopicIndex[];
  return topicsIndexCache;
}

async function loadVerseTopics(): Promise<Record<string, number[]>> {
  if (verseTopicsCache) return verseTopicsCache;
  const mod = await import('@/data/verse-topics-index.json');
  verseTopicsCache = mod.default as Record<string, number[]>;
  return verseTopicsCache;
}

async function loadMatchingAyah(): Promise<Record<string, MatchEntry[]>> {
  if (matchingAyahCache) return matchingAyahCache;
  const mod = await import('@/data/matching-ayah.json');
  matchingAyahCache = mod.default as Record<string, MatchEntry[]>;
  return matchingAyahCache;
}

async function loadPhrases(): Promise<Record<string, RawPhrase>> {
  if (phrasesCache) return phrasesCache;
  const mod = await import('@/data/mutashabihat-phrases.json');
  phrasesCache = mod.default as Record<string, RawPhrase>;
  return phrasesCache;
}

async function loadPhraseVerses(): Promise<Record<string, number[]>> {
  if (phraseVersesCache) return phraseVersesCache;
  const mod = await import('@/data/mutashabihat-verse-index.json');
  phraseVersesCache = mod.default as Record<string, number[]>;
  return phraseVersesCache;
}

async function loadSurahInfo(): Promise<Record<string, SurahInfo>> {
  if (surahInfoCache) return surahInfoCache;
  const mod = await import('@/data/surah-info.json');
  surahInfoCache = mod.default as Record<string, SurahInfo>;
  return surahInfoCache;
}

// ── Public API ────────────────────────────────────────────────────

/** Theme that covers a given ayah (searches ranges) */
export async function getAyahTheme(surah: number, ayah: number): Promise<ThemeEntry | null> {
  const themes = await loadThemes();
  return themes.find(t => t.surah === surah && t.from <= ayah && t.to >= ayah) ?? null;
}

/** All themes for a surah, ordered (deduped by range) */
export async function getSurahThemes(surah: number): Promise<ThemeEntry[]> {
  const themes = await loadThemes();
  const seen = new Set<string>();
  return themes.filter(t => {
    if (t.surah !== surah) return false;
    const key = `${t.from}-${t.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Topics for a verse key "surah:ayah" */
export async function getVerseTopics(verseKey: string): Promise<TopicIndex[]> {
  const [verseTopics, topicsIndex] = await Promise.all([loadVerseTopics(), loadTopicsIndex()]);
  const ids = verseTopics[verseKey] ?? [];
  const idSet = new Set(ids);
  return topicsIndex.filter(t => idSet.has(t.id));
}

/** Related ayahs sorted by score descending, top N — minimum score 70 to filter noise */
export async function getRelatedAyahs(verseKey: string, limit = 5): Promise<MatchEntry[]> {
  const matching = await loadMatchingAyah();
  const results = matching[verseKey] ?? [];
  return results
    .filter(r => r.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Mutashabihat phrases that appear in a given verse */
export async function getMutashabihatForVerse(verseKey: string): Promise<PhraseEntry[]> {
  const [phraseVerses, phrases] = await Promise.all([loadPhraseVerses(), loadPhrases()]);
  const ids = phraseVerses[verseKey] ?? [];
  return ids
    .map(id => {
      const raw = phrases[String(id)];
      if (!raw) return null;
      return { id: String(id), ...raw } as PhraseEntry;
    })
    .filter((p): p is PhraseEntry => p !== null);
}

/** Surah intro info */
export async function getSurahInfo(surah: number): Promise<SurahInfo | null> {
  const info = await loadSurahInfo();
  return info[String(surah)] ?? null;
}

/** True mutashabihat pairs — structurally similar verses (score ≥ 70) */
export async function getMutashabihatPairs(): Promise<MutashabihatPair[]> {
  if (mutashabihatPairsCache) return mutashabihatPairsCache;
  const mod = await import('@/data/mutashabihat-pairs.json');
  mutashabihatPairsCache = mod.default as MutashabihatPair[];
  return mutashabihatPairsCache;
}

/** Groups of similar verses (score ≥ 70), keyed by verseA — for the mutashabihat drill */
export async function getMutashabihatGroups(): Promise<MutashabihatGroup[]> {
  if (mutashabihatGroupsCache) return mutashabihatGroupsCache;
  const pairs = await getMutashabihatPairs();
  const map = new Map<string, MutashabihatGroup>();
  for (const pair of pairs) {
    if (!map.has(pair.verseA)) {
      map.set(pair.verseA, { id: pair.verseA, verseA: pair.verseA, twins: [] });
    }
    map.get(pair.verseA)!.twins.push({
      verseB: pair.verseB,
      score: pair.score,
      matchWordsInB: pair.matchWordsInB,
    });
  }
  for (const g of map.values()) {
    g.twins.sort((a, b) => b.score - a.score);
  }
  mutashabihatGroupsCache = Array.from(map.values());
  return mutashabihatGroupsCache;
}

/** All drill-worthy phrases (count >= minCount, phrase length >= minLength words) */
export async function getDrillPhrases(minCount = 3, minLength = 4): Promise<PhraseEntry[]> {
  const phrases = await loadPhrases();
  return Object.entries(phrases)
    .filter(([, v]) => v.count >= minCount && (v.source.to - v.source.from + 1) >= minLength)
    .map(([id, v]) => ({ id, ...v } as PhraseEntry));
}
