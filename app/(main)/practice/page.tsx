import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PracticeHub } from '@/components/practice/PracticeHub';
import { Skeleton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Practice — Harf',
  description: 'Practice Quranic listening, word meanings, and root recognition without changing your review schedule.',
};

export default function PracticePage() {
  return <Suspense fallback={<Skeleton height={360} label="Loading practice" />}><PracticeHub /></Suspense>;
}
