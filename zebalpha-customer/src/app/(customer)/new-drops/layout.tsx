import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Season Streetwear Drops & Latest Arrivals | ZebAlpha India",
  description:
    "Explore limited-edition streetwear drops, fresh 240 GSM oversized tees, zip polos, and graphic arrivals on ZebAlpha. Flat ₹100 OFF on your 1st order (₹399+) with COD & Pan-India shipping.",
  alternates: {
    canonical: "https://zebalpha.shop/new-drops",
  },
  keywords: [
    "ZebAlpha new drops",
    "streetwear drops India",
    "new oversized t-shirt arrivals",
    "latest graphic tees India",
    "ZebAlpha latest collection",
  ],
  openGraph: {
    title: "New Season Drops | ZebAlpha Streetwear India",
    description:
      "Shop the latest limited-run ZebAlpha drops. Heavyweight cotton oversized tees, polos & hoodies with Flat ₹100 OFF on 1st order.",
    url: "https://zebalpha.shop/new-drops",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/official-logo.png", width: 1200, height: 630, alt: "ZebAlpha New Season Drops" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "New Season Drops | ZebAlpha India",
    description: "Fresh streetwear arrivals and limited drops from ZebAlpha India.",
    images: ["/official-logo.png"],
  },
};

export default function NewDropsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
