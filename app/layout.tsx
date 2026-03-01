import type { Metadata, Viewport } from 'next';
import { Amiri, Amiri_Quran, Rubik } from 'next/font/google';
import './globals.css';
import { LayoutShell } from '@/components/LayoutShell';

// next/font preconnects to Google Fonts and generates font-face with display:swap automatically
const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-amiri',
  display: 'swap',
});

// Amiri Quran: extended variant with full Uthmanic Unicode (U+06D6–06ED annotation marks)
// Used for verse/ayah text so characters like إِسْرَٰٓءِيلَ render correctly
const amiriQuran = Amiri_Quran({
  subsets: ['arabic'],
  weight: ['400'],
  variable: '--font-amiri-quran',
  display: 'swap',
});

const rubik = Rubik({
  subsets: ['latin', 'arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rubik',
  display: 'swap',
});

// Viewport must be a separate export (Next.js 14+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0b0f1a',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://harf.app'),
  title: {
    default: 'حرف — Harf | Quranic Arabic Mastery',
    template: '%s | Harf',
  },
  description: 'Master Quranic Arabic root words. Track what percentage of the Quran you understand.',
  keywords: ['Quran', 'Arabic', 'vocabulary', 'learning', 'Islamic', 'SRS'],
  openGraph: {
    title: 'Harf — Quranic Arabic Mastery',
    description: 'Master Quranic Arabic root words and track your Quran comprehension.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Harf — Quranic Arabic Mastery',
    description: 'Master Quranic Arabic root words. Track what percentage of the Quran you understand.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      style={{ colorScheme: 'dark' }}
      className={`${amiri.variable} ${amiriQuran.variable} ${rubik.variable}`}
    >
      <head>
        {/* DNS-prefetch for CDN resources used at runtime */}
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="https://api.aladhan.com" />
        <link rel="dns-prefetch" href="https://everyayah.com" />
        <link rel="dns-prefetch" href="https://audios.quranwbw.com" />
        {/* Preconnect for primary CDN (Quran text data) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen" dir="ltr">
        <LayoutShell>{children}</LayoutShell>
        {/* Aria-live announcer for dynamic page updates */}
        <div
          id="aria-announcer"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      </body>
    </html>
  );
}
