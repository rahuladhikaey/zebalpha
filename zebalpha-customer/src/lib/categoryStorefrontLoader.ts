import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseServer";
import { attachRatingsToProducts, fetchProductRatingSummaries } from "@/lib/productRatings";
import { getProductDisplayPricing } from "@/lib/productPricing";
import {
  buildDefaultCategoryBlueprint,
  resolveThemeTokens,
  type CategoryStorefrontBlueprint,
  type CategorySubcatItem,
  type CategoryThemePresetKey,
  type CategoryWidgetConfig,
  type CategorySpotlightRequest,
} from "@/lib/categoryStorefrontTypes";

const supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_A_URL ||
  "https://placeholder.supabase.co"
).trim();
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ||
  "dummy-anon-key-for-build"
).trim();

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

export interface StorefrontProductCard {
  id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  discountPercent: number;
  image_url: string;
  images: string[];
  category_id?: string | null;
  subcategory_id?: string | null;
  rating: number;
  reviewCount: number;
  isCombo: boolean;
  storeTags: string[];
  colors: string[];
  stock: number;
  created_at?: string;
}

export interface AutoPilotBrandSummary {
  brand_name: string;
  max_discount: number;
  min_price: number;
  product_count: number;
  primary_image: string;
  secondary_image: string;
}

export interface EnrichedSubcategory extends CategorySubcatItem {
  sample_image_url?: string | null;
  max_discount?: number;
  min_price?: number;
}

export interface CategoryStorefrontPayload {
  category: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    image_url?: string | null;
    parent_id?: string | null;
  };
  blueprint: CategoryStorefrontBlueprint;
  subcategories: EnrichedSubcategory[];
  brands: AutoPilotBrandSummary[];
  approvedSpotlights: CategorySpotlightRequest[];
  allCategoryProducts: StorefrontProductCard[];
  paginatedProducts: StorefrontProductCard[];
  totalProducts: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  navCategories: Array<{
    id: string;
    name: string;
    slug: string;
    icon_key?: string | null;
    icon_url?: string | null;
    image_url?: string | null;
    display_order?: number;
  }>;
}

function getReadClient() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseServer : anonClient;
}

function extractPrimaryImage(p: any): string {
  if (typeof p.image_url === "string" && p.image_url.trim()) return p.image_url.trim();
  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first.url === "string") return first.url.trim();
  }
  return "";
}

function extractImages(p: any): string[] {
  const out: string[] = [];
  if (typeof p.image_url === "string" && p.image_url.trim()) out.push(p.image_url.trim());
  if (Array.isArray(p.images)) {
    for (const img of p.images) {
      const url = typeof img === "string" ? img.trim() : img?.url ? String(img.url).trim() : "";
      if (url && !out.includes(url)) out.push(url);
    }
  }
  return out;
}

function normalizeProduct(p: any): StorefrontProductCard {
  const pricing = getProductDisplayPricing(p);
  const price = Math.round(Number(pricing.price || p.price || 0));
  const mrp = Math.round(Number(pricing.mrp || p.mrp || price));
  const discountPercent =
    mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : Math.round(Number(pricing.discountPercent || 0));
  const specs = (p.specifications && typeof p.specifications === "object" ? p.specifications : {}) as Record<string, any>;

  const rawTags = specs.storefront_tags || specs.store_tags || specs.tags || [];
  const storeTags: string[] = Array.isArray(rawTags)
    ? rawTags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean)
    : typeof rawTags === "string"
      ? rawTags.split(",").map((t) => t.toLowerCase().trim()).filter(Boolean)
      : [];

  const nameLower = String(p.name || "").toLowerCase();
  const isCombo =
    specs.is_combo === true ||
    specs.is_combo === "true" ||
    storeTags.includes("combo") ||
    /\b(combo|kit|pack of|set of|bundle)\b/i.test(nameLower);

  const rawColors = specs.colors || specs.color || p.color || [];
  const colors: string[] = Array.isArray(rawColors)
    ? rawColors.map((c: any) => String(c).toLowerCase().trim()).filter(Boolean)
    : typeof rawColors === "string"
      ? rawColors.split(",").map((c) => c.toLowerCase().trim()).filter(Boolean)
      : [];
  if (nameLower.includes("black") || nameLower.includes("charcoal") || nameLower.includes("noir")) {
    if (!colors.includes("black")) colors.push("black");
  }

  return {
    id: String(p.id),
    name: String(p.name || "Zebalpha Product"),
    brand: String(p.brand || "Zebalpha").trim() || "Zebalpha",
    price,
    mrp: mrp >= price ? mrp : price,
    discountPercent,
    image_url: extractPrimaryImage(p),
    images: extractImages(p),
    category_id: p.category_id ? String(p.category_id) : null,
    subcategory_id: p.subcategory_id ? String(p.subcategory_id) : null,
    rating: Number(p.rating || p.average_rating || 0),
    reviewCount: Number(p.review_count || p.total_reviews || 0),
    isCombo,
    storeTags,
    colors,
    stock: Number(p.stock ?? 10),
    created_at: p.created_at,
  };
}

export async function loadCategoryStorefrontData(
  slugOrId: string,
  page = 1,
  pageSize = 24
): Promise<CategoryStorefrontPayload | null> {
  const client = getReadClient();
  const cleanSlug = decodeURIComponent(slugOrId || "").trim().toLowerCase();
  if (!cleanSlug) return null;

  // 1. Load all active categories once (tiny table -> single fast query!)
  const { data: allCatsRaw } = await client
    .from("categories")
    .select("id, name, slug, description, icon_key, icon_url, image_url, display_order, is_active, show_in_navigation, parent_id")
    .or("is_active.is.null,is_active.eq.true")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const allCats = (allCatsRaw || []) as any[];
  const navCategories = allCats
    .filter((c) => !c.parent_id && c.show_in_navigation !== false)
    .map((c) => ({
      id: String(c.id),
      name: String(c.name),
      slug: String(c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
      icon_key: c.icon_key,
      icon_url: c.icon_url,
      image_url: c.image_url,
      display_order: c.display_order ?? 0,
    }));

  // Resolve target category by exact slug, UUID, normalized slug, or alias match
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSlug);
  let matchedCat = isUuid
    ? allCats.find((c) => String(c.id).toLowerCase() === cleanSlug)
    : allCats.find((c) => String(c.slug || "").toLowerCase() === cleanSlug);

  if (!matchedCat) {
    matchedCat = allCats.find((c) => {
      const cSlug = String(c.slug || "").toLowerCase();
      const cName = String(c.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return (
        cSlug === cleanSlug ||
        cName === cleanSlug ||
        cSlug.includes(cleanSlug) ||
        cleanSlug.includes(cSlug)
      );
    });
  }

  // Graceful virtual fallback for SEO slugs (e.g., /category/oversized-t-shirts)
  const category = matchedCat
    ? {
        id: String(matchedCat.id),
        name: String(matchedCat.name),
        slug: String(matchedCat.slug || cleanSlug),
        description: matchedCat.description || null,
        image_url: matchedCat.image_url || null,
        parent_id: matchedCat.parent_id ? String(matchedCat.parent_id) : null,
      }
    : {
        id: cleanSlug,
        name: cleanSlug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        slug: cleanSlug,
        description: null,
        image_url: null,
        parent_id: null,
      };

  const childCats = matchedCat
    ? allCats.filter((c) => String(c.parent_id || "") === String(matchedCat.id))
    : [];

  // 2. Fetch saved SDUI layout (gracefully handles pre-migration state)
  let savedLayout: any = null;
  if (matchedCat) {
    try {
      const { data: layoutRow, error: layoutErr } = await client
        .from("category_storefront_layouts")
        .select("*")
        .eq("category_id", matchedCat.id)
        .maybeSingle();
      if (!layoutErr && layoutRow) {
        savedLayout = layoutRow;
      }
    } catch {
      // Pre-migration fallback: use built-in preset
    }
  }

  // 3. Fetch approved seller spotlight requests for this category
  let approvedSpotlights: CategorySpotlightRequest[] = [];
  if (matchedCat) {
    try {
      const nowIso = new Date().toISOString();
      const { data: spots, error: spotErr } = await client
        .from("category_spotlight_requests")
        .select("*")
        .eq("category_id", matchedCat.id)
        .eq("status", "APPROVED")
        .order("created_at", { ascending: false })
        .limit(16);
      if (!spotErr && Array.isArray(spots)) {
        approvedSpotlights = spots.filter((s: any) => {
          if (s.starts_at && s.starts_at > nowIso) return false;
          if (s.ends_at && s.ends_at < nowIso) return false;
          return true;
        }) as CategorySpotlightRequest[];
      }
    } catch {
      // Pre-migration fallback
    }
  }

  // 4. Build final Blueprint (merging saved Admin layout over smart default)
  const subcatBase: CategorySubcatItem[] = childCats.map((sc) => ({
    id: String(sc.id),
    name: String(sc.name),
    slug: String(sc.slug || sc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    image_url: sc.image_url || null,
    icon_key: sc.icon_key || null,
    icon_url: sc.icon_url || null,
  }));

  const defaultBp = buildDefaultCategoryBlueprint(category, subcatBase);
  const savedWidgets = Array.isArray(savedLayout?.widgets) ? (savedLayout.widgets as CategoryWidgetConfig[]) : [];
  const themePreset = (savedLayout?.theme_preset as CategoryThemePresetKey) || defaultBp.theme_preset;
  const themeTokens = resolveThemeTokens(themePreset, savedLayout?.theme_tokens || null);

  const blueprint: CategoryStorefrontBlueprint = {
    category_id: category.id,
    category_slug: category.slug,
    category_name: category.name,
    is_enabled: savedLayout?.is_enabled !== false,
    theme_preset: themePreset,
    theme_tokens: themeTokens,
    widgets: (savedWidgets.length > 0 ? savedWidgets : defaultBp.widgets)
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    updated_at: savedLayout?.updated_at,
  };

  // 5. Fetch live products for this category + subcategories (up to 120 for rich auto-pilot)
  let rawProducts: any[] = [];
  if (matchedCat) {
    const allIds = [String(matchedCat.id), ...childCats.map((s) => String(s.id))];
    const { data: prods } = await client
      .from("products")
      .select("id, name, brand, price, mrp, image_url, images, is_active, stock, specifications, packages, category_id, subcategory_id, created_at, status, tier")
      .eq("is_active", true)
      .neq("status", "COMING_SOON")
      .neq("tier", "DROP")
      .or(`category_id.in.(${allIds.join(",")}),subcategory_id.in.(${allIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(120);
    rawProducts = prods || [];
  }

  // Fallback keyword search if a category has no strictly linked rows yet (or virtual SEO slug)
  if (rawProducts.length === 0) {
    const keyword = category.name.split(/[\s&'/]+/).find((w) => w.length >= 3) || cleanSlug.split("-")[0];
    if (keyword && keyword.length >= 3) {
      const { data: fallbackProds } = await client
        .from("products")
        .select("id, name, brand, price, mrp, image_url, images, is_active, stock, specifications, packages, category_id, subcategory_id, created_at, status, tier")
        .eq("is_active", true)
        .neq("status", "COMING_SOON")
        .neq("tier", "DROP")
        .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%,brand.ilike.%${keyword}%`)
        .order("created_at", { ascending: false })
        .limit(80);
      rawProducts = fallbackProds || [];
    }
  }

  const filteredProds = rawProducts.filter((p: any) => {
    const specs = p.specifications || {};
    return !(p.is_new_drop === true || specs.is_new_drop === true || specs.is_new_drop === "true" || specs.tier === "DROP");
  });

  // Attach real product ratings
  let ratedProducts = filteredProds;
  if (filteredProds.length > 0) {
    try {
      const ratingsMap = await fetchProductRatingSummaries(
        client,
        filteredProds.map((p: any) => p.id)
      );
      ratedProducts = attachRatingsToProducts(filteredProds, ratingsMap);
    } catch {
      ratedProducts = filteredProds;
    }
  }

  const normalizedProducts = ratedProducts.map(normalizeProduct);

  // 6. Enrich subcategories with real sample images, counts & max discounts
  const enrichedSubcategories: EnrichedSubcategory[] = subcatBase.map((sc) => {
    const scProds = normalizedProducts.filter(
      (p) => p.subcategory_id === sc.id || p.category_id === sc.id
    );
    const bestImg = sc.image_url || scProds.find((p) => p.image_url)?.image_url || null;
    const maxDisc = scProds.reduce((acc, p) => Math.max(acc, p.discountPercent), 0);
    const minPrice = scProds.reduce((acc, p) => (p.price > 0 ? Math.min(acc, p.price) : acc), Infinity);
    return {
      ...sc,
      product_count: scProds.length,
      sample_image_url: bestImg,
      max_discount: maxDisc,
      min_price: minPrice === Infinity ? 0 : minPrice,
    };
  });

  // 7. Aggregate real Brands inside this category
  const brandMap = new Map<string, AutoPilotBrandSummary>();
  for (const p of normalizedProducts) {
    const bName = p.brand;
    if (!bName || bName.toLowerCase() === "generic" || bName.toLowerCase() === "unbranded") continue;
    const key = bName.toLowerCase();
    const existing = brandMap.get(key);
    if (!existing) {
      brandMap.set(key, {
        brand_name: bName,
        max_discount: p.discountPercent,
        min_price: p.price,
        product_count: 1,
        primary_image: p.image_url,
        secondary_image: p.images[1] || p.image_url,
      });
    } else {
      existing.product_count += 1;
      existing.max_discount = Math.max(existing.max_discount, p.discountPercent);
      if (p.price > 0) existing.min_price = Math.min(existing.min_price, p.price);
      if (!existing.secondary_image || existing.secondary_image === existing.primary_image) {
        if (p.image_url && p.image_url !== existing.primary_image) {
          existing.secondary_image = p.image_url;
        }
      }
    }
  }

  const brands = Array.from(brandMap.values()).sort(
    (a, b) => b.product_count - a.product_count || b.max_discount - a.max_discount
  );

  // 8. Paginate bottom Infinite Product Feed
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(48, Math.max(8, pageSize));
  const start = (safePage - 1) * safePageSize;
  const paginatedProducts = normalizedProducts.slice(start, start + safePageSize);

  return {
    category,
    blueprint,
    subcategories: enrichedSubcategories,
    brands,
    approvedSpotlights,
    allCategoryProducts: normalizedProducts,
    paginatedProducts,
    totalProducts: normalizedProducts.length,
    page: safePage,
    pageSize: safePageSize,
    hasMore: start + safePageSize < normalizedProducts.length,
    navCategories,
  };
}
