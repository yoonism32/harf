import type { MetadataRoute } from 'next';
import wordsData from '@/data/words.json';

const words = wordsData as Array<{ id: string }>;

export default function sitemap(): MetadataRoute.Sitemap {
  const wordUrls = words.map(w => ({
    url: `https://harf.app/word/${w.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    { url: 'https://harf.app', lastModified: new Date(), priority: 1.0 },
    { url: 'https://harf.app/study', lastModified: new Date(), priority: 0.9 },
    { url: 'https://harf.app/words', lastModified: new Date(), priority: 0.8 },
    { url: 'https://harf.app/coverage', lastModified: new Date(), priority: 0.7 },
    { url: 'https://harf.app/names', lastModified: new Date(), priority: 0.7 },
    { url: 'https://harf.app/search', lastModified: new Date(), priority: 0.8 },
    { url: 'https://harf.app/tadabbur', lastModified: new Date(), priority: 0.8 },
    { url: 'https://harf.app/mutashabihat', lastModified: new Date(), priority: 0.7 },
    ...wordUrls,
  ];
}
