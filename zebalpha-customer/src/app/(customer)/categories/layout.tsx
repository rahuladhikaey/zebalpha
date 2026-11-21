import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop by Category — Oversized Tees, Polos, Hoodies & More | ZebAlpha",
  description:
    "Browse all ZebAlpha shopping categories: 240 GSM oversized t-shirts, textured zip polos, heavyweight hoodies, casual shirts, tote bags, and custom printed streetwear across India.",
  alternates: {
    canonical: "https://zebalpha.shop/categories",
  },
  openGraph: {
    title: "All Categories | ZebAlpha Indian E-Commerce Marketplace",
    description: "Explore curated streetwear and lifestyle categories on ZebAlpha India.",
    url: "https://zebalpha.shop/categories",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/official-logo.png", width: 1200, height: 630, alt: "ZebAlpha Categories" }],
  },
};

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
