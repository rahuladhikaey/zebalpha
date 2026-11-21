import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom T-Shirt Printing Online India | ZebAlpha Custom Studio",
  description:
    "Design your own 240 GSM oversized t-shirt, classic cotton tee, heavyweight hoodie, or canvas tote bag online in India. Instant mockup preview, background remover, COD & Pan-India delivery on ZebAlpha Custom Studio.",
  alternates: {
    canonical: "https://zebalpha.shop/customize",
  },
  keywords: [
    "custom t-shirt printing India",
    "ZebAlpha Custom Studio",
    "design oversized t-shirt online India",
    "240 GSM custom t-shirt",
    "custom printed hoodie India",
    "custom tote bag printing Kolkata",
    "print your own t-shirt online India",
    "ZebAlpha custom print",
  ],
  openGraph: {
    title: "Custom T-Shirt & Hoodie Print Studio | ZebAlpha India",
    description:
      "Upload your artwork, remove background in 1 click, preview on real 240 GSM oversized tees & hoodies, and order with COD or UPI across India.",
    url: "https://zebalpha.shop/customize",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "ZebAlpha Custom T-Shirt Print Studio India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom T-Shirt Printing Online India | ZebAlpha Custom Studio",
    description:
      "Design custom 240 GSM oversized t-shirts, hoodies & tote bags with instant preview and Pan-India delivery.",
    images: ["/official-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
  },
};

const customStudioSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "ZebAlpha Custom Print Studio",
      "url": "https://zebalpha.shop/customize",
      "applicationCategory": "DesignApplication",
      "operatingSystem": "Web, Android",
      "description":
        "Online custom apparel designer for printing custom graphics on 240 GSM oversized t-shirts, classic tees, heavyweight hoodies, and tote bags in India.",
      "offers": {
        "@type": "Offer",
        "price": "499",
        "priceCurrency": "INR",
        "availability": "https://schema.org/InStock",
      },
      "provider": {
        "@id": "https://zebalpha.shop/#organization",
      },
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://zebalpha.shop" },
        { "@type": "ListItem", "position": 2, "name": "Custom Studio", "item": "https://zebalpha.shop/customize" },
      ],
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I print my own custom design on a 240 GSM oversized t-shirt in India?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. ZebAlpha Custom Studio lets you upload your artwork, remove the background automatically, position it on the front or back of 240 GSM combed cotton oversized tees, classic tees, hoodies, or tote bags, and order with pan-India delivery.",
          },
        },
        {
          "@type": "Question",
          "name": "Is there any minimum order quantity for ZebAlpha Custom Studio?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No minimum order quantity is required. You can order even a single custom-printed t-shirt, hoodie, or tote bag across 19,000+ Indian PIN codes.",
          },
        },
      ],
    },
  ],
};

export default function CustomizeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(customStudioSchema) }}
      />
      {children}
    </>
  );
}
