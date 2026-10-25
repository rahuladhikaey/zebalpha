'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, Category } from '@/lib/types';

export const DEFAULT_CLOTHING_CATEGORIES: Category[] = [];

export const SLIM_PRODUCT_CARD_FIELDS = "id, name, brand, price, mrp, image_url, images, category_id, collection, stock, low_stock_limit, status, is_active, is_approved, approval_status, created_at, specifications, seller_id, packages";

export { getProductDisplayPricing } from "@/lib/productPricing";

/**
 * Custom 300ms Debounce Hook for Search Inputs
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Normalized Search String Helper
 */
export function normalizeQueryString(str?: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Canonical Category Fetcher
 * Prioritizes active Curated Collections managed by Admin, with fallback to standard categories.
 */
export async function fetchCanonicalCategories(): Promise<Category[]> {
  try {
    // 1. Fetch real active Main Categories from categories table
    const { data: catData, error: catErr } = await supabase
      .from("categories")
      .select("id, name, slug, icon_key, icon_url, icon_source, image_url, description, display_order, is_active, show_in_navigation, parent_id")
      .is("parent_id", null)
      .or("is_active.is.null,is_active.eq.true")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (!catErr && catData && catData.length > 0) {
      return catData.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        icon: c.icon_key,
        icon_key: c.icon_key,
        icon_url: c.icon_url,
        image_url: c.image_url,
        is_active: c.is_active !== false,
      })) as Category[];
    }

    // 2. Fallback to curated collections if categories table is empty
    const { data: curatedData, error: curatedErr } = await supabase
      .from("curated_collections")
      .select("id, title, slug, image_url, display_order, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!curatedErr && curatedData && curatedData.length > 0) {
      return curatedData.map((c) => ({
        id: c.id,
        name: c.title,
        slug: c.slug || c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        image_url: c.image_url,
        is_active: true,
      })) as Category[];
    }
  } catch (err) {
    console.error("Error in fetchCanonicalCategories:", err);
  }

  return [];
}

/**
 * L1 Browser-Cached Categories Hook (One Canonical Source)
 * Reuses initial SSR data if provided; caches for 30 minutes.
 */
export function useCategories(initialCategories?: Category[]) {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: fetchCanonicalCategories,
    initialData: initialCategories && initialCategories.length > 0 ? initialCategories : undefined,
    staleTime: 5 * 1000, // 5 seconds fresh L1 cache
    gcTime: 60 * 1000,
  });
}

export interface PaginatedProductsParams {
  category?: string | number | null;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedProductsResponse {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Paginated Slim Products Fetcher
/**
 * Builds resilient, semantic SQL search clauses for any category or curated collection name.
 * Supports apparel, ethnic wear (Kurtis, Sarees), bags, dresses, footwear, jewelry, etc.
 */
export function buildCategoryFilterClauses(categoryInput: string): string[] {
  const cat = categoryInput.toLowerCase().trim().replace(/-/g, " ");
  const orClauses = new Set<string>();

  const addTerm = (term: string) => {
    const clean = term.trim().replace(/['",%]/g, "").replace(/\s+/g, "%");
    if (!clean || clean.length < 2) return;
    orClauses.add(`name.ilike.%${clean}%`);
    orClauses.add(`description.ilike.%${clean}%`);
    orClauses.add(`collection.ilike.%${clean}%`);
    orClauses.add(`brand.ilike.%${clean}%`);
  };

  let hasSpecificCategory = false;

  // 1. Kurti / Ethnic / Indian Wear
  if (
    cat.includes("kurti") ||
    cat.includes("kurta") ||
    cat.includes("anarkali") ||
    cat.includes("ethnic") ||
    cat.includes("suit") ||
    cat.includes("salwar") ||
    cat.includes("chikankari") ||
    cat.includes("sharara")
  ) {
    hasSpecificCategory = true;
    ["kurti", "kurta", "anarkali", "suit", "ethnic", "chikankari", "sharara", "salwar", "tunic"].forEach(addTerm);
  }

  // 2. Bags, Slings & Backpacks
  if (
    cat.includes("bag") ||
    cat.includes("sling") ||
    cat.includes("tote") ||
    cat.includes("crossbody") ||
    cat.includes("handbag") ||
    cat.includes("purse") ||
    cat.includes("clutch") ||
    cat.includes("backpack") ||
    cat.includes("wallet") ||
    cat.includes("pouch")
  ) {
    hasSpecificCategory = true;
    ["bag", "sling", "crossbody", "tote", "handbag", "purse", "clutch", "backpack", "wallet"].forEach(addTerm);
  }

  // 3. Sarees, Blouses & Lehengas
  if (
    cat.includes("saree") ||
    cat.includes("sari") ||
    cat.includes("blouse") ||
    cat.includes("lehenga") ||
    cat.includes("choli") ||
    cat.includes("banarasi")
  ) {
    hasSpecificCategory = true;
    ["saree", "sari", "blouse", "lehenga", "choli", "banarasi", "kanjivaram"].forEach(addTerm);
  }

  // 4. Dresses & Gowns & Jumpsuits
  if (
    cat.includes("dress") ||
    cat.includes("gown") ||
    cat.includes("jumpsuit") ||
    cat.includes("romper") ||
    cat.includes("maxi") ||
    cat.includes("midi") ||
    cat.includes("frock")
  ) {
    hasSpecificCategory = true;
    ["dress", "gown", "jumpsuit", "maxi", "midi", "frock", "one-piece"].forEach(addTerm);
  }

  // 5. Women's Tops / Tunics
  if (
    (cat.includes("top") || cat.includes("croptop") || cat.includes("crop top") || cat.includes("tunic")) &&
    !cat.includes("topwear")
  ) {
    hasSpecificCategory = true;
    ["top", "croptop", "crop top", "tunic", "peplum"].forEach(addTerm);
  }

  // 6. Polos
  if (cat.includes("polo")) {
    hasSpecificCategory = true;
    ["polo"].forEach(addTerm);
  }

  // 7. T-Shirts & Tees & Oversized
  if (cat.includes("tee") || cat.includes("t-shirt") || cat.includes("tshirt") || cat.includes("oversized")) {
    hasSpecificCategory = true;
    ["tee", "t-shirt", "tshirt", "oversized"].forEach(addTerm);
  }

  // 8. Hoodies & Sweatshirts & Jackets
  if (
    cat.includes("hoodie") ||
    cat.includes("sweatshirt") ||
    cat.includes("fleece") ||
    cat.includes("jacket") ||
    cat.includes("sweater") ||
    cat.includes("cardigan") ||
    cat.includes("coat") ||
    cat.includes("bomber")
  ) {
    hasSpecificCategory = true;
    ["hoodie", "sweatshirt", "fleece", "jacket", "sweater", "cardigan", "bomber"].forEach(addTerm);
  }

  // 9. Shirts (Casual / Formal)
  if (
    (cat.includes("shirt") || cat.includes("flannel") || cat.includes("oxford")) &&
    !cat.includes("t-shirt") &&
    !cat.includes("tshirt")
  ) {
    hasSpecificCategory = true;
    ["shirt", "flannel", "oxford"].forEach(addTerm);
  }

  // 10. Bottoms, Pants, Cargos, Jeans
  if (
    cat.includes("bottom") ||
    cat.includes("cargo") ||
    cat.includes("pant") ||
    cat.includes("trouser") ||
    cat.includes("denim") ||
    cat.includes("jeans") ||
    cat.includes("jogger") ||
    cat.includes("legging") ||
    cat.includes("palazzo") ||
    cat.includes("shorts")
  ) {
    hasSpecificCategory = true;
    ["cargo", "pant", "trouser", "jeans", "denim", "jogger", "legging", "palazzo", "bottom", "short"].forEach(addTerm);
  }

  // 11. Footwear & Shoes
  if (
    cat.includes("shoe") ||
    cat.includes("sneaker") ||
    cat.includes("footwear") ||
    cat.includes("sandal") ||
    cat.includes("slipper") ||
    cat.includes("boot") ||
    cat.includes("slide") ||
    cat.includes("heel")
  ) {
    hasSpecificCategory = true;
    ["shoe", "sneaker", "footwear", "sandal", "slipper", "boot", "slide", "heel", "loafer"].forEach(addTerm);
  }

  // 12. Jewellery & Accessories
  if (
    cat.includes("jewel") ||
    cat.includes("necklace") ||
    cat.includes("earring") ||
    cat.includes("ring") ||
    cat.includes("bangle") ||
    cat.includes("bracelet") ||
    cat.includes("pendant") ||
    cat.includes("chain")
  ) {
    hasSpecificCategory = true;
    ["jewel", "necklace", "earring", "ring", "bangle", "bracelet", "pendant", "chain"].forEach(addTerm);
  }

  // 13. Caps, Hats & Headwear
  if (cat.includes("cap") || cat.includes("hat") || cat.includes("beanie") || cat.includes("headwear")) {
    hasSpecificCategory = true;
    ["cap", "beanie", "hat", "headwear"].forEach(addTerm);
  }

  // 14. Beauty & Cosmetics
  if (
    cat.includes("beauty") ||
    cat.includes("cosmetic") ||
    cat.includes("makeup") ||
    cat.includes("serum") ||
    cat.includes("lipstick") ||
    cat.includes("skincare")
  ) {
    hasSpecificCategory = true;
    ["beauty", "cosmetic", "makeup", "serum", "lipstick", "skincare"].forEach(addTerm);
  }

  // 15. Home & Kitchen & Bedsheets
  if (
    cat.includes("home") ||
    cat.includes("kitchen") ||
    cat.includes("bedsheet") ||
    cat.includes("bottle") ||
    cat.includes("tumbler") ||
    cat.includes("flask")
  ) {
    hasSpecificCategory = true;
    ["home", "kitchen", "bedsheet", "bottle", "tumbler", "flask", "decor"].forEach(addTerm);
  }

  // 16. Drops & Limited
  if (cat.includes("drop") || cat.includes("limited")) {
    hasSpecificCategory = true;
    ["drop", "limited"].forEach(addTerm);
  }

  // 17. Tokenize significant individual words from category name
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "for", "with", "in", "of", "to", "at", "by", "from",
    "collection", "collections", "curated", "zebalpha", "items", "item", "all", "new", "best", "style", "edit", "shop", "online"
  ]);

  const genderWords = new Set([
    "women", "womens", "woman", "men", "mens", "man", "girl", "girls", "boy", "boys", "kid", "kids", "unisex"
  ]);

  const words = cat
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  // If a specific category was already detected (e.g. Kurti, Bag), don't add standalone gender words
  words.forEach((w) => {
    if (hasSpecificCategory && genderWords.has(w)) return;
    addTerm(w);
  });

  // Direct full phrase match with spaces replaced by %
  addTerm(cat);

  return Array.from(orClauses).slice(0, 36);
}

/**
 * Intelligent client-side matcher for resilient fallback verification
 */
export function doesProductMatchCategory(product: any, categoryNameOrId: string | number): boolean {
  if (!product || !categoryNameOrId) return true;
  const target = String(categoryNameOrId).toLowerCase().trim().replace(/-/g, " ");
  if (!target || target === "all") return true;

  // Direct category_id or subcategory_id match
  const pCatId = String(product.category_id || "").toLowerCase().trim();
  const pSubcatId = String(product.subcategory_id || "").toLowerCase().trim();
  if ((pCatId && pCatId === target) || (pSubcatId && pSubcatId === target)) return true;

  const pName = (product.name || "").toLowerCase();
  const pDesc = (product.description || "").toLowerCase();
  const pColl = (product.collection || (product.specifications as any)?.collection || "").toLowerCase();
  const pSubcat = (
    (product.specifications as any)?.subcategory_name ||
    (product.specifications as any)?.subcategory ||
    ""
  ).toLowerCase();
  const pBrand = (product.brand || "").toLowerCase();
  const pCategory = (product.category || "").toLowerCase();

  const combined = `${pName} ${pDesc} ${pColl} ${pSubcat} ${pCategory} ${pBrand}`;

  // 1. Kurti / Ethnic / Indian Wear
  const isKurtiCategory =
    target.includes("kurti") ||
    target.includes("kurta") ||
    target.includes("anarkali") ||
    target.includes("ethnic") ||
    target.includes("suit") ||
    target.includes("salwar") ||
    target.includes("chikankari") ||
    target.includes("sharara");

  if (isKurtiCategory) {
    return (
      combined.includes("kurti") ||
      combined.includes("kurta") ||
      combined.includes("anarkali") ||
      combined.includes("ethnic") ||
      combined.includes("suit") ||
      combined.includes("chikankari") ||
      combined.includes("sharara") ||
      combined.includes("salwar") ||
      combined.includes("tunic")
    );
  }

  // 2. Bags & Slings
  const isBagCategory =
    target.includes("bag") ||
    target.includes("sling") ||
    target.includes("tote") ||
    target.includes("crossbody") ||
    target.includes("handbag") ||
    target.includes("purse") ||
    target.includes("clutch") ||
    target.includes("backpack") ||
    target.includes("wallet") ||
    target.includes("pouch");

  if (isBagCategory) {
    return (
      combined.includes("bag") ||
      combined.includes("sling") ||
      combined.includes("crossbody") ||
      combined.includes("tote") ||
      combined.includes("handbag") ||
      combined.includes("purse") ||
      combined.includes("clutch") ||
      combined.includes("backpack") ||
      combined.includes("wallet") ||
      combined.includes("pouch")
    );
  }

  // 3. Sarees & Lehengas
  const isSareeCategory =
    target.includes("saree") ||
    target.includes("sari") ||
    target.includes("blouse") ||
    target.includes("lehenga") ||
    target.includes("choli") ||
    target.includes("banarasi");

  if (isSareeCategory) {
    return (
      combined.includes("saree") ||
      combined.includes("sari") ||
      combined.includes("blouse") ||
      combined.includes("lehenga") ||
      combined.includes("choli") ||
      combined.includes("banarasi")
    );
  }

  // 4. Dresses & Gowns & Jumpsuits
  const isDressCategory =
    target.includes("dress") ||
    target.includes("gown") ||
    target.includes("jumpsuit") ||
    target.includes("romper") ||
    target.includes("maxi") ||
    target.includes("midi") ||
    target.includes("frock");

  if (isDressCategory) {
    return (
      combined.includes("dress") ||
      combined.includes("gown") ||
      combined.includes("jumpsuit") ||
      combined.includes("frock") ||
      combined.includes("maxi") ||
      combined.includes("midi") ||
      combined.includes("one-piece") ||
      combined.includes("romper")
    );
  }

  // 5. Polos
  if (target.includes("polo")) {
    return combined.includes("polo");
  }

  // 6. Tees / T-Shirts / Oversized
  if (target.includes("tee") || target.includes("t-shirt") || target.includes("tshirt") || target.includes("oversized")) {
    return combined.includes("tee") || combined.includes("t-shirt") || combined.includes("tshirt") || combined.includes("oversized");
  }

  // 7. Hoodies & Sweatshirts & Jackets
  const isHoodieCategory =
    target.includes("hoodie") ||
    target.includes("sweatshirt") ||
    target.includes("fleece") ||
    target.includes("jacket") ||
    target.includes("sweater");

  if (isHoodieCategory) {
    return (
      combined.includes("hoodie") ||
      combined.includes("sweatshirt") ||
      combined.includes("fleece") ||
      combined.includes("jacket") ||
      combined.includes("sweater") ||
      combined.includes("bomber")
    );
  }

  // 8. Shirts (Exclude T-shirts)
  if (target.includes("shirt") && !target.includes("t-shirt") && !target.includes("tshirt")) {
    return pName.includes("shirt") && !pName.includes("t-shirt") && !pName.includes("tshirt");
  }

  // 9. Bottoms / Cargos / Jeans / Pants
  const isBottomCategory =
    target.includes("bottom") ||
    target.includes("cargo") ||
    target.includes("pant") ||
    target.includes("trouser") ||
    target.includes("jeans") ||
    target.includes("denim") ||
    target.includes("jogger") ||
    target.includes("legging") ||
    target.includes("palazzo");

  if (isBottomCategory) {
    return (
      combined.includes("cargo") ||
      combined.includes("pant") ||
      combined.includes("trouser") ||
      combined.includes("jeans") ||
      combined.includes("denim") ||
      combined.includes("jogger") ||
      combined.includes("legging") ||
      combined.includes("palazzo") ||
      combined.includes("bottom")
    );
  }

  // 10. Footwear
  const isFootwearCategory =
    target.includes("shoe") ||
    target.includes("sneaker") ||
    target.includes("footwear") ||
    target.includes("sandal") ||
    target.includes("boot") ||
    target.includes("slipper") ||
    target.includes("slide") ||
    target.includes("heel");

  if (isFootwearCategory) {
    return (
      combined.includes("shoe") ||
      combined.includes("sneaker") ||
      combined.includes("footwear") ||
      combined.includes("sandal") ||
      combined.includes("boot") ||
      combined.includes("slide") ||
      combined.includes("slipper") ||
      combined.includes("heel")
    );
  }

  // 11. Jewellery
  const isJewelCategory =
    target.includes("jewel") ||
    target.includes("necklace") ||
    target.includes("earring") ||
    target.includes("bangle") ||
    target.includes("ring") ||
    target.includes("bracelet") ||
    target.includes("chain");

  if (isJewelCategory) {
    return (
      combined.includes("jewel") ||
      combined.includes("necklace") ||
      combined.includes("earring") ||
      combined.includes("bangle") ||
      combined.includes("ring") ||
      combined.includes("chain") ||
      combined.includes("bracelet")
    );
  }

  // 12. Beauty & Cosmetics
  const isBeautyCategory =
    target.includes("beauty") ||
    target.includes("cosmetic") ||
    target.includes("makeup") ||
    target.includes("serum") ||
    target.includes("skincare") ||
    target.includes("lipstick");

  if (isBeautyCategory) {
    return (
      combined.includes("beauty") ||
      combined.includes("cosmetic") ||
      combined.includes("makeup") ||
      combined.includes("serum") ||
      combined.includes("skincare") ||
      combined.includes("lipstick")
    );
  }

  // 13. Home & Kitchen
  const isHomeCategory =
    target.includes("home") ||
    target.includes("kitchen") ||
    target.includes("bedsheet") ||
    target.includes("bottle") ||
    target.includes("tumbler") ||
    target.includes("flask");

  if (isHomeCategory) {
    return (
      combined.includes("home") ||
      combined.includes("kitchen") ||
      combined.includes("bedsheet") ||
      combined.includes("bottle") ||
      combined.includes("tumbler") ||
      combined.includes("flask")
    );
  }

  // 14. Custom Curated Collections (Tokenized words without stop words)
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "for", "with", "in", "of", "to", "at", "by", "from",
    "collection", "collections", "curated", "zebalpha", "items", "item", "all", "new", "best", "style", "edit", "shop", "online"
  ]);

  const targetWords = target
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (targetWords.length > 0) {
    const hasAnyWord = targetWords.some((w) => combined.includes(w));
    if (hasAnyWord) return true;
  }

  return combined.includes(target);
}

/**
 * Paginated Slim Products Fetcher
 * Pushes filtering and limit/offset pagination to the database with resilient fallback.
 */
export async function fetchPaginatedProducts(params: PaginatedProductsParams): Promise<PaginatedProductsResponse> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(Math.max(1, params.pageSize || 24), 48);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabase
      .from("products")
      .select(SLIM_PRODUCT_CARD_FIELDS, { count: "exact" })
      .or("is_active.is.null,is_active.eq.true")
      .neq("approval_status", "rejected");

    // Server-side category & collection filtering
    if (params.category && String(params.category).trim() !== "" && String(params.category) !== "all") {
      const cat = String(params.category).toLowerCase().trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cat);
      const isNum = !isNaN(Number(cat));

      if (isUuid) {
        let catIds = [cat];
        try {
          const { data: subcats } = await supabase
            .from("categories")
            .select("id")
            .eq("parent_id", cat);
          if (subcats && subcats.length > 0) {
            catIds.push(...subcats.map((s: any) => s.id));
          }
        } catch (_) {}

        if (catIds.length === 1) {
          query = query.or(`category_id.eq.${cat},subcategory_id.eq.${cat}`);
        } else {
          query = query.or(`category_id.in.(${catIds.join(",")}),subcategory_id.in.(${catIds.join(",")})`);
        }
      } else if (isNum) {
        query = query.eq("category_id", Number(cat));
      } else {
        const filterClauses = buildCategoryFilterClauses(cat);
        if (filterClauses.length > 0) {
          query = query.or(filterClauses.join(","));
        } else {
          query = query.or(`name.ilike.%${cat}%,description.ilike.%${cat}%,collection.ilike.%${cat}%`);
        }
      }
    }

    // Server-side search filtering
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%,collection.ilike.%${q}%`);
    }

    // Server-side sorting
    if (params.sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (params.sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Range-based pagination
    query = query.range(from, to);

    let { data, count, error } = await query;

    // Resilient fallback: If category was requested but returned 0 results or had an error, query active products and match via semantic resolver
    if (params.category && (!data || data.length === 0 || error)) {
      try {
        const fallbackRes = await supabase
          .from("products")
          .select(SLIM_PRODUCT_CARD_FIELDS, { count: "exact" })
          .or("is_active.is.null,is_active.eq.true")
          .neq("approval_status", "rejected")
          .order("created_at", { ascending: false })
          .limit(250);

        if (fallbackRes.data && fallbackRes.data.length > 0) {
          const matched = fallbackRes.data.filter((p) => doesProductMatchCategory(p, params.category!));
          if (matched.length > 0) {
            data = matched.slice(from, to + 1);
            count = matched.length;
            error = null;
          }
        }
      } catch (fallbackErr) {
        console.warn("Notice in category fallback match:", fallbackErr);
      }
    }

    if (error || !data) {
      console.warn("Notice querying paginated products, trying broad fallback:", error?.message);
      const fallback = await supabase
        .from("products")
        .select(SLIM_PRODUCT_CARD_FIELDS, { count: "exact" })
        .or("is_active.is.null,is_active.eq.true")
        .neq("approval_status", "rejected")
        .order("created_at", { ascending: false })
        .limit(250);

      if (params.category && fallback.data) {
        const matched = fallback.data.filter((p) => doesProductMatchCategory(p, params.category!));
        data = matched.slice(from, to + 1);
        count = matched.length;
      } else {
        data = (fallback.data || []).slice(from, to + 1);
        count = fallback.count || (fallback.data || []).length;
      }
      error = fallback.error;
    }

    if (error) {
      console.warn("Notice querying paginated products:", error.message);
      return {
        products: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 1,
        hasMore: false,
      };
    }

    const rawList = data || [];
    const products: Product[] = rawList.map((p: any) => {
      const specs = p.specifications || {};
      const isPrem = p.is_premium === true || p.tier === "PREMIUM" || specs.is_premium === true || specs.is_premium === "true" || specs.tier === "PREMIUM" || (p.name || "").toLowerCase().includes("premium");
      const isDrop = p.is_new_drop === true || specs.is_new_drop === true || specs.is_new_drop === "true" || p.status === "COMING_SOON";
      return {
        ...p,
        thumbnail_url: p.thumbnail_url || p.image_url || (Array.isArray(p.images) && p.images[0]) || "",
        is_premium: isPrem,
        tier: isPrem ? "PREMIUM" : (p.tier || specs.tier || "STANDARD"),
        is_new_drop: isDrop,
        collection: p.collection || specs.collection || "",
        target_drop_date: p.target_drop_date || specs.target_drop_date || "",
        category: p.category || specs.category || "Apparel",
      };
    });
    const totalCount = count !== null ? count : products.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      products,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  } catch (err: any) {
    console.error("Error in fetchPaginatedProducts:", err);
    return {
      products: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      hasMore: false,
    };
  }
}

/**
 * L1 Browser-Cached Paginated Products Hook
 */
export function usePaginatedProducts(params: PaginatedProductsParams) {
  const normalizedParams = {
    category: params.category ? String(params.category).trim() : "all",
    search: normalizeQueryString(params.search),
    sort: params.sort || "newest",
    page: Math.max(1, params.page || 1),
    pageSize: Math.min(Math.max(1, params.pageSize || 24), 48),
  };

  return useQuery<PaginatedProductsResponse>({
    queryKey: ['products', normalizedParams],
    queryFn: () => fetchPaginatedProducts(normalizedParams),
    staleTime: 30 * 1000, // 30 seconds L1 cache (invalidated instantly by Realtime on DB mutations)
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * L1 Browser-Cached Products Hook (Legacy Compatibility)
 */
export function useProducts(params?: {
  category?: string;
  brand?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
  activeOnly?: boolean;
}) {
  const normalizedParams = {
    category: params?.category || '',
    brand: params?.brand || '',
    sort: params?.sort || '',
    cursor: params?.cursor || '',
    limit: Math.min(Math.max(1, params?.limit || 12), 48),
    activeOnly: params?.activeOnly !== false,
  };

  return useQuery({
    queryKey: ['products', normalizedParams],
    queryFn: async () => {
      const res = await apiService.getProducts(normalizedParams);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * L1 Browser-Cached Product Detail Hook
 */
export function useProductDetail(productId: string | number) {
  return useQuery({
    queryKey: ['product', String(productId)],
    queryFn: async () => {
      if (!productId) return null;
      const res = await apiService.getProductById(productId);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    enabled: !!productId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * L1 Browser-Cached Debounced Search Hook
 */
export function useSearchProducts(rawQuery: string, category?: string) {
  const normalizedQuery = normalizeQueryString(rawQuery);
  const debouncedQuery = useDebounce(normalizedQuery, 300);

  return useQuery({
    queryKey: ['search', debouncedQuery, category || 'all'],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const res = await apiService.getProducts({
        category,
        q: debouncedQuery,
        limit: 20,
      } as any);
      if (res.error) throw new Error(res.error);
      return res.data?.products || res.data || [];
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
}
