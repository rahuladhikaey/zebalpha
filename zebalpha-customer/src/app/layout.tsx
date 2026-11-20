import { Geist, Geist_Mono, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

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

export const metadata = {
  metadataBase: new URL("https://zebalpha.shop"),
  title: {
    default: "ZebAlpha | Indian E-Commerce Marketplace",
    template: "%s | ZebAlpha"
  },
  description: "ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Founded in Kolkata, West Bengal, ZebAlpha is focused on making online shopping and online selling more accessible, transparent, and trustworthy.",
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
  alternates: {
    canonical: "https://zebalpha.shop"
  },
  icons: {
    icon: "/official-logo.png",
    shortcut: "/official-logo.png",
    apple: "/official-logo.png",
  },
};

import { QueryProvider } from "@/providers/QueryProvider";
import { AppLaunchSplashController } from "@/components/AppLaunchSplashController";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="preload" as="image" href="/official-logo.png" fetchPriority="high" />

        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="lazyOnload">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-N8D7FHNT');
          `}
        </Script>
        {/* End Google Tag Manager */}

        {/* Consolidated Google Analytics (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-GL1GQW4EN3"
          strategy="lazyOnload"
        />
        <Script id="google-analytics-gtag" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-GL1GQW4EN3');
            gtag('config', 'G-5RNS8TDRG5');
          `}
        </Script>

        {/* Universal Brand Launch Splash + Android Zero-Flash Guard: Runs synchronously before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  var ua = navigator.userAgent || "";
                  var isWebViewUa = ua.indexOf("Android") !== -1 && ua.indexOf("Version/") !== -1 && ua.indexOf("Chrome/") === -1;
                  var isNative = !!(window.Capacitor || ua.indexOf("ZEBALPHA_ANDROID_APP") !== -1 || ua.indexOf("Capacitor") !== -1 || ua.indexOf("; wv") !== -1 || isWebViewUa || window.location.search.indexOf("view=app") !== -1);
                  if (isNative) {
                    root.classList.remove("dark");
                    root.classList.add("is-android-app", "zebalpha-app-hydrating");
                    root.style.backgroundColor = "#FCF9F2";
                    setTimeout(function() {
                      root.classList.remove("zebalpha-app-hydrating");
                    }, 2500);
                    var langDone = localStorage.getItem("zebalpha_onboarding_language_completed") === "true";
                    var guest = localStorage.getItem("zebalpha_onboarding_guest_mode") === "true";
                    var fullDone = localStorage.getItem("zebalpha_onboarding_completed") === "true";
                    if (!langDone || (!fullDone && !guest)) {
                      root.classList.add("zebalpha-onboarding-pending");
                    }
                  }

                  // Show official ZebAlpha logo launch splash once per app/browser session for all real users (Flipkart/Meesho style)
                  var isBot = /bot|crawl|spider|slurp|googlebot|bingbot|lighthouse|pagespeed|headlesschrome/i.test(ua) || !!navigator.webdriver;
                  var alreadyShown = false;
                  try {
                    alreadyShown = sessionStorage.getItem("zebalpha_launch_splash_shown") === "1";
                  } catch (storageErr) {}

                  if (!isBot && !alreadyShown) {
                    window.__zebalphaSplashStart = Date.now();
                    root.classList.add("zebalpha-splash-active");
                    // Hard failsafe so splash can never stall even on slow/offline JS hydration
                    window.__zebalphaSplashFallbackTimer = setTimeout(function() {
                      try { sessionStorage.setItem("zebalpha_launch_splash_shown", "1"); } catch (e) {}
                      root.classList.add("zebalpha-splash-exiting");
                      setTimeout(function() {
                        root.classList.remove("zebalpha-splash-active", "zebalpha-splash-exiting");
                      }, 460);
                    }, 2400);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full font-sans bg-black text-white overflow-x-hidden">
        {/* Universal Flipkart/Meesho-style Official Logo Launch Splash (0ms first-paint) */}
        <div
          id="zebalpha-instant-splash"
          role="presentation"
          aria-hidden="true"
          className="za-launch-splash"
        >
          <div className="za-splash-ambient" />

          <div className="za-splash-center">
            <div className="za-splash-logo-stage">
              <span className="za-splash-ripple za-splash-ripple-1" />
              <span className="za-splash-ripple za-splash-ripple-2" />
              <div className="za-splash-ring">
                <div className="za-splash-disc">
                  <img
                    src="/official-logo.png"
                    alt="ZebAlpha Official Logo"
                    width={112}
                    height={112}
                    decoding="sync"
                    fetchPriority="high"
                    className="za-splash-logo-img"
                  />
                </div>
              </div>
            </div>

            <div className="za-splash-brand">
              <span className="za-splash-wordmark">ZEBALPHA</span>
              <span className="za-splash-tagline-row">
                <span className="za-splash-rule" />
                <span className="za-splash-tagline">CLOTHING FOR THE CULTURE</span>
                <span className="za-splash-rule" />
              </span>
            </div>

            <div className="za-splash-progress-track">
              <div className="za-splash-progress-fill" />
            </div>
          </div>

          <div className="za-splash-footer">
            <span className="za-splash-footer-dot" />
            <span className="za-splash-footer-text">INDIA&apos;S CULTURE MARKETPLACE</span>
            <span className="za-splash-footer-dot" />
          </div>
        </div>

        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-N8D7FHNT"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        <QueryProvider>
          <AppLaunchSplashController />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
