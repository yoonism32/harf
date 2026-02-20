import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Harf — Quranic Arabic Mastery',
    short_name: 'Harf',
    description: 'Master Quranic Arabic root words. Track your Quran comprehension percentage.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0b0f1a',
    theme_color: '#0b0f1a',
    lang: 'en',
    dir: 'ltr',
    categories: ['education', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Study Now',
        short_name: 'Study',
        description: 'Start a flashcard study session',
        url: '/study?source=shortcut',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Word Browser',
        short_name: 'Words',
        description: 'Browse all 300 Quranic root words',
        url: '/words?source=shortcut',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
