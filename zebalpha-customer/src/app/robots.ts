import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zebalpha.shop';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/seller-dashboard/',
          '/profile/',
          '/account/',
          '/checkout/',
          '/cart/',
          '/orders/',
          '/notifications/',
          '/login/',
          '/signup/',
          '/api/',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'PerplexityBot',
          'Google-Extended',
          'Applebot-Extended',
          'Googlebot',
          'Bingbot',
        ],
        allow: '/',
        disallow: [
          '/admin/',
          '/seller-dashboard/',
          '/profile/',
          '/account/',
          '/checkout/',
          '/cart/',
          '/orders/',
          '/notifications/',
          '/login/',
          '/signup/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
