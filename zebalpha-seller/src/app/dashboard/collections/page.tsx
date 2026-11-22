"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import {
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Crown,
  Flame,
  ArrowRight,
  Package,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { isDropLive, getDropDisplayStatus } from "@/lib/dropUtils";

interface CategoryItem {
  id: string;
  name: string;
  title?: string;
  slug?: string;
  main_category: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  link_url?: string | null;
}

const INACTIVE_PRODUCT_STATUSES = new Set([
  "DELETED",
  "ARCHIVED",
  "BLOCKED",
  "SUSPENDED",
  "REJECTED",
  "DRAFT",
  "INACTIVE",
]);

function isLiveMarketplaceProduct(p: any): boolean {
  if (!p) return false;
  if (p.is_active === false) return false;
  if (p.is_approved === false) return false;
  const st = String(p.status || "").toUpperCase().trim();
  if (st && INACTIVE_PRODUCT_STATUSES.has(st)) return false;
  const appr = String(p.approval_status || "").toLowerCase().trim();
  if (appr === "rejected" || appr === "pending" || appr === "suspended") return false;
  return true;
}

function extractLinkUrlHint(linkUrl?: string | null): {
  categoryParam: string;
  searchParam: string;
  pathSlug: string;
} {
  if (!linkUrl || typeof linkUrl !== "string") {
    return { categoryParam: "", searchParam: "", pathSlug: "" };
  }
  try {
    const parsed = new URL(linkUrl, "https://zebalpha.shop");
    const categoryParam = (
      parsed.searchParams.get("category") ||
      parsed.searchParams.get("subcategory") ||
      parsed.searchParams.get("collection") ||
      ""
    )
      .toLowerCase()
      .trim();
    const searchParam = (
      parsed.searchParams.get("search") ||
      parsed.searchParams.get("q") ||
      ""
    )
      .toLowerCase()
      .trim();
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const pathSlug =
      pathParts[0] === "category" && pathParts[1]
        ? decodeURIComponent(pathParts[1]).toLowerCase().trim()
        : "";
    return { categoryParam, searchParam, pathSlug };
  } catch {
    return { categoryParam: "", searchParam: "", pathSlug: "" };
  }
}

function doesProductBelongToCollection(
  p: any,
  col: CategoryItem,
  catNameById: Map<string, string>
): boolean {
  const specs =
    typeof p.specifications === "string"
      ? (() => {
          try {
            return JSON.parse(p.specifications);
          } catch {
            return {};
          }
        })()
      : p.specifications || {};

  const pCatId = String(p.category_id || "").toLowerCase().trim();
  const pSubcatId = String(p.subcategory_id || specs.subcategory_id || "").toLowerCase().trim();
  const resolvedCatName = (
    p.category_name ||
    (p.categories && typeof p.categories === "object" ? p.categories.name : "") ||
    (pCatId ? catNameById.get(pCatId) : "") ||
    p.category ||
    specs.category ||
    ""
  )
    .toLowerCase()
    .trim();
  const resolvedSubcatName = (
    p.subcategory_name ||
    (pSubcatId ? catNameById.get(pSubcatId) : "") ||
    specs.subcategory_name ||
    specs.subcategory ||
    ""
  )
    .toLowerCase()
    .trim();

  const pName = String(p.name || "").toLowerCase();
  const pDesc = String(p.description || "").toLowerCase();
  const pColl = String(p.collection || specs.collection || "").toLowerCase().trim();
  const pBrand = String(p.brand || "").toLowerCase();
  const pType = String(specs.product_type || specs.type || "").toLowerCase();
  const combined = `${pName} ${resolvedCatName} ${resolvedSubcatName} ${pColl} ${pType} ${pBrand} ${pDesc}`;
  const titleAndCat = `${pName} ${resolvedCatName} ${resolvedSubcatName} ${pColl} ${pType}`;

  const rawTitle = (col.name || col.title || "").toLowerCase().trim();
  const rawSlug = (col.slug || "").toLowerCase().trim();
  const linkHints = extractLinkUrlHint(col.link_url);
  const target = [rawTitle, rawSlug.replace(/-/g, " "), linkHints.categoryParam.replace(/-/g, " "), linkHints.searchParam, linkHints.pathSlug.replace(/-/g, " ")]
    .filter(Boolean)
    .join(" ");

  // 1. Direct ID / slug / collection / link_url UUID matches
  const colIdLower = String(col.id || "").toLowerCase().trim();
  if (colIdLower && (pCatId === colIdLower || pSubcatId === colIdLower)) return true;
  if (linkHints.categoryParam && (pCatId === linkHints.categoryParam || pSubcatId === linkHints.categoryParam)) return true;
  if (pColl && (pColl === rawTitle || pColl === rawSlug || (linkHints.categoryParam && pColl === linkHints.categoryParam))) {
    return true;
  }
  if (resolvedCatName && (resolvedCatName === rawTitle || resolvedCatName === rawSlug.replace(/-/g, " "))) {
    return true;
  }
  if (resolvedSubcatName && (resolvedSubcatName === rawTitle || resolvedSubcatName === rawSlug.replace(/-/g, " "))) {
    return true;
  }

  // 2. Special storefront collection slugs
  if (rawSlug === "premium-store" || target.includes("premium store")) {
    return Boolean(p.is_premium || p.tier === "PREMIUM" || specs.is_premium === true || specs.is_premium === "true");
  }
  if (rawSlug === "new-drops" || target.includes("new drops")) {
    return Boolean(p.is_new_drop || p.status === "COMING_SOON" || specs.is_new_drop === true || specs.is_new_drop === "true");
  }

  // 3. Crocs & Clogs
  if (/\b(crocs?|clogs?)\b/i.test(target)) {
    return /\b(crocs?|clogs?)\b/i.test(combined);
  }

  // 4. T-Shirts & Tees (matches hyphenated "t-shirt", spaced "t shirt", "tshirt", "tee")
  if (/\b(t[\s-]?shirts?|tees?)\b/i.test(target)) {
    if (/\b(saree|sari|kurti|kurta|clog|crocs?|shoe|sneaker|tote|bag)\b/i.test(titleAndCat)) {
      return /\bt[\s-]?shirts?\b/i.test(pName);
    }
    return /\b(t[\s-]?shirts?|tees?)\b/i.test(titleAndCat) || (/\boversized\b/i.test(pName) && /\b(cotton|graphic|tee|t[\s-]?shirt)\b/i.test(pName));
  }

  // 5. Kurtis & Kurtas
  if (/\b(kurtis?|kurtas?|anarkali|salwar|churidar|chikankari|sharara)\b/i.test(target)) {
    return /\b(kurtis?|kurtas?|anarkali|salwar|churidar|chikankari|sharara|tunic)\b/i.test(combined);
  }

  // 6. Sarees & Blouses
  if (/\b(sarees?|saris?|blouse|lehenga|banarasi)\b/i.test(target)) {
    return /\b(sarees?|saris?|blouse|lehenga|banarasi|kanjivaram|jamdani|taant|tant|silk\s+saree|mall\s+cotton|mulmul)\b/i.test(combined);
  }

  // 7. Tote Bags & Bags
  if (/\b(tote|bags?|slings?|handbags?|backpacks?|purses?|clutches?)\b/i.test(target)) {
    return /\b(tote|bags?|slings?|handbags?|backpacks?|purses?|clutches?|pouch)\b/i.test(combined);
  }

  // 8. Shoes & Footwear (respects men's vs general footwear)
  if (/\b(shoes?|sneakers?|footwear|sandals?|boots?|slippers?|slides?|loafers?|heels?)\b/i.test(target)) {
    const isFootwear = /\b(shoes?|sneakers?|footwear|sandals?|boots?|slippers?|slides?|loafers?|heels?|clogs?|crocs?)\b/i.test(combined);
    if (!isFootwear) return false;
    if (/\bmen'?s?\b/i.test(rawTitle) && /\bwomen'?s?\b/i.test(titleAndCat) && !/\b(men|unisex)\b/i.test(titleAndCat)) {
      return false;
    }
    if (/\bshoes?\b/i.test(rawTitle) && !/\b(crocs?|clogs?)\b/i.test(rawTitle)) {
      // For "Men's Shoes", match shoes/sneakers/boots/loafers/footwear (exclude pure clogs unless also tagged shoe/footwear)
      return /\b(shoes?|sneakers?|boots?|loafers?|running|sports?\s+shoe|footwear)\b/i.test(titleAndCat);
    }
    return true;
  }

  // 9. Polos
  if (/\bpolos?\b/i.test(target)) {
    return /\bpolos?\b/i.test(combined);
  }

  // 10. Hoodies / Sweatshirts / Winterwear
  if (/\b(hoodies?|sweatshirts?|winterwear|jackets?|fleece|sweaters?)\b/i.test(target)) {
    return /\b(hoodies?|sweatshirts?|winterwear|jackets?|fleece|sweaters?|bomber)\b/i.test(combined);
  }

  // 11. Shirts (exclude T-shirts & Sweatshirts)
  if (/\bshirts?\b/i.test(target) && !/\bt[\s-]?shirts?\b/i.test(target)) {
    const stripped = titleAndCat.replace(/\bt[\s-]?shirts?\b|\bsweatshirts?\b/gi, " ");
    return /\b(shirts?|overshirts?)\b/i.test(stripped);
  }

  // 12. Dresses / Gowns
  if (/\b(dress(?:es)?|gowns?|frocks?|jumpsuits?|midi|maxi)\b/i.test(target)) {
    return /\b(dress(?:es)?|gowns?|frocks?|jumpsuits?|midi|maxi|one[\s-]?piece)\b/i.test(combined);
  }

  // 13. Bottoms / Jeans / Cargos / Joggers
  if (/\b(jeans?|denims?|cargos?|pants?|trousers?|joggers?|bottoms?|palazzo|leggings?)\b/i.test(target)) {
    return /\b(jeans?|denims?|cargos?|pants?|trousers?|joggers?|palazzo|leggings?)\b/i.test(titleAndCat);
  }

  // 14. Jewellery / Watches / Home Decor
  if (/\b(jewell?ery|earrings?|necklaces?|bangles?|bracelets?|jhumkas?)\b/i.test(target)) {
    return /\b(jewell?ery|earrings?|necklaces?|bangles?|bracelets?|jhumkas?|pendants?)\b/i.test(combined);
  }
  if (/\bwatch(?:es)?\b/i.test(target)) {
    return /\bwatch(?:es)?\b/i.test(combined);
  }
  if (/\b(decor|home\s+decor|lamps?|candles?|vase|showpiece)\b/i.test(target)) {
    return /\b(decor|lamps?|candles?|vase|showpiece|wall\s+art|cushion)\b/i.test(combined);
  }

  // 15. Generic keyword fallback for any future Admin-created collection
  const stopWords = new Set(["and", "the", "for", "with", "best", "all", "new", "collection", "collections", "store", "edit", "shop", "online", "wear"]);
  const words = rawTitle
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (words.length === 0) return false;
  return words.some((w) => {
    const stem = w.endsWith("s") && w.length >= 4 ? w.slice(0, -1) : w;
    return titleAndCat.includes(w) || titleAndCat.includes(stem);
  });
}

export default function SellerCollectionsPage() {
  const [activeTab, setActiveTab] = useState<"collections" | "new_drops" | "premium">("collections");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [liveStorefrontProducts, setLiveStorefrontProducts] = useState<any[]>([]);
  const [catNameMap, setCatNameMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const authHeaders: Record<string, string> = {};
      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      // 1. Fetch Curated Collections, Categories lookup, Seller profile, and Live Marketplace Products in parallel
      const [curatedRes, allCatsRes, liveProdsRes, sellerProfileRes] = await Promise.all([
        supabase
          .from("curated_collections")
          .select("id, title, slug, short_description, link_url, image_url, display_order, is_active, created_at")
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("categories")
          .select("id, name, slug, parent_id")
          .limit(300),
        supabase
          .from("products")
          .select("id, name, brand, category_id, subcategory_id, collection, description, status, is_active, is_approved, approval_status, is_premium, is_new_drop, tier, specifications, seller_id")
          .or("is_active.is.null,is_active.eq.true")
          .limit(400),
        user
          ? supabase
              .from("sellers")
              .select("id, user_id")
              .or(`user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.eq.${user.email.toLowerCase().trim()}` : ""}`)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (curatedRes.error) {
        console.warn("curated_collections fetch note:", curatedRes.error.message);
      }

      const nameLookup = new Map<string, string>();
      if (Array.isArray(allCatsRes.data)) {
        for (const c of allCatsRes.data as Array<{ id?: string; name?: string | null }>) {
          if (c.id && c.name) {
            nameLookup.set(String(c.id).toLowerCase(), String(c.name));
          }
        }
      }
      setCatNameMap(nameLookup);

      const list: CategoryItem[] = [];
      const seenTitles = new Set<string>();
      if (curatedRes.data && curatedRes.data.length > 0) {
        for (const c of curatedRes.data) {
          const title = (c.title || (c as any).name || "").trim();
          if (title) {
            const key = title.toLowerCase();
            if (!seenTitles.has(key)) {
              seenTitles.add(key);
              list.push({
                id: String(c.id),
                name: title,
                title,
                slug: c.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                main_category: "CURATED",
                image_url: c.image_url || null,
                description: c.short_description || null,
                sort_order: typeof c.display_order === "number" ? c.display_order : 0,
                is_active: c.is_active !== false,
                created_at: c.created_at,
                link_url: c.link_url || null,
              });
            }
          }
        }
      }
      setCategories(list);

      // 2. Fetch this seller's own products reliably (server API first to bypass RLS & match both user.id and seller.id)
      let myProds: any[] = [];
      if (user) {
        try {
          const apiRes = await fetch("/api/products", { headers: authHeaders, cache: "no-store" });
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson?.success && Array.isArray(apiJson.products)) {
              myProds = apiJson.products;
            }
          }
        } catch {
          // Fall back to direct Supabase query below
        }

        if (myProds.length === 0) {
          const sellerIds = [user.id];
          const resolvedSellerId = (sellerProfileRes as any)?.data?.id;
          if (resolvedSellerId && !sellerIds.includes(resolvedSellerId)) {
            sellerIds.push(resolvedSellerId);
          }
          const { data: pData } = await supabase
            .from("products")
            .select("*")
            .in("seller_id", sellerIds)
            .order("created_at", { ascending: false });
          myProds = pData || [];
        }
      }

      const activeMyProds = myProds.filter((p) => String(p.status || "").toUpperCase() !== "DELETED");
      setSellerProducts(activeMyProds);

      // Merge live storefront products + this seller's live products (deduped by id)
      let rawLive: any[] = Array.isArray(liveProdsRes.data) ? liveProdsRes.data : [];
      if (liveProdsRes.error || rawLive.length === 0) {
        const { data: fallbackLive } = await supabase
          .from("products")
          .select("*")
          .or("is_active.is.null,is_active.eq.true")
          .limit(400);
        if (Array.isArray(fallbackLive) && fallbackLive.length > 0) {
          rawLive = fallbackLive;
        }
      }
      const liveMap = new Map<string, any>();
      for (const p of rawLive) {
        if (isLiveMarketplaceProduct(p)) {
          liveMap.set(String(p.id), p);
        }
      }
      for (const p of activeMyProds) {
        if (isLiveMarketplaceProduct(p) && !liveMap.has(String(p.id))) {
          liveMap.set(String(p.id), p);
        }
      }
      setLiveStorefrontProducts(Array.from(liveMap.values()));
    } catch (err: any) {
      console.error("Failed to fetch collections and products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const channel = supabase
      .channel("seller-curated-collections-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curated_collections" },
        () => {
          loadAllData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Precompute collection match counts (both total live storefront & seller's own live products)
  const collectionStatsMap = useMemo(() => {
    const map = new Map<string, { liveCount: number; myCount: number }>();
    const myLiveProducts = sellerProducts.filter(isLiveMarketplaceProduct);

    for (const cat of categories) {
      const liveCount = liveStorefrontProducts.filter((p) =>
        doesProductBelongToCollection(p, cat, catNameMap)
      ).length;
      const myCount = myLiveProducts.filter((p) =>
        doesProductBelongToCollection(p, cat, catNameMap)
      ).length;
      map.set(cat.id, { liveCount: Math.max(liveCount, myCount), myCount });
    }
    return map;
  }, [categories, liveStorefrontProducts, sellerProducts, catNameMap]);

  // Filtered lists for tabs
  const newDropProducts = sellerProducts.filter(
    (p) => p.is_new_drop || p.status === "COMING_SOON" || (p.specifications as any)?.is_new_drop === "true"
  );
  const premiumProducts = sellerProducts.filter(
    (p) => p.is_premium || p.tier === "PREMIUM" || (p.specifications as any)?.is_premium === "true"
  );

  return (
    <div className="space-y-6 select-none">
      {/* 1. Page Header with Admin Authority Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[#FFF8DB] via-[#FFFDF8] to-[#FFF2EE] p-6 rounded-3xl border-[1.5px] border-[#DFBE6F] shadow-[0_12px_30px_rgba(166,124,28,0.1)] relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-[#14120F] uppercase">
              Curated Collections Catalogue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-white text-[#9A6503] border border-[#DFBE6F] uppercase flex items-center gap-1 shadow-sm">
              <ShieldCheck size={12} className="text-[#047857]" />
              <span>Admin Managed</span>
            </span>
          </div>
          <p className="text-xs text-[#5C4E35] max-w-2xl font-medium">
            Browse official store collections created and curated by Admin. Live product counts sync directly with approved listings on the ZEBALPHA storefront.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap relative z-10">
          <Link
            href="/dashboard/products"
            data-photo-overlay="true"
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:brightness-105 active:scale-95 shadow-[0_8px_20px_rgba(240,58,70,0.28)] cursor-pointer"
          >
            <Plus size={16} className="text-white" />
            <span>Add Product to Collection</span>
          </Link>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EAD296] pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("collections")}
          data-photo-overlay={activeTab === "collections" ? "true" : undefined}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "collections"
              ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-md font-extrabold"
              : "text-[#5C4E35] hover:text-[#14120F] hover:bg-[#FFF8DB]"
          }`}
        >
          <Layers size={14} className={activeTab === "collections" ? "text-white" : undefined} />
          <span>Curated Collections ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("new_drops")}
          data-photo-overlay={activeTab === "new_drops" ? "true" : undefined}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "new_drops"
              ? "bg-orange-500 text-white shadow-md font-extrabold"
              : "text-[#5C4E35] hover:text-[#14120F] hover:bg-[#FFF8DB]"
          }`}
        >
          <Flame size={14} className={activeTab === "new_drops" ? "text-white" : "text-orange-600"} />
          <span>⚡ Upcoming New Drops ({newDropProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("premium")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "premium"
              ? "bg-gradient-to-r from-[#FCE89C] to-[#EAB308] text-[#14120F] border border-[#DFBE6F] shadow-md font-extrabold"
              : "text-[#5C4E35] hover:text-[#14120F] hover:bg-[#FFF8DB]"
          }`}
        >
          <Crown size={14} className={activeTab === "premium" ? "text-[#14120F]" : "text-[#9A6503]"} />
          <span>💎 Premium Store Vault ({premiumProducts.length})</span>
        </button>
      </div>

      {/* 3. TAB 1: CURATED COLLECTIONS (Read-Only Catalogue) */}
      {activeTab === "collections" && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F0E2BE] border-t-[#F03A46]" />
              <span className="text-xs font-bold text-[#5C4E35]">Loading collection cards...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-3xl border border-[#EAD296] bg-white text-center">
              <div className="w-16 h-16 rounded-full bg-[#FFF8DB] flex items-center justify-center text-[#9A6503] mb-4 border border-[#DFBE6F]">
                <Sparkles size={28} />
              </div>
              <h3 className="text-base font-black text-[#14120F] uppercase">No Curated Collections Added Yet</h3>
              <p className="text-xs text-[#5C4E35] max-w-sm mt-1 mb-2">
                SuperAdmin has not added any collection categories yet. Check back soon for updated storefront sets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => {
                const stats = collectionStatsMap.get(cat.id) || { liveCount: 0, myCount: 0 };

                return (
                  <div
                    key={cat.id}
                    className={`group relative rounded-3xl border transition-all duration-300 p-5 flex flex-col justify-between ${
                      cat.is_active
                        ? "bg-white border-[#EAD296] hover:border-[#F03A46]/60 shadow-[0_10px_28px_rgba(166,124,28,0.08)] hover:shadow-[0_14px_32px_rgba(240,58,70,0.12)]"
                        : "bg-[#FFF9EB]/60 border-[#F0E2BE] opacity-65"
                    }`}
                  >
                    <div>
                      {/* Top Bar with Category & Active Status */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]">
                          {cat.main_category || "ALL"}
                        </span>
                        <span
                          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            cat.is_active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-[#EAD296] bg-[#FFF9EB] text-[#7A6847]"
                          }`}
                        >
                          {cat.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{cat.is_active ? "Live" : "Hidden"}</span>
                        </span>
                      </div>

                      {/* Card Preview Cover Image */}
                      <div className="relative w-full h-40 rounded-2xl bg-[#FFF9EB] border border-[#F0E2BE] overflow-hidden flex items-center justify-center mb-4">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-[#9A6503]">
                            <Sparkles size={24} />
                            <span className="text-[10px] uppercase tracking-wider font-bold">Default Cover</span>
                          </div>
                        )}
                      </div>

                      {/* Name & Description */}
                      <h3 className="text-sm font-black text-[#14120F] uppercase tracking-tight line-clamp-1">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-xs text-[#5C4E35] mt-1 line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Info & Quick Link */}
                    <div className="mt-5 pt-3 border-t border-[#F0E2BE] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            stats.liveCount > 0 ? "text-[#047857]" : "text-[#7A6847]"
                          }`}
                        >
                          <Package size={12} className="shrink-0" />
                          <span>
                            {stats.liveCount} {stats.liveCount === 1 ? "Product" : "Products"} Live
                          </span>
                        </span>
                        {stats.myCount > 0 && (
                          <span className="rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-1.5 py-0.5 text-[9px] font-black text-[#9A6503]">
                            {stats.myCount} Yours
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/dashboard/products?category=${encodeURIComponent(cat.name)}`}
                        className="text-[#F03A46] hover:text-[#DC2626] font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shrink-0"
                      >
                        <span>List Product</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 4. TAB 2: UPCOMING NEW DROPS */}
      {activeTab === "new_drops" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap p-4 rounded-2xl bg-[#FFF4F2] border border-[#F03A46]/25">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white border border-[#F03A46]/25 text-[#F03A46] flex items-center justify-center">
                <Flame size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#14120F]">Upcoming Hype Drops List</h4>
                <p className="text-[11px] text-[#5C4E35]">
                  Products flagged as New Drops show on /new-drops where customers can cast hype votes and get drop alerts.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/products"
              data-photo-overlay="true"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white font-black text-xs uppercase hover:brightness-105 transition-all shadow-sm"
            >
              + Flag New Product as Drop
            </Link>
          </div>

          {newDropProducts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-[#EAD296] bg-white p-8">
              <Flame size={36} className="text-[#F03A46]/60 mx-auto mb-3" />
              <h3 className="text-sm font-black uppercase text-[#14120F]">No Upcoming Drops Set</h3>
              <p className="text-xs text-[#5C4E35] mt-1 max-w-sm mx-auto">
                Go to Product Management and check &quot;Flag as New Drop&quot; on any upcoming design.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {newDropProducts.map((p) => {
                const live = isDropLive(p);
                const dropStatus = getDropDisplayStatus(p);

                return (
                  <div key={p.id} className="rounded-3xl border border-[#EAD296] bg-white p-5 flex flex-col justify-between space-y-4 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                            live
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-[#FFF4F2] text-[#F03A46] border-[#F03A46]/30"
                          }`}
                        >
                          {live ? "🔥 LIVE DROP" : "⚡ DROPPING SOON"}
                        </span>
                        <span className="text-[10px] font-bold text-[#7A6847]">
                          {dropStatus.dateText}
                        </span>
                      </div>

                      <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-[#FFF9EB] mb-3 border border-[#F0E2BE]">
                        <img src={p.image_url || "/banner-premium-polo.png"} alt={p.name} className="w-full h-full object-cover" />
                      </div>

                      <h4 className="text-sm font-black text-[#14120F]">{p.name}</h4>
                      <p className="text-xs text-[#5C4E35] mt-1 line-clamp-2">{p.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#F0E2BE] flex items-center justify-between text-xs">
                      <span className="font-black text-[#14120F]">₹{p.price}</span>
                      <Link
                        href="/dashboard/products"
                        className="text-[#F03A46] font-black hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Edit Drop Settings</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: PREMIUM STORE ITEMS */}
      {activeTab === "premium" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap p-4 rounded-2xl bg-[#FFF8DB] border border-[#DFBE6F]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white border border-[#DFBE6F] text-[#9A6503] flex items-center justify-center">
                <Crown size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#14120F]">Premium Store Vault Listings</h4>
                <p className="text-[11px] text-[#5C4E35]">
                  Items tagged as Premium are featured in /premium-store and calculated in separated Premium Revenue reports.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/products"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FCE89C] to-[#EAB308] border border-[#DFBE6F] text-[#14120F] font-black text-xs uppercase hover:brightness-105 transition-all shadow-sm"
            >
              + Tag Product as Premium
            </Link>
          </div>

          {premiumProducts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-[#EAD296] bg-white p-8">
              <Crown size={36} className="text-[#D49014] mx-auto mb-3" />
              <h3 className="text-sm font-black uppercase text-[#14120F]">No Premium Products Tagged</h3>
              <p className="text-xs text-[#5C4E35] mt-1 max-w-sm mx-auto">
                Tag your high-GSM, luxury Supima, or capsule pieces as &quot;Premium Store Item&quot; in Product Management.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {premiumProducts.map((p) => (
                <div key={p.id} className="rounded-3xl border border-[#DFBE6F] bg-white p-5 flex flex-col justify-between space-y-4 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="rounded-full bg-[#FFF8DB] text-[#9A6503] border border-[#DFBE6F] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                        💎 PREMIUM VAULT
                      </span>
                      <span className="text-[10px] font-bold text-[#7A6847]">
                        {p.collection || "Luxury Tier"}
                      </span>
                    </div>

                    <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-[#FFF9EB] mb-3 border border-[#F0E2BE]">
                      <img src={p.image_url || "/banner-premium-polo.png"} alt={p.name} className="w-full h-full object-cover" />
                    </div>

                    <h4 className="text-sm font-black text-[#14120F]">{p.name}</h4>
                    <p className="text-xs text-[#5C4E35] mt-1 line-clamp-2">{p.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#F0E2BE] flex items-center justify-between text-xs">
                    <span className="font-black text-[#9A6503]">₹{p.price}</span>
                    <Link
                      href="/dashboard/products"
                      className="text-[#F03A46] font-black hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>Edit Settings</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
