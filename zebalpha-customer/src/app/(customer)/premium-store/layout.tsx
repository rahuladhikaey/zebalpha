import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZebAlpha Premium Store — Heavyweight Luxury Streetwear India",
  description:
    "Shop ZebAlpha's signature premium tier: 240–280 GSM combed cotton oversized tees, 350+ GSM fleece hoodies, and metallic zip polos crafted for lasting comfort and structure.",
  alternates: {
    canonical: "https://zebalpha.shop/premium-store",
  },
  openGraph: {
    title: "ZebAlpha Premium Store",
    description: "Heavyweight combed cotton streetwear and luxury drops on ZebAlpha India.",
    url: "https://zebalpha.shop/premium-store",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/official-logo.png", width: 1200, height: 630, alt: "ZebAlpha Premium Store" }],
  },
};

export default function PremiumStoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
