import type { Metadata } from 'next';
import surahMetaRaw from '@/data/quran-surah-meta.json';
import { VersePageClient } from './VersePageClient';

interface SurahMeta { id: number; name: string; arabic: string; verses: number; }
const surahMeta = surahMetaRaw as SurahMeta[];

export async function generateMetadata(
  { params }: { params: Promise<{ surah: string; ayah: string }> }
): Promise<Metadata> {
  const { surah, ayah } = await params;
  const s = parseInt(surah, 10);
  const meta = surahMeta[s - 1];
  if (!meta) return { title: 'Verse Not Found' };

  return {
    title: `${meta.name} ${surah}:${ayah} (${meta.arabic})`,
    description: `Read and listen to verse ${surah}:${ayah} from Surah ${meta.name} (${meta.arabic}). Includes word-by-word translation, audio recitation, and Tafsir Ibn Kathir.`,
  };
}

export default async function VersePage(
  { params }: { params: Promise<{ surah: string; ayah: string }> }
) {
  const { surah, ayah } = await params;
  return <VersePageClient surah={surah} ayah={ayah} />;
}
