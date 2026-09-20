"use client";

import { useState, useEffect, useRef } from "react";
import { CreditCard, Mail, Sparkles, Shield, ArrowUpRight, Volume2, VolumeX, Flame } from "lucide-react";
import Link from "next/link";

const FOOTER_VIDEOS = [
  {
    src: "/Create_a_premium_viral_Gen_Z.mp4",
    title: "ZEBALPHA ORIGINAL FILM",
    subtitle: "GEN Z STREETWEAR 2026",
  },
  {
    src: "/create_best_ad_video_best_the.mp4",
    title: "EXCLUSIVE CAMPAIGN DROP",
    subtitle: "FLAT 50% OFF ON ESSENTIALS",
  }
];

export function Footer() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-cycle background videos every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % FOOTER_VIDEOS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Update video src and play when currentVideoIndex changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIndex]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    setIsMuted(nextMuted);
  };

  const currentMeta = FOOTER_VIDEOS[currentVideoIndex];

  return (
    <footer className="relative overflow-hidden border-t border-neutral-800/80 bg-black text-white selection:bg-white selection:text-black min-h-[460px]">
      
      {/* Background Video Player */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <video
          ref={videoRef}
          src={currentMeta.src}
          autoPlay
          muted={isMuted}
          loop
          playsInline
          className="w-full h-full object-cover object-center filter brightness-[0.40] saturate-110 transition-opacity duration-1000"
        />
        {/* Cinematic Dark Gradient Overlays for High-Contrast Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/75 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/40" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pt-12 pb-6 sm:px-6 lg:px-8">
        
        {/* Top Campaign & Audio Badge Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 text-white font-black text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider shadow-lg backdrop-blur-md">
              <Flame className="w-3 h-3 fill-white" />
              {currentMeta.title}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-black/60 border border-white/20 text-neutral-300 font-bold text-[9px] sm:text-[10px] px-2.5 py-1 uppercase tracking-wider backdrop-blur-md">
              {currentMeta.subtitle}
            </span>
          </div>

          {/* Audio Control Toggle */}
          <button
            onClick={toggleMute}
            className="flex items-center gap-2 rounded-full bg-black/70 hover:bg-white hover:text-black text-white px-3.5 py-1.5 border border-white/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg text-xs font-bold uppercase tracking-wider"
            aria-label={isMuted ? "Unmute background video" : "Mute background video"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isMuted ? "Sound Off" : "Sound On"}</span>
          </button>
        </div>

        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Link href="/" className="inline-flex items-center gap-3 text-2xl font-black text-white tracking-[0.2em] uppercase group">
              <div className="relative h-10 w-10 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:scale-105 transition-transform">
                <img
                  src="/official-logo.png"
                  alt="ZEBALPHA Logo"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              ZEBALPHA
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-300 font-medium drop-shadow">
              Clothing crafted for those who move different. Timeless style, elevated in every stitch with 100% premium combed and Supima cottons.
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-2.5 max-w-md w-full text-neutral-200">
              <span className="flex items-center justify-center text-center rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-2.5 sm:px-3.5 py-2 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                ✦ 100% Premium Cotton
              </span>
              <span className="flex items-center justify-center text-center rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-2.5 sm:px-3.5 py-2 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                ✦ Relaxed Modern Fits
              </span>
              <span className="flex items-center justify-center text-center rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-2.5 sm:px-3.5 py-2 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                ✦ Express Shipping
              </span>
              <span className="flex items-center justify-center text-center rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-2.5 sm:px-3.5 py-2 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                ✦ Easy Returns
              </span>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] px-6 py-3 hover:bg-neutral-200 transition-all active:scale-95 shadow-xl"
              >
                <span>Shop The Drop</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-3">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white">Collections</h3>
            <ul className="mt-5 space-y-3.5 text-sm text-neutral-300 font-medium">
              <li><Link href="/products?category=Polos" className="transition hover:text-white">Premium Zip Polos</Link></li>
              <li><Link href="/products?category=T-Shirts" className="transition hover:text-white">Oversized Streetwear Tees</Link></li>
              <li><Link href="/products?category=Hoodies" className="transition hover:text-white">Heavyweight Hoodies</Link></li>
              <li><Link href="/products?category=Shirts" className="transition hover:text-white">Casual Collared Shirts</Link></li>
              <li><Link href="/products" className="transition hover:text-white">New Releases 2026</Link></li>
            </ul>
          </div>

          <div className="hidden lg:block lg:col-span-3">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white">Customer Support</h3>
            <ul className="mt-5 space-y-3.5 text-sm text-neutral-300 font-medium">
              <li><Link href="/wishlist" className="transition hover:text-white">Your Wishlist</Link></li>
              <li><Link href="/profile/orders" className="transition hover:text-white">Track Your Order</Link></li>
              <li><Link href="/about" className="transition hover:text-white">About Zebalpha</Link></li>
              <li><Link href="/contact" className="transition hover:text-white">Contact Us</Link></li>
              <li><Link href="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 pb-2 text-xs text-neutral-400 sm:flex sm:items-center sm:justify-between">
          <p>© 2026 ZEBALPHA APPAREL. All rights reserved. Clothing for the culture.</p>
          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            <Mail className="h-4 w-4 text-neutral-300" />
            <Link href="mailto:support@zebalpha.com" className="transition hover:text-white font-medium">
              support@zebalpha.com
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
