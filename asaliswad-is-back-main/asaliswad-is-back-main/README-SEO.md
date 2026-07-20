# Asali Swad - SEO & Google Ranking Optimization Guide

This guide outlines the essential steps and best practices to improve the Search Engine Optimization (SEO) and Google Ranking for the Asali Swad e-commerce platform built with Next.js.

## 1. Next.js Metadata API (Page Titles & Descriptions)

Next.js has a built-in Metadata API that allows you to define SEO tags for each page. This is crucial for search engines to understand the content of your pages.

### Global Metadata (in `src/app/layout.tsx`)

Set up a strong default metadata configuration in your root layout.

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Asali Swad | Authentic Indian Sweets & Snacks',
    template: '%s | Asali Swad', // E.g., 'Checkout | Asali Swad'
  },
  description: 'Discover the authentic taste of Indian sweets, namkeen, and premium dry fruits delivered straight to your door.',
  keywords: ['indian sweets', 'namkeen', 'dry fruits', 'asali swad', 'buy sweets online'],
  openGraph: {
    title: 'Asali Swad | Authentic Indian Sweets & Snacks',
    description: 'Discover the authentic taste of Indian sweets, namkeen, and premium dry fruits.',
    url: 'https://asaliswad-android.onrender.com',
    siteName: 'Asali Swad',
    images: [
      {
        url: 'https://asaliswad-android.onrender.com/og-image.jpg', // Add a high-quality 1200x630 image to your public folder
        width: 1200,
        height: 630,
        alt: 'Asali Swad Products',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
};
```

### Page-Specific Metadata (e.g., Product Pages)

For dynamic pages like product details, generate metadata dynamically.

```tsx
// src/app/product/[id]/page.tsx
import { Metadata } from 'next';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProductById(params.id); // Replace with your fetch logic

  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: [product.imageUrl],
    },
  };
}
```

## 2. Dynamic Sitemap (`sitemap.ts`)

A sitemap tells search engines exactly which pages exist on your site. Next.js App Router makes it easy to generate an XML sitemap dynamically.

Create a file at `src/app/sitemap.ts`:

```typescript
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch dynamic routes like products or categories
  // const products = await fetchProducts();
  
  // const productUrls = products.map((product) => ({
  //   url: `https://asaliswad-android.onrender.com/product/${product.id}`,
  //   lastModified: new Date(product.updatedAt),
  // }));

  return [
    {
      url: 'https://asaliswad-android.onrender.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://asaliswad-android.onrender.com/cart',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // ...productUrls
  ];
}
```

## 3. Robots.txt (`robots.txt.ts` or `robots.txt`)

Instruct search engine bots on what they can and cannot crawl.

Create a file at `src/app/robots.ts`:

```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/checkout/'], // Hide private/admin pages from search engines
    },
    sitemap: 'https://asaliswad-android.onrender.com/sitemap.xml',
  };
}
```

## 4. Structured Data (JSON-LD)

Structured data (Schema.org) helps Google understand specific entities on your page, like Products. This is how you get "Rich Snippets" (star ratings, prices shown directly in Google search results).

Add this to your Product page (`src/app/product/[id]/page.tsx`):

```tsx
export default function ProductPage({ params }) {
  const product = /* fetch product data */;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: 'Asali Swad',
    },
    offers: {
      '@type': 'Offer',
      url: `https://asaliswad-android.onrender.com/product/${product.id}`,
      priceCurrency: 'INR',
      price: product.price,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <section>
      {/* Inject JSON-LD safely into the <head> */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Rest of your product UI */}
    </section>
  );
}
```

## 5. Image Optimization

Slow images hurt SEO. Google ranks faster sites higher (Core Web Vitals).

- **Always use `next/image`:** Instead of standard `<img>` tags, use `<Image />` from `next/image`. It automatically provides WebP conversion, lazy loading, and responsive sizing.
- **Always provide `alt` tags:** Every image must have a descriptive `alt` attribute. This is vital for accessibility and image search SEO.

```tsx
import Image from 'next/image';

<Image
  src="/products/ladoo.jpg"
  alt="Fresh Motichoor Ladoo in a box" // Highly descriptive!
  width={500}
  height={500}
/>
```

## 6. Semantic HTML

Ensure your HTML structure makes sense.
- Use only **one `<h1>` tag** per page (usually the product name or page title).
- Use `<h2>`, `<h3>` for sub-sections.
- Use `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, and `<footer>` tags instead of generic `<div>` tags where appropriate.

## 7. Performance (Core Web Vitals)

Google measures three main metrics for ranking:
1. **LCP (Largest Contentful Paint):** How fast the main content loads. Optimize images and use server components.
2. **FID (First Input Delay) / INP (Interaction to Next Paint):** How fast the page responds to clicks. Keep JavaScript bundles small.
3. **CLS (Cumulative Layout Shift):** Prevent elements from jumping around as they load. Provide explicit width/height for images and avoid dynamic elements pushing content down.

## Next Steps for You:
1. **Create an `og-image.jpg`** (1200x630px) and put it in the `public/` folder for social sharing previews.
2. Register your site with **Google Search Console** and submit your `sitemap.xml`.
3. Set up **Google Analytics** to track your traffic.
