import themesRaw from '@/data/ayah-themes.json';
import matchingRaw from '@/data/matching-ayah.json';
import pairsRaw from '@/data/mutashabihat-pairs.json';
import phrasesRaw from '@/data/mutashabihat-phrases.json';
import phraseIndexRaw from '@/data/mutashabihat-verse-index.json';
import surahInfoRaw from '@/data/surah-info.json';
import topicsRaw from '@/data/topics-index.json';
import verseTopicsRaw from '@/data/verse-topics-index.json';
import type {
  RelatedAyah,
  RepeatedPhrase,
  SimilarPair,
  SurahOverview,
  ThemeEntry,
  TopicEntry,
} from './types';

const themes = themesRaw as ThemeEntry[];
const matching = matchingRaw as Record<string, RelatedAyah[]>;
const pairs = pairsRaw as SimilarPair[];
const phrases = phrasesRaw as Record<string, Omit<RepeatedPhrase, 'id'>>;
const phraseIndex = phraseIndexRaw as Record<string, number[]>;
const surahInfo = surahInfoRaw as Record<string, SurahOverview>;
const topics = topicsRaw as TopicEntry[];
const verseTopics = verseTopicsRaw as Record<string, number[]>;
const topicById = new Map(topics.map(topic => [topic.id, topic]));

export const INSIGHTS_REVIEW_NOTICE =
  'Theme labels, topic links, and textual-similarity groupings are derived reference aids awaiting qualified editorial review. They are not tafsir or religious rulings.';

export function getSurahOverview(surah: number): SurahOverview | null {
  return surahInfo[String(surah)] ?? null;
}

export function getSurahThemes(surah: number): ThemeEntry[] {
  const seen = new Set<string>();
  return themes.filter(theme => {
    if (theme.surah !== surah) return false;
    const key = `${theme.from}:${theme.to}:${theme.theme}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getThemeForAyah(surah: number, ayah: number): ThemeEntry | null {
  return themes.find(theme => theme.surah === surah && ayah >= theme.from && ayah <= theme.to) ?? null;
}

export function getTopicsForAyah(reference: string): TopicEntry[] {
  return (verseTopics[reference] ?? [])
    .map(id => topicById.get(id))
    .filter((topic): topic is TopicEntry => Boolean(topic));
}

export function getRelatedAyahs(reference: string, limit = 5): RelatedAyah[] {
  return [...(matching[reference] ?? [])]
    .filter(item => item.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}

export function getRepeatedPhrases(reference: string, limit = 3): RepeatedPhrase[] {
  return (phraseIndex[reference] ?? [])
    .map(id => {
      const phrase = phrases[String(id)];
      return phrase ? { id: String(id), ...phrase } : null;
    })
    .filter((phrase): phrase is RepeatedPhrase => Boolean(phrase))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(0, limit));
}

export function getPracticePairs(limit = 12): SimilarPair[] {
  const used = new Set<string>();
  const selected: SimilarPair[] = [];
  for (const pair of [...pairs].sort((a, b) => b.score - a.score)) {
    if (pair.score >= 100 || pair.score < 80 || pair.matchWordsInB.length < 2) continue;
    if (used.has(pair.verseA) || used.has(pair.verseB)) continue;
    selected.push(pair);
    used.add(pair.verseA);
    used.add(pair.verseB);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function insightCounts() {
  return {
    themeRanges: getSurahThemesCount(),
    relatedReferences: Object.keys(matching).length,
    similarPairs: pairs.length,
  };
}

function getSurahThemesCount(): number {
  return new Set(themes.map(theme => `${theme.surah}:${theme.from}:${theme.to}:${theme.theme}`)).size;
}
