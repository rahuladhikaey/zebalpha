"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { Star, Flame, Bell, CheckCircle2, Clock, Sparkles } from "lucide-react";

interface ComingSoonDesign {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  targetDropDate: string;
  category: string;
  initialRating: number;
  initialVotes: number;
  demandPercentage: number;
}

const DEFAULT_COMING_SOON_DESIGNS: ComingSoonDesign[] = [
  {
    id: "cs-1",
    name: "Apex Acid-Wash Oversized Hoodie",
    tagline: "380 GSM Heavyweight French Terry Fleece",
    description: "Custom vintage acid-wash finish with high-density minimalist chest branding, double-lined hood, and architectural drop-shoulder cut.",
    image: "/banner-casual-green.png",
    targetDropDate: "Releasing Sep 05, 2026",
    category: "Heavyweight Hoodies",
    initialRating: 4.9,
    initialVotes: 1420,
    demandPercentage: 98,
  },
  {
    id: "cs-2",
    name: "Supima Quarter-Zip Luxe Polo",
    tagline: "100% Long-Staple Supima Cotton Knit",
    description: "Tailored quarter-zip metal closure with custom engraved pulls, reinforced collar retention, and luxurious ultra-smooth handle.",
    image: "/banner-premium-polo.png",
    targetDropDate: "Releasing Sep 10, 2026",
    category: "Premium Polos",
    initialRating: 4.8,
    initialVotes: 980,
    demandPercentage: 94,
  },
  {
    id: "cs-3",
    name: "Cyberpunk Vintage Heavy Tee",
    tagline: "260 GSM Heavy Combed Cotton",
    description: "Relaxed boxy streetwear fit featuring vintage garment dye treatment and soft-touch screenprinted back graphics.",
    image: "/banner-retro-cream.png",
    targetDropDate: "Releasing Sep 15, 2026",
    category: "Oversized Tees",
    initialRating: 4.9,
    initialVotes: 1650,
    demandPercentage: 99,
  },
  {
    id: "cs-4",
    name: "Zebalpha Tactical Utility Cargo",
    tagline: "3D Double Pocket Twill Construction",
    description: "Heavy-duty 100% cotton twill cargo trousers with adjustable ankle toggles, reinforced knee panels, and 8 deep utility pockets.",
    image: "/banner-casual-green.png",
    targetDropDate: "Releasing Sep 22, 2026",
    category: "Bottoms & Cargo",
    initialRating: 4.7,
    initialVotes: 810,
    demandPercentage: 91,
  },
];

export default function NewDropsPage() {
  const [designs, setDesigns] = useState<ComingSoonDesign[]>(DEFAULT_COMING_SOON_DESIGNS);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [notifiedItems, setNotifiedItems] = useState<Record<string, boolean>>({});
  const [notificationMsg, setNotificationMsg] = useState<string>("");

  // Fetch coming soon products added by sellers from Supabase
  useEffect(() => {
    async function loadSellerComingSoonProducts() {
      try {
        const { data } = await supabase
          .from("products")
          .select("*")
          .or("status.eq.COMING_SOON,is_coming_soon.eq.true,is_new_drop.eq.true");

        if (data && data.length > 0) {
          const mappedFromDb: ComingSoonDesign[] = data.map((item: any, idx: number) => ({
            id: item.id?.toString() || `db-${idx}`,
            name: item.name,
            tagline: item.description ? item.description.slice(0, 50) + "..." : "Exclusive Upcoming Drop",
            description: item.description || "Upcoming premium design from seller store.",
            image: item.image_url || item.images?.[0] || "/banner-premium-polo.png",
            targetDropDate: "Releasing Soon ⚡",
            category: item.category_name || item.category || "Apparel Drop",
            initialRating: 4.9,
            initialVotes: 320 + idx * 45,
            demandPercentage: 95,
          }));

          // Combine static curated designs with seller added coming soon designs
          setDesigns((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const newFiltered = mappedFromDb.filter((d) => !existingIds.has(d.id));
            return [...newFiltered, ...prev];
          });
        }
      } catch (err) {
        console.error("Notice loading seller coming soon products:", err);
      }
    }
    loadSellerComingSoonProducts();
  }, []);

  const handleRate = (designId: string, ratingValue: number) => {
    setUserRatings((prev) => ({ ...prev, [designId]: ratingValue }));
    setDesigns((prev) =>
      prev.map((item) => {
        if (item.id === designId) {
          const currentTotal = item.initialRating * item.initialVotes;
          const newVotes = item.initialVotes + 1;
          const newAvg = (currentTotal + ratingValue) / newVotes;
          return {
            ...item,
            initialRating: Number(newAvg.toFixed(1)),
            initialVotes: newVotes,
          };
        }
        return item;
      })
    );
    setNotificationMsg(`⭐ Thank you for rating! Your vote has been added to customer hype scores.`);
    setTimeout(() => setNotificationMsg(""), 3500);
  };

  const handleNotifyMe = (designId: string, designName: string) => {
    setNotifiedItems((prev) => ({ ...prev, [designId]: true }));
    setNotificationMsg(`🔔 VIP Drop Notification Registered for "${designName}"! We'll alert you on launch.`);
    setTimeout(() => setNotificationMsg(""), 4000);
  };

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-950 via-black to-black px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_60%)] pointer-events-none" />
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col items-start gap-4 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.25em] text-emerald-400 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Upcoming Design Showcase • Customer Hype Base
            </span>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl uppercase">
              New Drops & Coming Soon
            </h1>
            <p className="text-base sm:text-lg font-medium text-zinc-400 leading-relaxed">
              Preview our upcoming exclusive designs before they hit the store. Rate your favorite pieces to influence drop production and register for launch alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Global Alert Notification Toast */}
      {notificationMsg && (
        <div className="sticky top-[72px] z-50 bg-emerald-950/90 border-b border-emerald-500/50 backdrop-blur-xl px-4 py-3 text-center text-xs font-black text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
          {notificationMsg}
        </div>
      )}

      {/* Main Grid Showcase */}
      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          {designs.map((item) => {
            const userRating = userRatings[item.id] || 0;
            const isNotified = notifiedItems[item.id] || false;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 md:p-8 shadow-2xl transition-all duration-500 hover:border-zinc-700"
              >
                {/* Top Target Date & Category */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
                    <Clock className="h-3 w-3" />
                    {item.targetDropDate}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    {item.category}
                  </span>
                </div>

                {/* Product Image Preview Showcase */}
                <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden bg-black border border-zinc-800/80 shadow-inner group">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {/* Floating Demand Pill */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white border border-white/20 backdrop-blur-md">
                    <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                    Demand Score: {item.demandPercentage}%
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-6 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                    {item.tagline}
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    {item.name}
                  </h3>
                  <p className="text-xs font-medium text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Customer Hype Rating & Voting System */}
                <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-amber-400">{item.initialRating}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(item.id, star)}
                            className="transition-transform hover:scale-125 focus:outline-none"
                            title={`Rate ${star} Stars`}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                (userRating || Math.floor(item.initialRating)) >= star
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-zinc-600"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {item.initialVotes.toLocaleString()} Hype Votes
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-400 font-medium italic">
                    {userRating > 0 ? `⭐ Your Rating: ${userRating} Stars (Recorded!)` : "Click stars above to vote your customer hype rating!"}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleNotifyMe(item.id, item.name)}
                    disabled={isNotified}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg ${
                      isNotified
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-default"
                        : "bg-white text-black hover:bg-neutral-200"
                    }`}
                  >
                    {isNotified ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Registered for Drop
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4" />
                        Notify Me on Launch
                      </>
                    )}
                  </button>

                  <Link
                    href="/products"
                    className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-3 px-4 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
                  >
                    Browse Live Store
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
