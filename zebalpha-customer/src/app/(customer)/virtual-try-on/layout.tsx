import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Virtual Try-On (Launching 07/07/2027) | ZebAlpha",
  description:
    "ZebAlpha AI Virtual Try-On is launching on 07/07/2027. Preview exact garment drape, oversized fits, and streetwear looks on your avatar before ordering.",
  alternates: {
    canonical: "https://zebalpha.shop/virtual-try-on",
  },
  openGraph: {
    title: "ZebAlpha AI Virtual Try-On — Launching 07/07/2027",
    description: "Next-generation AI fitting room by ZebAlpha launching 07/07/2027.",
    url: "https://zebalpha.shop/virtual-try-on",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/official-logo.png", width: 1200, height: 630, alt: "ZebAlpha Virtual Try-On" }],
  },
};

export default function VirtualTryOnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
