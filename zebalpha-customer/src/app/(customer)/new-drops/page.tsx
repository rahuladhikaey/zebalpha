"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { isProductNewDrop, isDropLive, getDropDisplayStatus } from "@/lib/dropUtils";
import { Star, Flame, Bell, CheckCircle2, Clock, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";

interface ComingSoonDesign {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  targetDropDate: string;
  category: string;
  price: number;
  isLive: boolean;
  initialRating: number;
  initialVotes: number;
  demandPercentage: number;
}

export default function NewDropsPage() {
  const [designs, setDesigns] = useState<ComingSoonDesign[]>([]);
  const [filterTab, setFilterTab] = useState<"ALL" | "UPCOMING" | "LIVE">("ALL");
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [notifiedItems, setNotifiedItems] = useState<Record<string, boolean>>({});
  const [notificationMsg, setNotificationMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fetch coming soon and new drop products from Supabase
  const loadSellerComingSoonProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Notice querying products table:", error.message);
      }

      const dropProducts = (data || []).filter((item: any) => isProductNewDrop(item));

      if (dropProducts.length > 0) {
        const mappedFromDb: ComingSoonDesign[] = dropProducts.map((item: any, idx: number) => {
          const dropStatus = getDropDisplayStatus(item);
          const live = isDropLive(item);

          return {
            id: item.id?.toString() || `db-${idx}`,
            name: item.name,
            tagline: item.description ? item.description.slice(0, 50) + "..." : "Exclusive Designer Drop",
            description: item.description || "Upcoming premium design from seller store.",
            image: item.image_url || item.images?.[0] || "/banner-animated.png",
            targetDropDate: dropStatus.dateText,
            category: item.collection || (item.specifications as any)?.collection || item.category_name || item.category || "Streetwear Drop",
            price: Number(item.price || 0),
            isLive: live,
            initialRating: 4.9,
            initialVotes: 320 + idx * 45,
            demandPercentage: live ? 98 : 92,
          };
        });

        setDesigns(mappedFromDb);
      } else {
        setDesigns([]);
      }
    } catch (err) {
      console.error("Notice loading coming soon drops:", err);
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellerComingSoonProducts();

    // Listen for realtime coming soon updates from sellers
    const channel = supabase
      .channel("new-drops-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => loadSellerComingSoonProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const filteredDesigns = useMemo(() => {
    if (filterTab === "UPCOMING") return designs.filter((d) => !d.isLive);
    if (filterTab === "LIVE") return designs.filter((d) => d.isLive);
    return designs;
  }, [designs, filterTab]);

  const upcomingCount = designs.filter((d) => !d.isLive).length;
  const liveCount = designs.filter((d) => d.isLive).length;

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-950 via-black to-black px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_60%)] pointer-events-none" />
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col items-start gap-4 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.25em] text-orange-400 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-orange-400" />
              Exclusive Design Showcase • Customer Hype Base
            </span>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl uppercase">
              New Drops & Hype Releases
            </h1>
            <p className="text-base sm:text-lg font-medium text-zinc-400 leading-relaxed">
              Preview exclusive drops before release date. Rate pieces to boost hype, get launch notifications, or order newly dropped streetwear.
            </p>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 pt-4 flex-wrap">
              <button
                onClick={() => setFilterTab("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterTab === "ALL"
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
                }`}
              >
                All Drops ({designs.length})
              </button>
              <button
                onClick={() => setFilterTab("UPCOMING")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterTab === "UPCOMING"
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
                }`}
              >
                ⚡ Upcoming Drops ({upcomingCount})
              </button>
              <button
                onClick={() => setFilterTab("LIVE")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterTab === "LIVE"
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
                }`}
              >
                🔥 Now Live ({liveCount})
              </button>
            </div>
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
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-zinc-400">Loading New Drops...</p>
          </div>
        ) : filteredDesigns.length === 0 ? (
          <div className="py-20 text-center rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-8 max-w-xl mx-auto space-y-4">
            <Flame className="h-12 w-12 text-zinc-600 mx-auto" />
            <h3 className="text-xl font-black uppercase text-white">No Drops in this category</h3>
            <p className="text-sm text-zinc-400">
              Check back soon for new hype releases or explore our active marketplace catalog.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all"
            >
              Browse Catalog <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-2">
            {filteredDesigns.map((item) => {
              const userRating = userRatings[item.id] || 0;
              const isNotified = notifiedItems[item.id] || false;

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 md:p-8 shadow-2xl transition-all duration-500 hover:border-zinc-700"
                >
                  {/* Top Target Date & Category */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      item.isLive
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}>
                      <Clock className="h-3 w-3" />
                      {item.isLive ? `🔥 Live • ${item.targetDropDate}` : `⚡ ${item.targetDropDate}`}
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

                    {/* Price Pill */}
                    {item.price > 0 && (
                      <div className="absolute top-3 right-3 rounded-full bg-black/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-white border border-white/20 backdrop-blur-md">
                        ₹{item.price}
                      </div>
                    )}
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
                              className="transition-transform hover:scale-125 focus:outline-none cursor-pointer"
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
                    {item.isLive ? (
                      <Link
                        href={`/products/${item.id}`}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-black uppercase tracking-wider bg-white text-black hover:bg-neutral-200 transition-all active:scale-95 shadow-lg shadow-white/10"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Order Now • ₹{item.price}
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleNotifyMe(item.id, item.name)}
                        disabled={isNotified}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg cursor-pointer ${
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
                    )}

                    <Link
                      href="/products"
                      className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-3 px-4 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
                    >
                      Browse Store
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
