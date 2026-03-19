import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import wordsData from '@/data/words.json';
import { WordDetailClient } from './WordDetailClient';

interface WordEntry {
  id: string;
  root: string;
  arabic: string;
  transliteration: string;
  meanings: string[];
  frequency: number;
  coverage_weight: number;
}

const wordsMap = Object.fromEntries(
  (wordsData as WordEntry[]).map(w => [w.id, w])
);

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const word = wordsMap[id];
  if (!word) return { title: 'Word Not Found' };

  const primaryMeanings = word.meanings.slice(0, 2).join(', ');
  return {
    title: `${word.transliteration} (${word.arabic}) — ${primaryMeanings}`,
    description: `Learn the Quranic Arabic root ${word.root}. "${word.transliteration}" (${word.arabic}) appears ${word.frequency} times in the Quran and covers ${(word.coverage_weight * 100).toFixed(2)}% of its words.`,
  };
}

export default async function WordDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!wordsMap[id]) notFound();
  return <WordDetailClient id={id} />;
}
