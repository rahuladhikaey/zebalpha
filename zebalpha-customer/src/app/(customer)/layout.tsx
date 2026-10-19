import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import dynamic from "next/dynamic";

const ClientAssistant = dynamic(() => import("@/components/ClientAssistant"));

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zebalpha.shop"),
  title: {
    default: "ZebAlpha | Indian E-Commerce Marketplace",
    template: "%s | ZebAlpha",
  },
  description:
    "ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Founded in Kolkata, West Bengal, ZebAlpha is focused on making online shopping and online selling more accessible, transparent, and trustworthy.",
  keywords: [
    "ZebAlpha",
    "ZebAlpha ecommerce",
    "ZebAlpha India",
    "ZebAlpha marketplace",
    "ZebAlpha Kolkata",
    "ZebAlpha seller",
    "zebalpha.shop",
    "sell on ZebAlpha",
    "Indian e-commerce marketplace"
  ],
  authors: [{ name: "ZebAlpha", url: "https://zebalpha.shop" }],
  creator: "ZebAlpha",
  publisher: "ZebAlpha",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "ZebAlpha | Indian E-Commerce Marketplace",
    description:
      "ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Founded in Kolkata, West Bengal.",
    url: "https://zebalpha.shop",
    siteName: "ZebAlpha",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "ZebAlpha - Indian E-Commerce Marketplace",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/official-logo.png",
    shortcut: "/official-logo.png",
    apple: "/official-logo.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZebAlpha | Indian E-Commerce Marketplace",
    description:
      "ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Founded in Kolkata, West Bengal.",
    images: ["/official-logo.png"],
    creator: "@zebalpha",
  },
  verification: {
    google: "TAknRBZUPWnyRbr7Xq_mshbItDHWA_-hfstnJZn7Vvk",
  },
  alternates: {
    canonical: "https://zebalpha.shop",
  },
  appleWebApp: {
    title: "ZebAlpha",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = "width=device-width, initial-scale=1";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Providers>
        <div className="min-h-screen">
          {children}
        </div>
        <ClientAssistant />
      </Providers>
    </>
  );
}

