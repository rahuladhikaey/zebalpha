import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.asaliswad.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/checkout/'], // Protect private routes from indexing
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
