import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curated Streetwear Collections | ZebAlpha India",
  description:
    "Discover curated apparel and lifestyle collections on ZebAlpha — heavyweight oversized graphic tees, minimalist solids, hoodies, and custom studio pieces delivered across India.",
  alternates: {
    canonical: "https://zebalpha.shop/collections",
  },
  openGraph: {
    title: "Curated Collections | ZebAlpha",
    description: "Shop curated Indian streetwear collections and independent brand drops on ZebAlpha.",
    url: "https://zebalpha.shop/collections",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/official-logo.png", width: 1200, height: 630, alt: "ZebAlpha Collections" }],
  },
};

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
