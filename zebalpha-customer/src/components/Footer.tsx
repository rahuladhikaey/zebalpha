"use client";

import { useState, useEffect, useRef } from "react";
import { CreditCard, Mail, Sparkles, Shield, ArrowUpRight, Volume2, VolumeX, Flame, Store } from "lucide-react";
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
    subtitle: "SIGNATURE STREETWEAR ESSENTIALS",
  }
];

export function Footer() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const footerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Lazy load video only when footer is near viewport (eliminates 4.2MB initial payload)
  useEffect(() => {
    if (!footerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-cycle background videos every 12 seconds
  useEffect(() => {
    if (!shouldLoadVideo) return;
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % FOOTER_VIDEOS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [shouldLoadVideo]);

  // Update video src and play when currentVideoIndex changes
  useEffect(() => {
    if (shouldLoadVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIndex, shouldLoadVideo]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    setIsMuted(nextMuted);
  };

  const currentMeta = FOOTER_VIDEOS[currentVideoIndex];

  return (
    <footer ref={footerRef} className="relative overflow-hidden border-t border-neutral-800/80 bg-black text-white selection:bg-white selection:text-black min-h-[480px]">
      
      {/* 1st Layer: Vivid Visible Background Video Player (Lazy-loaded) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0 bg-neutral-950">
        {shouldLoadVideo && (
          <video
            ref={videoRef}
            src={currentMeta.src}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover object-center filter brightness-90 saturate-115 transition-opacity duration-1000 opacity-90"
          >
            <track kind="captions" srcLang="en" label="English" />
          </video>
        )}
        {/* Subtle Semi-Transparent Overlay for Clear Contrast & Vivid Video Visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      </div>

      {/* 2nd Layer: Main Footer Writing & Content Over Video */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pt-12 pb-24 sm:pb-6 sm:px-6 lg:px-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
        
        {/* Top Campaign & Audio Badge Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/20 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 text-white font-black text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider shadow-xl backdrop-blur-md">
              <Flame className="w-3 h-3 fill-white" />
              {currentMeta.title}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-black/75 border border-white/30 text-white font-bold text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider backdrop-blur-md shadow-lg">
              {currentMeta.subtitle}
            </span>
          </div>

          {/* Audio Control Toggle */}
          <button
            onClick={toggleMute}
            className="flex items-center gap-2 rounded-full bg-black/80 hover:bg-white hover:text-black text-white px-4 py-2 border border-white/30 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-2xl text-xs font-black uppercase tracking-wider"
            aria-label={isMuted ? "Unmute background video" : "Mute background video"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-neutral-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? "Sound Off" : "Sound On"}</span>
          </button>
        </div>

        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Link href="/" className="inline-flex items-center gap-3 text-2xl font-black text-white tracking-[0.15em] uppercase group drop-shadow-md">
              <div className="relative h-10 w-10 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.25)] group-hover:scale-105 transition-transform">
                <img
                  src="/official-logo-sm.png"
                  alt="ZebAlpha Logo"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <div>
                <span>ZebAlpha</span>
                <span className="block text-[10px] font-bold tracking-widest text-emerald-400 normal-case">
                  Indian E-Commerce Marketplace
                </span>
              </div>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-200 font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Founded in Kolkata, West Bengal, ZebAlpha is focused on making online shopping and online selling more accessible, transparent, and trustworthy.
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-2.5 max-w-md w-full text-white">
              <span className="flex items-center justify-center text-center rounded-full border border-white/25 bg-black/75 backdrop-blur-md px-2.5 sm:px-3.5 py-2 font-black uppercase tracking-wider text-[10px] sm:text-xs shadow-lg">
                ✦ Kolkata, India
              </span>
              <span className="flex items-center justify-center text-center rounded-full border border-white/25 bg-black/75 backdrop-blur-md px-2.5 sm:px-3.5 py-2 font-black uppercase tracking-wider text-[10px] sm:text-xs shadow-lg">
                ✦ 0% Commission
              </span>
              <span className="flex items-center justify-center text-center rounded-full border border-white/25 bg-black/75 backdrop-blur-md px-2.5 sm:px-3.5 py-2 font-black uppercase tracking-wider text-[10px] sm:text-xs shadow-lg">
                ✦ Order Accuracy
              </span>
              <span className="flex items-center justify-center text-center rounded-full border border-white/25 bg-black/75 backdrop-blur-md px-2.5 sm:px-3.5 py-2 font-black uppercase tracking-wider text-[10px] sm:text-xs shadow-lg">
                ✦ Pan-India Delivery
              </span>
            </div>

          </div>

          {/* Desktop Only: Collections & Customer Support */}
          <div className="hidden lg:grid grid-cols-2 gap-10 lg:grid-cols-6 lg:col-span-6 w-full">
            <div className="col-span-1 lg:col-span-3">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white drop-shadow-md">Marketplace &amp; Shop</h3>
              <ul className="mt-5 space-y-3 text-sm text-neutral-100 font-bold drop-shadow">
                <li><Link href="/products" className="transition hover:text-white block">Shop All Products</Link></li>
                <li><Link href="/category/polos" className="transition hover:text-white block">Polo T-Shirts</Link></li>
                <li><Link href="/category/oversized-t-shirts" className="transition hover:text-white block">Oversized T-Shirts</Link></li>
                <li><Link href="/category/hoodies" className="transition hover:text-white block">Hoodies &amp; Sweatshirts</Link></li>
                <li><Link href="/blogs" className="transition hover:text-white block">ZebAlpha Blogs &amp; Guides</Link></li>
                <li><Link href="/about" className="transition hover:text-white block">About ZebAlpha</Link></li>
                <li><Link href="/seller" className="transition hover:text-white block">Sell on ZebAlpha (Seller Hub)</Link></li>
                <li className="pt-2">
                  <Link 
                    href="https://seller.zebalpha.shop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center justify-between sm:justify-start gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-transparent border border-emerald-400/35 hover:border-emerald-300 px-3.5 py-2 text-xs font-black tracking-wider text-emerald-300 hover:text-white hover:bg-emerald-500/30 transition-all shadow-[0_0_15px_rgba(52,211,153,0.15)] hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95 max-w-fit"
                    title="Seller Portal Login"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-black shadow-sm group-hover:scale-110 transition-transform">
                        <Store className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                      <span className="uppercase tracking-widest text-[11px] font-black whitespace-nowrap">Seller Portal Login</span>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-1 lg:col-span-3">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white drop-shadow-md">Customer &amp; Seller Support</h3>
              <ul className="mt-5 space-y-3 text-sm text-neutral-100 font-bold drop-shadow">
                <li><Link href="/contact" className="transition hover:text-white block">Contact Support Desk</Link></li>
                <li><Link href="/profile/orders" className="transition hover:text-white block">Track Your Order</Link></li>
                <li><Link href="/shipping-policy" className="transition hover:text-white block">Shipping &amp; Delivery Policy</Link></li>
                <li><Link href="/return-policy" className="transition hover:text-white block">Return &amp; Refund Policy</Link></li>
                <li><Link href="/seller" className="transition hover:text-white block">Seller Policy &amp; Terms</Link></li>
                <li><Link href="/help" className="transition hover:text-white block">Help &amp; FAQs</Link></li>
                <li><Link href="/privacy-policy" className="transition hover:text-white block">Privacy Policy</Link></li>
                <li><Link href="/terms-and-conditions" className="transition hover:text-white block">Terms &amp; Conditions</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/20 pt-6 pb-2 text-xs text-neutral-200 font-medium sm:flex sm:items-center sm:justify-between drop-shadow">
          <p>© 2026 ZebAlpha. All rights reserved. Indian E-Commerce Marketplace.</p>
          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            <Mail className="h-4 w-4 text-white" />
            <Link href="mailto:support@zebalpha.shop" className="transition hover:text-white font-bold">
              support@zebalpha.shop
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
