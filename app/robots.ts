import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: '*', allow: '/', disallow: ['/today', '/study', '/progress', '/settings', '/start', '/login', '/signup', '/forgot-password', '/auth/', '/account/', '/profile'] }, sitemap: `${process.env.SITE_URL || 'https://example.com'}/sitemap.xml` }; }
