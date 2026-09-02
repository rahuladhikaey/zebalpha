import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import dynamic from "next/dynamic";

const Footer = dynamic(() => import("@/components/Footer").then(mod => mod.Footer), {
  ssr: true,
});

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
  metadataBase: new URL("https://www.zeb-alpha.in"),
  title: {
    default: "ZEB-ALPHA | Premium 2D Animated Clothing, Polos & Streetwear",
    template: "%s | ZEB-ALPHA",
  },
  description:
    "Discover Zeb-alpha premium clothing and streetwear. Shop 100% combed cotton polos, oversized tees, hoodies and smart casuals with express pan-India shipping.",
  keywords: [
    "zeb-alpha",
    "zeb alpha",
    "polo t-shirts",
    "men polo",
    "streetwear",
    "oversized t-shirts",
    "premium cotton clothing",
    "designer apparel",
    "buy clothing online",
  ],
  authors: [{ name: "ZEB-ALPHA", url: "https://www.zeb-alpha.in" }],
  creator: "ZEB-ALPHA",
  publisher: "ZEB-ALPHA",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "ZEB-ALPHA | Clothing For The Culture",
    description:
      "Timeless style, elevated in every stitch. Discover premium polos, casuals, and limited drops.",
    url: "https://www.zeb-alpha.in",
    siteName: "ZEB-ALPHA",
    images: [
      {
        url: "/banner-premium-polo.png",
        width: 1200,
        height: 630,
        alt: "ZEB-ALPHA - Clothing For The Culture",
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
    title: "ZEB-ALPHA | Premium Apparel & Streetwear",
    description:
      "Discover ZEB-ALPHA premium clothing and streetwear. Shop 100% combed cotton polos, oversized tees, hoodies and smart casuals.",
    images: ["/official-logo.png"],
    creator: "@zebalpha",
  },
  verification: {
    google: "TAknRBZUPWnyRbr7Xq_mshbItDHWA_-hfstnJZn7Vvk",
  },
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    title: "ZEBALPHA",
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
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-5RNS8TDRG5"
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-5RNS8TDRG5');
        `}
      </Script>
      <Script id="schema-organization" type="application/ld+json" strategy="afterInteractive">
        {`
          {
            "@context": "https://schema.org",
            "@type": ["Organization", "Store"],
            "name": "ZEBALPHA",
            "alternateName": ["Zebalpha", "ZEBALPHA Clothing", "Zebalpha Apparel"],
            "url": "https://www.zebalpha.com",
            "logo": "https://www.zebalpha.com/icon.png",
            "image": "https://www.zebalpha.com/banner-premium-polo.png",
            "description": "Premium brand offering authentic luxury 2D animated streetwear, polo t-shirts, oversized tees, and designer apparel.",
            "sameAs": [
              "https://www.instagram.com/zebalpha.clothing"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "areaServed": "IN",
              "availableLanguage": ["en", "hi"]
            }
          }
        `}
      </Script>
      <Providers>
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <ClientAssistant />
      </Providers>
    </>
  );
}

