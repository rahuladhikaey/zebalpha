// ============================================================================
// ZEBALPHA UNIVERSAL FLIPKART-STYLE CATEGORY STOREFRONT ENGINE (SDUI)
// Superadmin Isolated Copy — Types, Theme Presets & Default Blueprint Builders
// ============================================================================

export type CategoryThemePresetKey =
  | "fashion_streetwear_lime"
  | "beauty_glam_rose"
  | "women_editorial_blush"
  | "luxe_champagne_gold"
  | "electronics_slate_blue"
  | "custom";

export interface CategoryThemeTokens {
  pageBg: string;
  headerBg: string;
  headerText: string;
  accentBg: string;
  accentText: string;
  secondaryBoxBg: string;
  secondaryBoxText: string;
  pillBg: string;
  pillText: string;
  softTintBg: string;
  borderColor: string;
  marqueeBg: string;
  marqueeText: string;
}

export type CategoryWidgetType =
  | "HERO_CAROUSEL"
  | "SUBCATEGORY_NAV"
  | "AUDIENCE_SPLIT_3COL"
  | "THEMED_DEAL_RAIL"
  | "TREND_LOOKBOOK"
  | "BUDGET_DISCOUNT_TILES"
  | "OCCASION_2COL"
  | "FULL_SPOTLIGHT_BANNER"
  | "BRAND_SPOTLIGHT_GRID"
  | "CURATED_SHELF"
  | "COMBO_KITS_MARQUEE"
  | "EXPLORE_STORES_3X3"
  | "OFFER_PAYMENT_STRIP"
  | "INFINITE_PRODUCT_FEED";

export interface WidgetLayoutStyle {
  bannerHeightMobile?: number;
  bannerHeightDesktop?: number;
  cardHeightMobile?: number;
  cardHeightDesktop?: number;
  mobileCols?: number;
  desktopCols?: number;
  gapPx?: number;
  paddingY?: number;
  borderRadius?: number;
  titleSize?: "sm" | "md" | "lg" | "xl";
  titleAlign?: "left" | "center" | "right";
  titleColor?: string;
  hideTitle?: boolean;
  hideSubtitle?: boolean;
}

export interface CardImageTransform {
  img_fit?: "contain" | "cover";
  img_zoom?: number;
  img_pos_x?: number;
  img_pos_y?: number;
}

export function getWidgetStyle(widget?: CategoryWidgetConfig | null): WidgetLayoutStyle {
  const s = widget?.config?.style;
  return s && typeof s === "object" ? (s as WidgetLayoutStyle) : {};
}

export function getTitleSizeClass(size?: WidgetLayoutStyle["titleSize"], fallback = "text-base md:text-xl"): string {
  switch (size) {
    case "sm":
      return "text-sm md:text-base";
    case "md":
      return "text-base md:text-xl";
    case "lg":
      return "text-lg md:text-2xl";
    case "xl":
      return "text-xl md:text-3xl";
    default:
      return fallback;
  }
}

export function getTitleAlignClass(align?: WidgetLayoutStyle["titleAlign"], fallback = "text-left"): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  if (align === "left") return "text-left";
  return fallback;
}

export interface CategoryWidgetConfig {
  id: string;
  widget_type: CategoryWidgetType;
  title: string;
  subtitle?: string;
  style_variant?: string;
  enabled: boolean;
  web_enabled: boolean;
  app_enabled: boolean;
  auto_fill?: boolean;
  display_order: number;
  config: Record<string, any>;
}

export interface CategoryStorefrontBlueprint {
  category_id: string;
  category_slug: string;
  category_name: string;
  is_enabled: boolean;
  theme_preset: CategoryThemePresetKey;
  theme_tokens: CategoryThemeTokens;
  widgets: CategoryWidgetConfig[];
  updated_at?: string;
}

export interface CategorySubcatItem {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  icon_key?: string | null;
  icon_url?: string | null;
  product_count?: number;
}

export interface CategorySpotlightRequest {
  id: string;
  seller_id: string;
  seller_name?: string | null;
  category_id: string;
  target_widget: "HERO_CAROUSEL" | "BRAND_SPOTLIGHT_GRID" | "CURATED_SHELF" | "COMBO_KITS_MARQUEE";
  brand_name: string;
  headline: string;
  offer_badge: string;
  banner_image_url?: string | null;
  product_ids: string[];
  destination_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_reason?: string | null;
  created_at: string;
}

export const CATEGORY_THEME_PRESETS: Record<
  Exclude<CategoryThemePresetKey, "custom">,
  { label: string; description: string; tokens: CategoryThemeTokens }
> = {
  fashion_streetwear_lime: {
    label: "Fashion Streetwear (Neon Lime + Noir)",
    description: "Flipkart Fashion style: Crisp white surface, charcoal header, electric lime & black deal blocks",
    tokens: {
      pageBg: "#FFFFFF",
      headerBg: "#111815",
      headerText: "#FFFFFF",
      accentBg: "#D8FF3A",
      accentText: "#0E110E",
      secondaryBoxBg: "#0D0F10",
      secondaryBoxText: "#FFFFFF",
      pillBg: "#111111",
      pillText: "#FFFFFF",
      softTintBg: "#F4F6F4",
      borderColor: "#E5E7EB",
      marqueeBg: "#111111",
      marqueeText: "#D8FF3A",
    },
  },
  beauty_glam_rose: {
    label: "Beauty & Glam (Soft Rose + Luxe Noir)",
    description: "Flipkart Beauty style: Clean white surface, blush pink seasonal edits, cosmic plum & noir glow cards",
    tokens: {
      pageBg: "#FFFFFF",
      headerBg: "#2B1020",
      headerText: "#FFFFFF",
      accentBg: "#FBCFE8",
      accentText: "#4A0E2E",
      secondaryBoxBg: "#1A0B16",
      secondaryBoxText: "#FFFFFF",
      pillBg: "#181116",
      pillText: "#FFFFFF",
      softTintBg: "#FFF1F5",
      borderColor: "#F5D0DE",
      marqueeBg: "#F472B6",
      marqueeText: "#180A12",
    },
  },
  women_editorial_blush: {
    label: "Women's Fashion (Berry Blush + Champagne)",
    description: "Editorial pastel cream & rose-berry blocks with festive ethnic & trendy western styling",
    tokens: {
      pageBg: "#FFFFFF",
      headerBg: "#2D1123",
      headerText: "#FFFFFF",
      accentBg: "#FFE4EC",
      accentText: "#5B1336",
      secondaryBoxBg: "#1D0E18",
      secondaryBoxText: "#FFFFFF",
      pillBg: "#1F121A",
      pillText: "#FFFFFF",
      softTintBg: "#FFF5F7",
      borderColor: "#F3D1DC",
      marqueeBg: "#1F121A",
      marqueeText: "#FBCFE8",
    },
  },
  luxe_champagne_gold: {
    label: "Luxe Gold & Ivory (Zebalpha Signature)",
    description: "Warm ivory surface paired with deep obsidian & metallic champagne-gold highlight cards",
    tokens: {
      pageBg: "#FFFDF9",
      headerBg: "#16120B",
      headerText: "#FFFFFF",
      accentBg: "#FDE68A",
      accentText: "#1C1406",
      secondaryBoxBg: "#14110C",
      secondaryBoxText: "#FFFFFF",
      pillBg: "#16120B",
      pillText: "#FDE68A",
      softTintBg: "#FAF4E6",
      borderColor: "#E8D7B0",
      marqueeBg: "#16120B",
      marqueeText: "#FBBF24",
    },
  },
  electronics_slate_blue: {
    label: "Tech & Electronics (Midnight Slate + Electric Cyan)",
    description: "Modern crisp light grid with high-contrast dark tech panels and electric sky accents",
    tokens: {
      pageBg: "#FFFFFF",
      headerBg: "#0B1220",
      headerText: "#FFFFFF",
      accentBg: "#38BDF8",
      accentText: "#061322",
      secondaryBoxBg: "#0F172A",
      secondaryBoxText: "#FFFFFF",
      pillBg: "#0F172A",
      pillText: "#FFFFFF",
      softTintBg: "#F1F5F9",
      borderColor: "#E2E8F0",
      marqueeBg: "#0F172A",
      marqueeText: "#38BDF8",
    },
  },
};

export const WIDGET_CATALOG_META: Record<
  CategoryWidgetType,
  { label: string; description: string; variants: Array<{ value: string; label: string }> }
> = {
  HERO_CAROUSEL: {
    label: "Top Hero Banner Slider",
    description: "Mobile full-bleed slider + Desktop 3-card carousel with offer badges",
    variants: [
      { value: "responsive_auto", label: "Auto Responsive (Mobile Full + Desktop 3-Up)" },
      { value: "beauty_3up_glam", label: "Glam Dark Cards (Beauty Style)" },
      { value: "fashion_bold_full", label: "Bold Streetwear Full Bleed (Fashion Style)" },
    ],
  },
  SUBCATEGORY_NAV: {
    label: "Sub-Category Visual Navigation",
    description: "2-row square icon grid (Fashion) or 1-row vibrant portrait strip (Beauty)",
    variants: [
      { value: "grid_2row_tiles", label: "2-Row Horizontal Square Grid (Fashion Style)" },
      { value: "portrait_1row_cards", label: "1-Row Gradient Portrait Strip (Beauty Style)" },
    ],
  },
  AUDIENCE_SPLIT_3COL: {
    label: "Shop For Someone / Quick Split (3-Col)",
    description: "3 vibrant framed audience or vertical highlight cards",
    variants: [
      { value: "mint_framed", label: "Mint Neon Frame (Fashion Style)" },
      { value: "blush_framed", label: "Rose Blush Frame (Beauty / Women Style)" },
      { value: "gold_framed", label: "Champagne Gold Frame" },
    ],
  },
  THEMED_DEAL_RAIL: {
    label: "Color-Blocked Deal Carousel",
    description: "Neon Lime box, Noir Black clearance box, Pastel Seasonal Edit, or Clean White rail",
    variants: [
      { value: "neon_lime_box", label: "Neon Lime Container (Back to Black Style)" },
      { value: "noir_black_box", label: "Pure Black Container (Clearance Deals Style)" },
      { value: "pastel_seasonal_edit", label: "Seasonal Header + 3-Col Cards (Winter Beauty Edit)" },
      { value: "clean_white", label: "Clean White Steal Deals Rail" },
    ],
  },
  TREND_LOOKBOOK: {
    label: "Trendy Lookbook & Season Drops",
    description: "2x2 dark streetwear grid, horizontal trend cards, or 4:5 editorial portraits",
    variants: [
      { value: "dark_2x2_and_rail", label: "2x2 Dark Grid + Horizontal Rail (Fashion Trendy)" },
      { value: "editorial_4x5_strip", label: "4:5 Editorial Portrait Strip (Beauty Specials)" },
    ],
  },
  BUDGET_DISCOUNT_TILES: {
    label: "Budget Price & Discount Store Tiles",
    description: "Perforated Ticket Cards (Fashion) or 3x2 Dark Neon Price + Discount Grid (Beauty)",
    variants: [
      { value: "ticket_3col", label: "Perforated Ticket Cards (UNDER ₹199/₹299/₹399)" },
      { value: "neon_grid_3x2", label: "3x2 Dark Neon Grid (Under ₹X + Min. Y% Off)" },
    ],
  },
  OCCASION_2COL: {
    label: "Occasion Coming Up? (2-Col Cards)",
    description: "2 bold event / occasion shopping cards (Festive, Party, Wedding, College)",
    variants: [
      { value: "bold_yellow_bar", label: "Bold Lime/Yellow Title Bar (Fashion Style)" },
      { value: "pastel_glam", label: "Soft Rose Glam Bar (Beauty / Women Style)" },
    ],
  },
  FULL_SPOTLIGHT_BANNER: {
    label: "Full-Width Luxe / Campaign Banner",
    description: "High-impact full-width spotlight banner with optional brand ticker",
    variants: [
      { value: "luxe_noir_gold", label: "Global Luxe Gold-Black Banner" },
      { value: "bridal_pastel", label: "Bridal / Festive Pink Showcase Banner" },
      { value: "brand_ticker_banner", label: "Mega Sale Banner + Brand Logo Strip" },
    ],
  },
  BRAND_SPOTLIGHT_GRID: {
    label: "Spotlight / Biggest Brands Grid",
    description: "3x3 pinned polaroid logo grid (Fashion) or 2-col dark-glow brand cards (Beauty)",
    variants: [
      { value: "polaroid_3x3", label: "3x3 Pinned Polaroid Grid (Fashion Spotlight Brands)" },
      { value: "glow_2col", label: "2-Col Dark Cosmic Glow Cards (Boujee / Biggest Brands)" },
    ],
  },
  CURATED_SHELF: {
    label: "Curated / Fresh Finds Pastel Shelf",
    description: "Soft pastel horizontal cards with crisp white tile & dark offer ribbon",
    variants: [
      { value: "pastel_brand_ribbon", label: "Dermat-Recommended / Fresh Finds Shelf" },
    ],
  },
  COMBO_KITS_MARQUEE: {
    label: "Combo & Kit Deals + Tilted Marquee",
    description: "3 tall combo/kit cards with animated diagonal scrolling offer ribbon",
    variants: [
      { value: "dark_3col_tilted_tape", label: "Dark 3-Col Combos + Diagonal Marquee Tape" },
    ],
  },
  EXPLORE_STORES_3X3: {
    label: "Explore Our Stores (3x3 Micro-Stores)",
    description: "9 curated black-framed micro-store tiles with white arrow CTA",
    variants: [
      { value: "black_frame_arrow", label: "Black Framed 3x3 Store Grid (Fashion Style)" },
      { value: "blush_frame_arrow", label: "Rose Framed 3x3 Store Grid (Beauty Style)" },
    ],
  },
  OFFER_PAYMENT_STRIP: {
    label: "Welcome & Delivery Offer Strip",
    description: "2-column pill strip highlighting Zebalpha 1st order discount & fast shipping",
    variants: [
      { value: "dual_pill_banner", label: "2-Column Clean Offer Cards" },
    ],
  },
  INFINITE_PRODUCT_FEED: {
    label: "Infinite Category Product Grid",
    description: "Flipkart-dense responsive 2-col mobile / 4-col desktop product feed at bottom",
    variants: [
      { value: "flipkart_dense_grid", label: "Flipkart Dense 2-Col / 4-Col Grid" },
    ],
  },
};

export function inferCategoryArchetype(slugOrName: string): "beauty" | "women" | "electronics" | "luxe" | "fashion" {
  const s = (slugOrName || "").toLowerCase();
  if (s.includes("beauty") || s.includes("skin") || s.includes("cosmetic") || s.includes("care") || s.includes("groom")) {
    return "beauty";
  }
  if (s.includes("women") || s.includes("girl") || s.includes("kurti") || s.includes("saree") || s.includes("ethnic")) {
    return "women";
  }
  if (s.includes("electronic") || s.includes("mobile") || s.includes("gadget") || s.includes("tech") || s.includes("audio")) {
    return "electronics";
  }
  if (s.includes("jewel") || s.includes("home") || s.includes("kitchen") || s.includes("bag")) {
    return "luxe";
  }
  return "fashion";
}

export function resolveThemeTokens(
  preset: CategoryThemePresetKey,
  customOverrides?: Partial<CategoryThemeTokens> | null
): CategoryThemeTokens {
  const baseKey: Exclude<CategoryThemePresetKey, "custom"> =
    preset === "custom" ? "fashion_streetwear_lime" : preset in CATEGORY_THEME_PRESETS ? preset : "fashion_streetwear_lime";
  return {
    ...CATEGORY_THEME_PRESETS[baseKey].tokens,
    ...(customOverrides || {}),
  };
}

export function buildDefaultCategoryBlueprint(
  category: { id: string; name: string; slug: string },
  subcategories: CategorySubcatItem[] = []
): CategoryStorefrontBlueprint {
  const arch = inferCategoryArchetype(`${category.slug} ${category.name}`);
  const catParam = encodeURIComponent(category.id);

  if (arch === "beauty") {
    return {
      category_id: category.id,
      category_slug: category.slug,
      category_name: category.name,
      is_enabled: true,
      theme_preset: "beauty_glam_rose",
      theme_tokens: CATEGORY_THEME_PRESETS.beauty_glam_rose.tokens,
      widgets: [
        {
          id: "hero_carousel",
          widget_type: "HERO_CAROUSEL",
          title: "Glam Up Highlights",
          subtitle: "Top curated beauty & self-care drops",
          style_variant: "beauty_3up_glam",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 1,
          config: { campaign_badge: "GLAM UP", footer_offer: "Flat ₹100 OFF on 1st Order • Code FIRST100", slides: [] },
        },
        {
          id: "subcategory_nav",
          widget_type: "SUBCATEGORY_NAV",
          title: "Shop By Beauty Category",
          style_variant: "portrait_1row_cards",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 2,
          config: { fallback_items: subcategories.length > 0 ? [] : [{ title: "Skincare", tag: "skincare" }, { title: "Haircare", tag: "haircare" }, { title: "Makeup", tag: "makeup" }, { title: "Fragrances", tag: "fragrance" }, { title: "Bath & Body", tag: "bath" }, { title: "Grooming", tag: "grooming" }] },
        },
        {
          id: "seasonal_beauty_edit",
          widget_type: "THEMED_DEAL_RAIL",
          title: "SEASONAL BEAUTY EDIT",
          subtitle: "Everyday essentials for glowing skin & hair",
          style_variant: "pastel_seasonal_edit",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 3,
          config: { badge_text: "GLOW EDIT", max_items: 6, cards: [] },
        },
        {
          id: "boujee_brands",
          widget_type: "BRAND_SPOTLIGHT_GRID",
          title: "Biggest Beauty Brands",
          subtitle: "Verified cult-favorite & trending labels",
          style_variant: "glow_2col",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 4,
          config: { max_items: 6, brands: [] },
        },
        {
          id: "global_luxe_banner",
          widget_type: "FULL_SPOTLIGHT_BANNER",
          title: "The Luxe Beauty Store",
          subtitle: "Curated premium skincare, fragrances & bridal glam",
          style_variant: "luxe_noir_gold",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 5,
          config: { cta_label: "Explore now", destination_url: `/products?category=${catParam}&sort=discount_desc`, banner_image_url: "" },
        },
        {
          id: "trend_specials",
          widget_type: "TREND_LOOKBOOK",
          title: "Trending Beauty Specials",
          subtitle: "Curated routines & viral favorites",
          style_variant: "editorial_4x5_strip",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 6,
          config: {
            items: [
              { title: "Glass Skin", tag: "skincare", offer: "Up to 45% Off" },
              { title: "Festive Glow", tag: "festive", offer: "Up to 60% Off" },
              { title: "Luxe Picks", tag: "premium", offer: "Up to 35% Off" },
              { title: "The Dewy Edit", tag: "makeup", offer: "Under ₹399" },
            ],
          },
        },
        {
          id: "curated_shelf",
          widget_type: "CURATED_SHELF",
          title: "Fresh Finds & Expert Picks",
          subtitle: "Dermat-tested & customer top-rated formulas",
          style_variant: "pastel_brand_ribbon",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 7,
          config: { max_items: 8, items: [] },
        },
        {
          id: "combo_kits_marquee",
          widget_type: "COMBO_KITS_MARQUEE",
          title: "Value Combos & Beauty Kits",
          subtitle: "Save bigger on curated routine bundles",
          style_variant: "dark_3col_tilted_tape",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 8,
          config: {
            marquee_text: "GLAM UP • ZEBALPHA BEAUTY • UP TO 80% OFF •",
            kits: [
              { id: "skincare-combos", title: "Skincare combos", offer_pill: "Up to 70% Off", tag_filter: "combo", destination_url: `/products?category=${catParam}&tag=combo` },
              { id: "hair-combos", title: "Hair care combos", offer_pill: "Up to 80% Off", tag_filter: "combo", destination_url: `/products?category=${catParam}&tag=combo` },
              { id: "grooming-kits", title: "Grooming & Bath kits", offer_pill: "Up to 60% Off", tag_filter: "combo", destination_url: `/products?category=${catParam}&tag=combo` },
            ],
          },
        },
        {
          id: "budget_discount_tiles",
          widget_type: "BUDGET_DISCOUNT_TILES",
          title: "Budget Beauty Store",
          subtitle: "Best prices & deepest markdowns",
          style_variant: "neon_grid_3x2",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 9,
          config: { price_slabs: [199, 299, 399], discount_slabs: [30, 50, 70] },
        },
        {
          id: "offer_payment_strip",
          widget_type: "OFFER_PAYMENT_STRIP",
          title: "Zebalpha Perks",
          style_variant: "dual_pill_banner",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 10,
          config: {
            left_title: "Get ₹100 OFF on 1st Order",
            left_subtitle: "Apply code FIRST100 on orders ₹399+",
            left_href: `/products?category=${catParam}`,
            right_title: "Free Pan-India Delivery",
            right_subtitle: "Fast COD & UPI checkout above ₹499",
            right_href: `/products?category=${catParam}&sort=price_asc`,
          },
        },
        {
          id: "infinite_product_feed",
          widget_type: "INFINITE_PRODUCT_FEED",
          title: `Explore All ${category.name}`,
          subtitle: "Verified sellers • Direct marketplace prices",
          style_variant: "flipkart_dense_grid",
          enabled: true,
          web_enabled: true,
          app_enabled: true,
          auto_fill: true,
          display_order: 11,
          config: { page_size: 24 },
        },
      ],
    };
  }

  const themeKey: CategoryThemePresetKey =
    arch === "women"
      ? "women_editorial_blush"
      : arch === "electronics"
        ? "electronics_slate_blue"
        : arch === "luxe"
          ? "luxe_champagne_gold"
          : "fashion_streetwear_lime";

  const isWomen = arch === "women";
  const isTech = arch === "electronics";

  return {
    category_id: category.id,
    category_slug: category.slug,
    category_name: category.name,
    is_enabled: true,
    theme_preset: themeKey,
    theme_tokens: CATEGORY_THEME_PRESETS[themeKey].tokens,
    widgets: [
      {
        id: "hero_carousel",
        widget_type: "HERO_CAROUSEL",
        title: `${category.name} Highlights`,
        subtitle: "Top trending drops & mega offers",
        style_variant: "fashion_bold_full",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 1,
        config: { campaign_badge: isWomen ? "STYLE EDIT" : isTech ? "TECH DROP" : "ZEBALPHA DROP", footer_offer: "Flat ₹100 OFF on 1st Order • Code FIRST100", slides: [] },
      },
      {
        id: "subcategory_nav",
        widget_type: "SUBCATEGORY_NAV",
        title: "Shop By Category",
        style_variant: "grid_2row_tiles",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 2,
        config: { fallback_items: [] },
      },
      {
        id: "audience_split",
        widget_type: "AUDIENCE_SPLIT_3COL",
        title: isWomen ? "Shop your vibe" : isTech ? "Shop by need" : "Shop for someone",
        style_variant: isWomen ? "blush_framed" : "mint_framed",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 3,
        config: {
          cards: isWomen
            ? [
                { id: "ethnic", title: "Ethnic Chic", tag_filter: "ethnic", destination_url: `/products?category=${catParam}&tag=ethnic` },
                { id: "western", title: "Western Glam", tag_filter: "western", destination_url: `/products?category=${catParam}&tag=western` },
                { id: "korean", title: "Korean Store", tag_filter: "korean", destination_url: `/products?category=${catParam}&tag=korean` },
              ]
            : [
                { id: "street", title: "Streetwear", tag_filter: "streetwear", destination_url: `/products?category=${catParam}&tag=streetwear` },
                { id: "essentials", title: "Daily Fits", tag_filter: "daily", destination_url: `/products?category=${catParam}&tag=daily` },
                { id: "korean", title: "Korean Store", tag_filter: "korean", destination_url: `/products?category=${catParam}&tag=korean` },
              ],
        },
      },
      {
        id: "back_to_black_rail",
        widget_type: "THEMED_DEAL_RAIL",
        title: isWomen ? "Trending in Blush & Noir" : isTech ? "Top Rated Tech" : "Back to black",
        subtitle: isWomen ? "STATEMENT PICKS" : "ALL THINGS BLACK",
        style_variant: isWomen ? "pastel_seasonal_edit" : "neon_lime_box",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 4,
        config: { color_filter: isWomen || isTech ? "" : "black", max_items: 8, cards: [] },
      },
      {
        id: "clearance_deals_rail",
        widget_type: "THEMED_DEAL_RAIL",
        title: "Clearance deals",
        subtitle: "TOP DEALS",
        style_variant: "noir_black_box",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 5,
        config: { min_discount: 30, max_items: 8, cards: [] },
      },
      {
        id: "steal_deals_rail",
        widget_type: "THEMED_DEAL_RAIL",
        title: "Steal deals",
        subtitle: "Don't miss these, shop now!",
        style_variant: "clean_white",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 6,
        config: { max_items: 8, cards: [] },
      },
      {
        id: "trendy_lookbook",
        widget_type: "TREND_LOOKBOOK",
        title: "Trending this season",
        subtitle: "Serving looks, in the moment",
        style_variant: "dark_2x2_and_rail",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 7,
        config: { badge_brand: "trendy", items: [] },
      },
      {
        id: "budget_discount_tiles",
        widget_type: "BUDGET_DISCOUNT_TILES",
        title: "Budget deals",
        subtitle: "Best fits at best prices!",
        style_variant: "ticket_3col",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 8,
        config: { price_slabs: isTech ? [499, 999, 1999] : [299, 499, 799], discount_slabs: [30, 50, 70] },
      },
      {
        id: "occasion_2col",
        widget_type: "OCCASION_2COL",
        title: "Occasion coming up?",
        subtitle: "Bag your absolute faves!",
        style_variant: isWomen ? "pastel_glam" : "bold_yellow_bar",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 9,
        config: {
          cards: [
            { id: "festive-edit", title: "FESTIVE & WEDDING", tag_filter: "festive", destination_url: `/products?category=${catParam}&tag=festive` },
            { id: "party-edit", title: "PARTY & NIGHT OUT", tag_filter: "party", destination_url: `/products?category=${catParam}&tag=party` },
          ],
        },
      },
      {
        id: "mega_brand_banner",
        widget_type: "FULL_SPOTLIGHT_BANNER",
        title: "MEGA DEALS ON TOP BRANDS",
        subtitle: "Verified Indian labels & factory-direct streetwear",
        style_variant: "brand_ticker_banner",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 10,
        config: { cta_label: "Explore", destination_url: `/products?category=${catParam}&sort=discount_desc`, banner_image_url: "" },
      },
      {
        id: "spotlight_brands",
        widget_type: "BRAND_SPOTLIGHT_GRID",
        title: "Spotlight brands",
        subtitle: "Best marketplace deals!",
        style_variant: "polaroid_3x3",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 11,
        config: { max_items: 9, brands: [] },
      },
      {
        id: "explore_stores",
        widget_type: "EXPLORE_STORES_3X3",
        title: "Explore our stores",
        subtitle: "Best collections to shop from",
        style_variant: isWomen ? "blush_frame_arrow" : "black_frame_arrow",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 12,
        config: {
          stores: [
            { id: "winter", title: "WINTER STORE", tag_filter: "winter", destination_url: `/products?category=${catParam}&tag=winter` },
            { id: "travel", title: "TRAVEL STORE", tag_filter: "travel", destination_url: `/products?category=${catParam}&tag=travel` },
            { id: "gifting", title: "GIFTING STORE", tag_filter: "gifting", destination_url: `/products?category=${catParam}&tag=gifting` },
            { id: "wedding", title: "SHADI KA GHAR", tag_filter: "wedding", destination_url: `/products?category=${catParam}&tag=wedding` },
            { id: "daily", title: "DAILY ESSENTIALS", tag_filter: "daily", destination_url: `/products?category=${catParam}&tag=daily` },
            { id: "combos", title: "COMBO & PACKS", tag_filter: "combo", destination_url: `/products?category=${catParam}&tag=combo` },
            { id: "korean", title: "KOREAN STORE", tag_filter: "korean", destination_url: `/products?category=${catParam}&tag=korean` },
            { id: "oversized", title: "OVERSIZED FIT", tag_filter: "oversized", destination_url: `/products?category=${catParam}&tag=oversized` },
            { id: "street", title: "TRENDY STREET", tag_filter: "trending", destination_url: `/products?category=${catParam}&tag=trending` },
          ],
        },
      },
      {
        id: "offer_payment_strip",
        widget_type: "OFFER_PAYMENT_STRIP",
        title: "Zebalpha Perks",
        style_variant: "dual_pill_banner",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 13,
        config: {
          left_title: "Flat ₹100 OFF on 1st Order",
          left_subtitle: "Use code FIRST100 on orders ₹399+",
          left_href: `/products?category=${catParam}`,
          right_title: "Easy 5-Day Exchange & COD",
          right_subtitle: "Free delivery on orders ₹499+",
          right_href: `/products?category=${catParam}&sort=price_asc`,
        },
      },
      {
        id: "infinite_product_feed",
        widget_type: "INFINITE_PRODUCT_FEED",
        title: `All ${category.name}`,
        subtitle: "Fresh arrivals & top-rated marketplace picks",
        style_variant: "flipkart_dense_grid",
        enabled: true,
        web_enabled: true,
        app_enabled: true,
        auto_fill: true,
        display_order: 14,
        config: { page_size: 24 },
      },
    ],
  };
}
