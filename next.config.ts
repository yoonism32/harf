import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-XSS-Protection',          value: '1; mode=block' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // Allow geolocation for prayer times; block everything else
    value: 'geolocation=(self), camera=(), microphone=(), payment=()',
  },
  {
    key: 'Content-Security-Policy',
    // Next.js requires unsafe-inline/unsafe-eval for hydration scripts.
    // Fonts served locally by next/font (no external font CDN needed).
    // External API calls: cdn.jsdelivr.net (Quran data) + aladhan.com (prayer times).
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://cdn.jsdelivr.net https://api.aladhan.com",
      "media-src 'self' https://audios.quranwbw.com https://everyayah.com",
      "worker-src blob:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
