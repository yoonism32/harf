export interface ThemeEntry {
  theme: string;
  surah: number;
  from: number;
  to: number;
  keywords: string;
  count: number;
}

export interface TopicEntry {
  id: number;
  name: string;
  ar: string;
  parent: number | null;
  thematic: boolean;
  ontology: boolean;
  ayahs: string[];
}

export interface RelatedAyah {
  matched_ayah_key: string;
  matched_words_count: number;
  coverage: number;
  score: number;
  match_words: number[][];
}

export interface RepeatedPhrase {
  id: string;
  surahs: number;
  ayahs: number;
  count: number;
  source: { key: string; from: number; to: number };
  ayah: Record<string, number[][]>;
}

export interface SurahOverview {
  id: number;
  name: string;
  nameArabic: string;
  translation: string;
  verses: number;
  revelationPlace: string;
  chronologicalOrder: number;
  juz: number[];
  summary: string;
}

export interface SimilarPair {
  id: string;
  verseA: string;
  verseB: string;
  score: number;
  matchWordsInB: number[][];
}
