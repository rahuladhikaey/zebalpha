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
  metadataBase: new URL("https://www.asaliswad.com"),
  title: {
    default: "Asali Swad | Authentic Indian Sweets, Namkeen & Dry Fruits",
    template: "%s | Asali Swad",
  },
  description:
    "Discover the authentic taste of Indian sweets, namkeen, and premium dry fruits. Shop fresh and pure grocery products at Asali Swad with fast delivery.",
  keywords: [
    "indian sweets",
    "namkeen",
    "dry fruits",
    "asali swad",
    "asli swad",
    "asaliswad",
    "asaliswad bori",
    "urad dal bori",
    "rochak asali swad",
    "buy sweets online",
    "premium grocery",
    "authentic indian snacks",
    "healthy dry fruits",
    "sweets home delivery",
    "indian grocery online",
  ],
  authors: [{ name: "Asali Swad", url: "https://www.asaliswad.com" }],
  creator: "Asali Swad",
  publisher: "Asali Swad",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Asali Swad | Authentic Indian Sweets & Snacks",
    description:
      "Discover the authentic taste of Indian sweets, namkeen, and premium dry fruits. Shop fresh and pure grocery products at Asali Swad with fast delivery.",
    url: "https://www.asaliswad.com",
    siteName: "Asali Swad",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Asali Swad - Authentic Indian Sweets and Snacks",
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
  twitter: {
    card: "summary_large_image",
    title: "Asali Swad | Authentic Indian Sweets & Snacks",
    description:
      "Discover the authentic taste of Indian sweets, namkeen, and premium dry fruits. Shop fresh and pure grocery products at Asali Swad.",
    images: ["/og-image.jpg"],
    creator: "@asaliswad",
  },
  verification: {
    google: "TAknRBZUPWnyRbr7Xq_mshbItDHWA_-hfstnJZn7Vvk",
  },
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    title: "Asali Swad",
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
            "name": "Asali Swad",
            "alternateName": ["Asli Swad", "Rochak Asali Swad", "Asali Swad Bori", "Asaliswad"],
            "url": "https://www.asaliswad.com",
            "logo": "https://www.asaliswad.com/og-image.jpg",
            "image": "https://www.asaliswad.com/og-image.jpg",
            "description": "Premium brand offering authentic Indian sweets, namkeen, dry fruits, bori, and urad dal bori delivered direct to your door.",
            "sameAs": [
              "https://www.facebook.com/asaliswad",
              "https://www.instagram.com/asaliswad",
              "https://twitter.com/asaliswad"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+91-9999999999",
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

