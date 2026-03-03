import type { Metadata } from 'next';
import { MorphologyQuiz } from '@/components/quiz/MorphologyQuiz';

export const metadata: Metadata = {
  title: 'Morphology Quiz — Harf',
  description: 'Test your knowledge of Quranic root words and their meanings.',
};

export default function QuizPage() {
  return (
    <main className="min-h-screen py-8">
      <MorphologyQuiz />
    </main>
  );
}
