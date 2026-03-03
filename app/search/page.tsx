import type { Metadata } from 'next';
import { QuranSearch } from '@/components/search/QuranSearch';

export const metadata: Metadata = {
  title: 'Search — Harf',
  description: 'Find Quran verses by typing them as you remember them, in any romanization style.',
};

export default function SearchPage() {
  return (
    <main className="min-h-screen py-8">
      <QuranSearch />
    </main>
  );
}
