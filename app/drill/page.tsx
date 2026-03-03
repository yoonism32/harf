import type { Metadata } from 'next';
import { ListeningDrill } from '@/components/drill/ListeningDrill';

export const metadata: Metadata = {
  title: 'Listening Drill — Harf',
  description: 'Hear a Quran verse recitation and identify which verse it is.',
};

export default function DrillPage() {
  return (
    <main className="min-h-screen py-8">
      <ListeningDrill />
    </main>
  );
}
