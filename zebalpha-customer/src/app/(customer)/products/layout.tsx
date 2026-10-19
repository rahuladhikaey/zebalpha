import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Online on ZebAlpha | Products from Growing Sellers",
  description:
    "Discover and shop online on ZebAlpha. Explore a curated marketplace of products from eligible sellers, independent makers, and growing businesses across India.",
  alternates: {
    canonical: "https://zebalpha.shop/products",
  },
  openGraph: {
    title: "Shop Online on ZebAlpha | Products from Growing Sellers",
    description:
      "Discover and shop online on ZebAlpha. Explore a curated marketplace of products from eligible sellers, independent makers, and growing businesses across India.",
    url: "https://zebalpha.shop/products",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "Shop Online on ZebAlpha",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Online on ZebAlpha | Products from Growing Sellers",
    description:
      "Discover and shop online on ZebAlpha. Explore a curated marketplace of products from eligible sellers, independent makers, and growing businesses across India.",
    images: ["/official-logo.png"],
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
