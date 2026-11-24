/**
 * ============================================================================
 * ZEBALPHA — DYNAMIC EXPERIENCE & FESTIVAL THEME MANAGEMENT SYSTEM (DEMS)
 * Shared Design Tokens, 8 Prebuilt Festival Presets, Schema Validators,
 * and Deterministic Asia/Kolkata Scheduler & Conflict Resolver
 * ============================================================================
 */

export interface ExperienceColorTokens {
  primaryColor: string;
  primaryDark: string;
  primaryLight: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  cardBackground: string;
  primaryText: string;
  secondaryText: string;
  borderColor: string;
  primaryButtonBg: string;
  primaryButtonText: string;
  secondaryButtonBg: string;
  secondaryButtonText: string;
  navBarBg: string;
  navBarIcon: string;
  searchBarBg: string;
  categoryBarBg: string;
  priceColor: string;
  discountBadgeColor: string;
  promoBadgeColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
}

export interface ExperienceTypographyTokens {
  headingStyle: "sans" | "serif" | "display";
  bodyTextStyle: "sans" | "clean";
  fontWeight: "normal" | "medium" | "bold" | "black";
  headingColor: string;
  bodyColor: string;
  buttonTextWeight: "semibold" | "bold" | "black";
}

export interface ExperienceAssetTokens {
  festivalBackgroundUrl: string;
  homepageHeroArtworkUrl: string;
  headerArtworkUrl: string;
  festivalLogoUrl: string;
  promotionalArtworkUrl: string;
  categoryArtworkUrl: string;
  sectionBackgroundUrl: string;
  popupArtworkUrl: string;
}

export interface ExperienceHomeSectionItem {
  id: string;
  section_key: string;
  widget_type:
    | "HERO_CAROUSEL"
    | "TRUST_BADGE_STRIP"
    | "MARQUEE_TICKER"
    | "CURATED_COLLECTIONS"
    | "PROMO_DROP_CAROUSEL"
    | "FLASH_DEAL_STRIP"
    | "FESTIVE_16_SLOT_GRID"
    | "CUSTOM_STUDIO_EDITORIAL"
    | "SELLER_BRAND_SPOTLIGHT"
    | "FEATURED_PRODUCT_FEED"
    | "RECENTLY_VIEWED";
  title: string;
  subtitle: string;
  display_order: number;
  is_visible: boolean;
  web_enabled: boolean;
  app_enabled: boolean;
  style_variant: "default" | "festive_card" | "coral_highlight" | "gold_accent";
  background_color?: string;
  artwork_url?: string;
  start_at?: string | null;
  end_at?: string | null;
  target_audience: "all" | "new_users" | "returning_users" | "app_only" | "web_only";
  destination_url?: string;
  settings_json?: Record<string, any>;
}

export type BannerDestinationType =
  | "product"
  | "category"
  | "collection"
  | "campaign"
  | "page"
  | "external";

export interface ExperienceBannerItem {
  id: string;
  experience_id?: string;
  title: string;
  subtitle?: string;
  image_url: string;
  mobile_image_url?: string;
  desktop_image_url?: string;
  destination_type: BannerDestinationType;
  destination_value: string;
  campaign_id?: string | null;
  priority: number;
  start_at?: string | null;
  end_at?: string | null;
  target_audience: "all" | "app_only" | "web_only" | "new_users";
  status: "active" | "scheduled" | "disabled" | "draft";
}

export type CampaignCategoryType =
  | "Festival Sale"
  | "Seasonal Sale"
  | "Special Collection"
  | "New Arrivals"
  | "Limited-Time Promotion"
  | "Brand Campaign";

export interface ExperienceCampaignItem {
  id: string;
  name: string;
  description: string;
  artwork_url?: string;
  campaign_type: CampaignCategoryType;
  start_at?: string | null;
  end_at?: string | null;
  priority: number;
  associated_theme_id?: string | null;
  associated_banner_ids: string[];
  associated_section_keys: string[];
  destination_url: string;
  badge_text?: string;
  status: "active" | "scheduled" | "draft" | "expired" | "paused";
}

export type PopupDisplayFrequency =
  | "once_per_session"
  | "once_per_day"
  | "once_per_campaign"
  | "every_visit";

export interface ExperiencePopupItem {
  id: string;
  experience_id?: string;
  popup_type:
    | "Welcome Popup"
    | "Festival Popup"
    | "Promotional Popup"
    | "Campaign Popup"
    | "Announcement Popup";
  title: string;
  description: string;
  image_url?: string;
  button_text: string;
  destination_type: BannerDestinationType;
  destination_value: string;
  display_frequency: PopupDisplayFrequency;
  dismissal_behavior: "close_button_and_backdrop" | "close_button_only";
  target_audience: "all" | "new_users" | "app_only" | "web_only";
  priority: number;
  start_at?: string | null;
  end_at?: string | null;
  status: "active" | "scheduled" | "disabled" | "draft";
}

export interface ExperienceAnnouncementItem {
  id: string;
  experience_id?: string;
  title: string;
  message: string;
  icon_key?: "crown" | "flame" | "tag" | "truck" | "shield" | "bell";
  image_url?: string;
  cta_text?: string;
  destination_value?: string;
  priority: number;
  start_at?: string | null;
  end_at?: string | null;
  status: "active" | "scheduled" | "disabled" | "draft";
}

export interface ExperienceRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  festival_name: string;
  thumbnail_url?: string;
  experience_type: "default" | "festival" | "seasonal" | "campaign" | "custom";
  status: "active" | "scheduled" | "draft" | "archived" | "expired";
  is_default: boolean;
  priority: number;
  start_at?: string | null;
  end_at?: string | null;
  timezone: string;
  schema_version: number;
  published_version: number;
  draft_version: number;
  theme_tokens: ExperienceColorTokens;
  typography: ExperienceTypographyTokens;
  assets: ExperienceAssetTokens;
  home_sections: ExperienceHomeSectionItem[];
  created_by: string;
  last_published_by?: string | null;
  last_published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperiencePublicationSnapshot {
  id: string;
  experience_id: string;
  experience_name: string;
  festival_name: string;
  version: number;
  version_label: string;
  configuration_snapshot_json: {
    experience: ExperienceRecord;
    banners: ExperienceBannerItem[];
    campaigns: ExperienceCampaignItem[];
    popups: ExperiencePopupItem[];
    announcements: ExperienceAnnouncementItem[];
  };
  published_by: string;
  published_at: string;
  status: "published" | "rolled_back" | "superseded";
}

export interface ExperienceAuditLogItem {
  id: string;
  admin_id?: string | null;
  admin_email: string;
  action:
    | "CREATE_EXPERIENCE"
    | "UPDATE_EXPERIENCE"
    | "DUPLICATE_EXPERIENCE"
    | "SAVE_DRAFT"
    | "PUBLISH_EXPERIENCE"
    | "SCHEDULE_EXPERIENCE"
    | "UNPUBLISH_EXPERIENCE"
    | "ROLLBACK_EXPERIENCE"
    | "ARCHIVE_EXPERIENCE"
    | "UPDATE_BANNERS"
    | "UPDATE_CAMPAIGNS"
    | "UPDATE_POPUPS"
    | "UPDATE_ANNOUNCEMENTS"
    | "EMERGENCY_RESET_DEFAULT";
  experience_id: string;
  experience_name?: string;
  previous_version?: number | null;
  new_version?: number | null;
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface CustomerActiveExperiencePayload {
  version: number;
  schemaVersion: number;
  activeExperienceId: string;
  name: string;
  slug: string;
  festivalName: string;
  experienceType: string;
  isDefault: boolean;
  timezone: string;
  effectiveStartAt: string | null;
  effectiveEndAt: string | null;
  lastUpdatedAt: string;
  lastPublishedBy: string;
  themeTokens: ExperienceColorTokens;
  typography: ExperienceTypographyTokens;
  assets: ExperienceAssetTokens;
  homeSections: ExperienceHomeSectionItem[];
  banners: ExperienceBannerItem[];
  campaigns: ExperienceCampaignItem[];
  popups: ExperiencePopupItem[];
  announcements: ExperienceAnnouncementItem[];
}

export const DEFAULT_HOME_SECTIONS: ExperienceHomeSectionItem[] = [
  {
    id: "sec_hero_carousel",
    section_key: "hero_carousel",
    widget_type: "HERO_CAROUSEL",
    title: "Main Hero Banners",
    subtitle: "Top sliding promotional banners",
    display_order: 1,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    destination_url: "/products",
    settings_json: {},
  },
  {
    id: "sec_trust_badge_strip",
    section_key: "trust_badge_strip",
    widget_type: "TRUST_BADGE_STRIP",
    title: "3-Column Trust & Delivery Strip",
    subtitle: "Free Delivery, Easy Returns, Secure Shopping",
    display_order: 2,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    settings_json: {},
  },
  {
    id: "sec_marquee_ticker",
    section_key: "marquee_ticker",
    widget_type: "MARQUEE_TICKER",
    title: "Scrolling Offer Marquee",
    subtitle: "Continuous promotional announcement ticker",
    display_order: 3,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    settings_json: {},
  },
  {
    id: "sec_curated_collections",
    section_key: "curated_collections",
    widget_type: "CURATED_COLLECTIONS",
    title: "Curated Collections",
    subtitle: "Handpicked styles for the culture",
    display_order: 4,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    destination_url: "/categories",
    settings_json: {},
  },
  {
    id: "sec_promo_drop_carousel",
    section_key: "promo_drop_carousel",
    widget_type: "PROMO_DROP_CAROUSEL",
    title: "1st Order ₹100 OFF & New Season Drop Slider",
    subtitle: "Auto-sliding conversion cards",
    display_order: 5,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    destination_url: "/new-drops",
    settings_json: { show_first_order_slide: true, show_new_drop_slide: true },
  },
  {
    id: "sec_flash_deal_strip",
    section_key: "flash_deal_strip",
    widget_type: "FLASH_DEAL_STRIP",
    title: "Flash Culture Deals",
    subtitle: "Limited-time price drops — grab before timer ends",
    display_order: 6,
    is_visible: false,
    web_enabled: true,
    app_enabled: true,
    style_variant: "festive_card",
    target_audience: "all",
    destination_url: "/products",
    settings_json: {
      badge_text: "LIVE FLASH SALE",
      ends_at: "",
      product_ids: [],
      max_items: 8,
      cta_label: "View All Deals",
      cta_href: "/products",
    },
  },
  {
    id: "sec_festive_16_slot_grid",
    section_key: "festive_16_slot_grid",
    widget_type: "FESTIVE_16_SLOT_GRID",
    title: "TOP DEALS",
    subtitle: "Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger",
    display_order: 7,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "festive_card",
    target_audience: "all",
    destination_url: "/products",
    settings_json: { campaign_slug: "top-deals" },
  },
  {
    id: "sec_custom_studio_editorial",
    section_key: "custom_studio_editorial",
    widget_type: "CUSTOM_STUDIO_EDITORIAL",
    title: "Customize & Wear Your Art",
    subtitle:
      "Tap any artwork below to open Custom Studio with that exact design ready on tees, hoodies & totes.",
    display_order: 8,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    destination_url: "/customize",
    settings_json: {
      eyebrow: "ZEBALPHA CUSTOM STUDIO",
      title_line_1: "Customize &",
      title_line_2: "Wear Your Art",
    },
  },
  {
    id: "sec_seller_brand_spotlight",
    section_key: "seller_brand_spotlight",
    widget_type: "SELLER_BRAND_SPOTLIGHT",
    title: "Featured Brand Showcase",
    subtitle: "Spotlight • Emerging Indian Brands",
    display_order: 9,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    settings_json: {},
  },
  {
    id: "sec_featured_product_feed",
    section_key: "featured_product_feed",
    widget_type: "FEATURED_PRODUCT_FEED",
    title: "Our Products",
    subtitle: "Streetwear, polos, hoodies & curated culture drops",
    display_order: 10,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    destination_url: "/products",
    settings_json: { cta_label: "Create", cta_href: "/customize" },
  },
  {
    id: "sec_recently_viewed",
    section_key: "recently_viewed",
    widget_type: "RECENTLY_VIEWED",
    title: "Recently Viewed",
    subtitle: "Pick up right where you left off",
    display_order: 11,
    is_visible: true,
    web_enabled: true,
    app_enabled: true,
    style_variant: "default",
    target_audience: "all",
    settings_json: {},
  },
];

export const DEFAULT_ASSETS: ExperienceAssetTokens = {
  festivalBackgroundUrl: "",
  homepageHeroArtworkUrl: "/banner-grand-opening.jpg",
  headerArtworkUrl: "/festive-header-bg.jpg",
  festivalLogoUrl: "/official-logo.png",
  promotionalArtworkUrl: "",
  categoryArtworkUrl: "",
  sectionBackgroundUrl: "",
  popupArtworkUrl: "",
};

export const DEFAULT_TYPOGRAPHY: ExperienceTypographyTokens = {
  headingStyle: "sans",
  bodyTextStyle: "sans",
  fontWeight: "black",
  headingColor: "#14120F",
  bodyColor: "#3F3626",
  buttonTextWeight: "black",
};

/**
 * 8 Editable Prebuilt Festival Theme Templates
 * Preset #1 is the Official ZebAlpha Bright Coral + Warm Coral + Pure White identity.
 */
export const PREBUILT_EXPERIENCE_PRESETS: ExperienceRecord[] = [
  {
    id: "exp_default_zebalpha",
    name: "Default ZebAlpha Theme",
    slug: "default-zebalpha",
    description:
      "Official ZebAlpha Bright Coral, Warm Coral & Pure White marketplace identity with Champagne Gold accents.",
    festival_name: "ZebAlpha Official Everyday",
    thumbnail_url: "/official-logo.png",
    experience_type: "default",
    status: "active",
    is_default: true,
    priority: 1,
    start_at: null,
    end_at: null,
    timezone: "Asia/Kolkata",
    schema_version: 1,
    published_version: 1,
    draft_version: 1,
    theme_tokens: {
      primaryColor: "#F03A46",
      primaryDark: "#C81E2B",
      primaryLight: "#FD5852",
      secondaryColor: "#FEAA90",
      accentColor: "#F5B922",
      backgroundColor: "#FFFFFF",
      surfaceColor: "#FFFDF8",
      cardBackground: "#FFFFFF",
      primaryText: "#14120F",
      secondaryText: "#5C4E35",
      borderColor: "#EAD296",
      primaryButtonBg: "#F03A46",
      primaryButtonText: "#FFFFFF",
      secondaryButtonBg: "#FFFFFF",
      secondaryButtonText: "#F03A46",
      navBarBg: "#FFFDF8",
      navBarIcon: "#14120F",
      searchBarBg: "#FFFFFF",
      categoryBarBg: "#FFF5F2",
      priceColor: "#14120F",
      discountBadgeColor: "#047857",
      promoBadgeColor: "#F03A46",
      successColor: "#059669",
      warningColor: "#D97706",
      errorColor: "#DC2626",
    },
    typography: { ...DEFAULT_TYPOGRAPHY },
    assets: { ...DEFAULT_ASSETS },
    home_sections: DEFAULT_HOME_SECTIONS.map((s) => ({ ...s })),
    created_by: "system",
    last_published_by: "Super Admin",
    last_published_at: "2026-11-24T00:00:00.000Z",
    created_at: "2026-11-24T00:00:00.000Z",
    updated_at: "2026-11-24T00:00:00.000Z",
  },
  {
    id: "exp_durga_puja",
    name: "Durga Puja Utsav Theme",
    slug: "durga-puja",
    description:
      "Festive Sindoor Red, Ivory White & Royal Gold accents celebrating Bengal's biggest Sharodiya festival.",
    festival_name: "Durga Puja",
    thumbnail_url: "/festive-header-bg.jpg",
    experience_type: "festival",
    status: "draft",
    is_default: false,
    priority: 10,
    start_at: null,
    end_at: null,
    timezone: "Asia/Kolkata",
    schema_version: 1,
    published_version: 0,
    draft_version: 1,
    theme_tokens: {
      primaryColor: "#D91B24",
      primaryDark: "#9E0B14",
      primaryLight: "#F43F5E",
      secondaryColor: "#F59E0B",
      accentColor: "#FBBF24",
      backgroundColor: "#FFFDF9",
      surfaceColor: "#FFF8EC",
      cardBackground: "#FFFFFF",
      primaryText: "#1C100B",
      secondaryText: "#6B4423",
      borderColor: "#F3C677",
      primaryButtonBg: "#D91B24",
      primaryButtonText: "#FFFFFF",
      secondaryButtonBg: "#FFFFFF",
      secondaryButtonText: "#D91B24",
      navBarBg: "#FFFDF9",
      navBarIcon: "#9E0B14",
      searchBarBg: "#FFFFFF",
      categoryBarBg: "#FFF1E6",
      priceColor: "#9E0B14",
      discountBadgeColor: "#D91B24",
      promoBadgeColor: "#B45309",
      successColor: "#059669",
      warningColor: "#D97706",
      errorColor: "#DC2626",
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingStyle: "serif", headingColor: "#1C100B" },
    assets: { ...DEFAULT_ASSETS },
    home_sections: DEFAULT_HOME_SECTIONS.map((s) =>
      s.section_key === "curated_collections"
        ? { ...s, title: "Sharodiya Pujo Collections", subtitle: "Festive streetwear & ethnic drops for Pujo" }
        : s.section_key === "festive_16_slot_grid"
        ? { ...s, title: "PUJO MAHA DEALS", subtitle: "Shubho Sharodiya • Up to 70% OFF across categories" }
        : { ...s }
    ),
    created_by: "system",
    created_at: "2026-11-24T00:00:00.000Z",
    updated_at: "2026-11-24T00:00:00.000Z",
  },
  {
    id: "exp_diwali_mahotsav",
    name: "Diwali Festival of Lights Theme",
    slug: "diwali-theme",
    description:
      "Deep Royal Crimson Red, Golden Yellow Diyas & Warm Silk Ivory background for Grand Diwali Sale.",
    festival_name: "Diwali",
    thumbnail_url: "/festive-header-bg.jpg",
    experience_type: "festival",
    status: "draft",
    is_default: false,
    priority: 10,
    start_at: null,
    end_at: null,
    timezone: "Asia/Kolkata",
    schema_version: 1,
    published_version: 0,
    draft_version: 1,
    theme_tokens: {
      primaryColor: "#B91C1C",
      primaryDark: "#7F1D1D",
      primaryLight: "#DC2626",
      secondaryColor: "#EAB308",
      accentColor: "#FACC15",
      backgroundColor: "#FFFBEB",
      surfaceColor: "#FEF3C7",
      cardBackground: "#FFFFFF",
      primaryText: "#1E120A",
      secondaryText: "#78350F",
      borderColor: "#F59E0B",
      primaryButtonBg: "#B91C1C",
      primaryButtonText: "#FFFFFF",
      secondaryButtonBg: "#FFFBEB",
      secondaryButtonText: "#B91C1C",
      navBarBg: "#FFFBEB",
      navBarIcon: "#7F1D1D",
      searchBarBg: "#FFFFFF",
      categoryBarBg: "#FEF3C7",
      priceColor: "#991B1B",
      discountBadgeColor: "#B45309",
      promoBadgeColor: "#B91C1C",
      successColor: "#059669",
      warningColor: "#D97706",
      errorColor: "#DC2626",
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingStyle: "serif", headingColor: "#1E120A" },
    assets: { ...DEFAULT_ASSETS },
    home_sections: DEFAULT_HOME_SECTIONS.map((s) =>
      s.section_key === "festive_16_slot_grid"
        ? { ...s, title: "DIWALI GRAND DEALS", subtitle: "Celebrate Bigger • Light Up Your Wardrobe" }
        : s.section_key === "flash_deal_strip"
        ? { ...s, is_visible: true, title: "Diwali Pataka Flash Deals" }
        : { ...s }
    ),
    created_by: "system",
    created_at: "2026-11-24T00:00:00.000Z",
    updated_at: "2026-11-24T00:00:00.000Z",
  },
  {
    id: "exp_holi_splash",
    name: "Holi Rangotsav Theme",
    slug: "holi-theme",
    description:
      "Bright Coral, Sunny Yellow & Vibrant Pink celebration palette for Spring & Holi Fest.",
    festival_name: "Holi",
    thumbnail_url: "/official-logo.png",
    experience_type: "festival",
    status: "draft",
    is_default: false,
    priority: 9,
    start_at: null,
    end_at: null,
    timezone: "Asia/Kolkata",
    schema_version: 1,
    published_version: 0,
    draft_version: 1,
    theme_tokens: {
      primaryColor: "#EC4899",
      primaryDark: "#BE185D",
      primaryLight: "#F472B6",
      secondaryColor: "#F97316",
      accentColor: "#FACC15",
      backgroundColor: "#FFFDFD",
      surfaceColor: "#FDF2F8",
      cardBackground: "#FFFFFF",
      primaryText: "#1F121D",
      secondaryText: "#701A75",
      borderColor: "#F9A8D4",
      primaryButtonBg: "#EC4899",
      primaryButtonText: "#FFFFFF",
      secondaryButtonBg: "#FFFFFF",
      secondaryButtonText: "#EC4899",
      navBarBg: "#FFFDFD",
      navBarIcon: "#BE185D",
      searchBarBg: "#FFFFFF",
      categoryBarBg: "#FCE7F3",
      priceColor: "#BE185D",
      discountBadgeColor: "#D97706",
      promoBadgeColor: "#EC4899",
      successColor: "#059669",
      warningColor: "#D97706",
      errorColor: "#DC2626",
    },
    typography: { ...DEFAULT_TYPOGRAPHY },
    assets: { ...DEFAULT_ASSETS },
    home_sections: DEFAULT_HOME_SECTIONS.map((s) => ({ ...s })),
    created_by: "system",
    created_at: "2026-11-24T00:00:00.000Z",
    updated_at: "2026-11-24T00:00:00.000Z",
  },
  {
    id: "exp_eid_royal",
    name: "Eid Royal Emerald & Gold Theme",
    slug: "eid-theme",
    description:
      "Royal Emerald Green, Champagne Gold & Soft Ivory luxury palette for Eid Celebrations.",
    festival_name: "Eid-ul-Fitr",
    thumbnail_url: "/official-logo.png",
    experience_type: "festival",
    status: "draft",
    is_default: false,
    priority: 9,
    start_at: null,
    end_at: null,
    timezone: "Asia/Kolkata",
    schema_version: 1,
    published_version: 0,
    draft_version: 1,
    theme_tokens: {
      primaryColor: "#047857",
      primaryDark: "#064E3B",
      primaryLight: "#10B981",
      secondaryColor: "#D97706",
      accentColor: "#F59E0B",
      backgroundColor: "#FAFDFB",
      surfaceColor: "#ECFDF5",
      cardBackground: "#FFFFFF",
      primaryText: "#062C21",
      secondaryText: "#065F46",
      borderColor: "#A7F3D0",
      primaryButtonBg: "#047857",
      primaryButtonText: "#FFFFFF",
      secondaryButtonBg: "#FFFFFF",
      secondaryButtonText: "#047857",
      navBarBg: "#FAFDFB",
      navBarIcon: "#047857",
      searchBarBg: "#FFFFFF",
      categoryBarBg: "#D1FAE5",
      priceColor: "#064E3B",
      discountBadgeColor: "#B45309",
      promoBadgeColor: "#047857",
      successColor: "#059669",
      warningColor: "#D97706",
      errorColor: "#DC2626",
    },
    typography: { ...DEFAULT_TYPOGRAPHY, headingStyle: "serif" },
    assets: { ...DEFAULT_ASSETS },
    home_sections: DEFAULT_HOME_SECTIONS.map((s) => ({ ...s })),
    created_by: "system",
    created_at: "2026-11-24T00:00:00.000Z",
    updated_at: "2026-11-24T00:00:00.000Z",
  },
  {
    id: "exp_independence_day",
    name: "Independence Day Tiranga Theme",
    slug: "independence-day",
    description:
      "Proud Indian Saffron, Pure White & Emerald Green theme for 15th August Freedom Sale.",
    festival_name: "Independence Day",
    thumbnail_url: "/official-logo.png",
    experience_type: "festival",
    status: "draft",
    is_default: false,
    priority: 9,
    start_at: null,
    end_at: null,
    timezone: "Asia/Kolkata",
    schema_version: 1,
    published_version: 0,
    draft_version: 1,
    theme_tokens: {
      primaryColor: "#EA580C",
      primaryDark: "#C2410C",
      primaryLight: "#FB923C",
      secondaryColor: "#15803D",
      accentColor: "#1D4ED8",
      backgroundColor: "#FFFFFF",
      surfaceColor: "#FFF7ED",
      cardBackground: "#FFFFFF",
      primaryText: "#14120F",
      secondaryText: "#431407",
      borderColor: "#FDBA74",
      primaryButtonBg: "#EA580C",
      primaryButtonText: "#FFFFFF",
      secondaryButtonBg: "#FFFFFF",
      secondaryButtonText: "#15803D",
      navBarBg: "#FFFFFF",
      navBarIcon: "#EA580C",
      searchBarBg: "#FFFFFF",
      categoryBarBg: "#FFEDD5",
      priceColor: "#14120F",
      discountBadgeColor: "#15803D",
      promoBadgeColor: "#EA580C",
      successColor: "#15803D",
      warningColor: "#D97706",
      errorColor: "#DC2626",
    },
    typography: { ...DEFAULT_TYPOGRAPHY },
    assets: { ...DEFAULT_ASSETS },
    home_sections: DEFAULT_HOME_SECTIONS.map((s) => ({ ...s })),
    created_by: "system",
    created_at: "2026-11-24T00:00:00.000Z",
    updated_at: "2026-11-24T00:00:00.000Z",
  },
  {
    id: "exp_christmas_winter",
    name: "Christmas & Winter Wonderland Theme",
    slug: "christmas-theme",
    description:
      "Festive Berry Red, Pine Green & Crisp Snow White theme for December Winter & Christmas Drops.",
    festival_name: "Christmas",
    thumbnail_url: "/official-logo.png",
    experience_type: "festival",
    status: "draft",
    is_default: false,
    priority: 9,
    start_at: null,
    end_at: null,
    timezone: "Asia/Kolkata",
    schema_version: 1,
    published_version: 0,
    draft_version: 1,
    theme_tokens: {
      primaryColor: "#DC2626",
      primaryDark: "#991B1B",
      primaryLight: "#EF4444",
      secondaryColor: "#166534",
      accentColor: "#EAB308",
      backgroundColor: "#FFFFFF",
      surfaceColor: "#FEF2F2",
      cardBackground: "#FFFFFF",
      primaryText: "#14120F",
      secondaryText: "#3F3F46",
      borderColor: "#FECACA",
      primaryButtonBg: "#DC2626",
      primaryButtonText: "#FFFFFF",
      secondaryButtonBg: "#FFFFFF",
      secondaryButtonText: "#166534",
      navBarBg: "#FFFFFF",
      navBarIcon: "#DC2626",
      searchBarBg: "#FFFFFF",
      categoryBarBg: "#FEE2E2",
      priceColor: "#991B1B",
      discountBadgeColor: "#166534",
      promoBadgeColor: "#DC2626",
      successColor: "#166534",
      warningColor: "#D97706",
      errorColor: "#DC2626",
    },
    typography: { ...DEFAULT_TYPOGRAPHY },
    assets: { ...DEFAULT_ASSETS },
    home_sections: DEFAULT_HOME_SECTIONS.map((s) => ({ ...s })),
    created_by: "system",
    created_at: "2026-11-24T00:00:00.000Z",
    updated_at: "2026-11-24T00:00:00.000Z",
  },
  {
    id: "exp_new_year_gold",
    name: "New Year Gold Celebration Theme",
    slug: "new-year-theme",
    description:
      "Warm Champagne Gold, Coral Highlights & Celebration Ivory for New Year Drop.",
    festival_name: "New Year",
    thumbnail_url: "/official-logo.png",
    experience_type: "festival",
    status: "draft",
    is_default: false,
    priority: 9,
    start_at: null,
    end_at: null,
    timezone: "Asia/Kolkata",
    schema_version: 1,
    published_version: 0,
    draft_version: 1,
    theme_tokens: {
      primaryColor: "#D97706",
      primaryDark: "#92400E",
      primaryLight: "#F59E0B",
      secondaryColor: "#F03A46",
      accentColor: "#EAB308",
      backgroundColor: "#FFFDF7",
      surfaceColor: "#FEF9C3",
      cardBackground: "#FFFFFF",
      primaryText: "#14120F",
      secondaryText: "#5C4924",
      borderColor: "#FDE047",
      primaryButtonBg: "#D97706",
      primaryButtonText: "#FFFFFF",
      secondaryButtonBg: "#FFFFFF",
      secondaryButtonText: "#D97706",
      navBarBg: "#FFFDF7",
      navBarIcon: "#92400E",
      searchBarBg: "#FFFFFF",
      categoryBarBg: "#FEF3C7",
      priceColor: "#14120F",
      discountBadgeColor: "#F03A46",
      promoBadgeColor: "#D97706",
      successColor: "#059669",
      warningColor: "#D97706",
      errorColor: "#DC2626",
    },
    typography: { ...DEFAULT_TYPOGRAPHY },
    assets: { ...DEFAULT_ASSETS },
    home_sections: DEFAULT_HOME_SECTIONS.map((s) => ({ ...s })),
    created_by: "system",
    created_at: "2026-11-24T00:00:00.000Z",
    updated_at: "2026-11-24T00:00:00.000Z",
  },
];

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

export function isValidHexColor(val: unknown): boolean {
  return typeof val === "string" && HEX_COLOR_RE.test(val.trim());
}

export function sanitizeHexColor(val: unknown, fallback: string): string {
  if (typeof val === "string" && HEX_COLOR_RE.test(val.trim())) {
    return val.trim();
  }
  return fallback;
}

export function validateDestinationUrl(type: BannerDestinationType, value: string): {
  valid: boolean;
  normalizedUrl: string;
  error?: string;
} {
  const clean = String(value || "").trim();
  if (!clean) {
    return { valid: false, normalizedUrl: "/products", error: "Destination value is required." };
  }
  if (type === "external") {
    if (!/^https?:\/\//i.test(clean)) {
      return {
        valid: false,
        normalizedUrl: clean,
        error: "External URLs must start with https:// or http://",
      };
    }
    return { valid: true, normalizedUrl: clean };
  }
  if (clean.startsWith("/")) {
    return { valid: true, normalizedUrl: clean };
  }
  if (type === "product") return { valid: true, normalizedUrl: `/products/${clean}` };
  if (type === "category") return { valid: true, normalizedUrl: `/products?category=${encodeURIComponent(clean)}` };
  if (type === "collection") return { valid: true, normalizedUrl: `/collections` };
  if (type === "campaign") return { valid: true, normalizedUrl: `/new-drops` };
  return { valid: true, normalizedUrl: `/${clean}` };
}

/**
 * Deterministic Experience Scheduler & Priority Resolver (Asia/Kolkata)
 * - Automatically activates scheduled experiences whose start_at <= nowMs and (end_at is null or end_at > nowMs)
 * - Automatically expires experiences whose end_at <= nowMs
 * - Resolves overlaps deterministically: higher `priority` wins; ties broken by most recent `updated_at`
 * - Always guarantees a valid fallback to the Default ZebAlpha Theme
 */
export function resolveActiveExperience(
  experiences: ExperienceRecord[],
  nowMs: number = Date.now()
): {
  activeExperience: ExperienceRecord;
  updatedExperiences: ExperienceRecord[];
  autoActivatedIds: string[];
  autoExpiredIds: string[];
} {
  const defaultPreset =
    experiences.find((e) => e.is_default) || PREBUILT_EXPERIENCE_PRESETS[0];

  const autoActivatedIds: string[] = [];
  const autoExpiredIds: string[] = [];

  const updatedExperiences = experiences.map((exp) => {
    const startMs = exp.start_at ? new Date(exp.start_at).getTime() : null;
    const endMs = exp.end_at ? new Date(exp.end_at).getTime() : null;

    // 1. Check expiration first (never allow an expired non-default campaign to remain active)
    if (
      !exp.is_default &&
      (exp.status === "active" || exp.status === "scheduled") &&
      endMs !== null &&
      !Number.isNaN(endMs) &&
      endMs <= nowMs
    ) {
      autoExpiredIds.push(exp.id);
      return { ...exp, status: "expired" as const };
    }

    // 2. Check scheduled activation
    if (
      exp.status === "scheduled" &&
      startMs !== null &&
      !Number.isNaN(startMs) &&
      startMs <= nowMs &&
      (endMs === null || Number.isNaN(endMs) || endMs > nowMs)
    ) {
      autoActivatedIds.push(exp.id);
      return { ...exp, status: "active" as const };
    }

    return exp;
  });

  // 3. Collect all currently eligible active experiences
  const eligible = updatedExperiences.filter((exp) => {
    if (exp.status !== "active") return false;
    const startMs = exp.start_at ? new Date(exp.start_at).getTime() : null;
    const endMs = exp.end_at ? new Date(exp.end_at).getTime() : null;
    if (startMs !== null && !Number.isNaN(startMs) && startMs > nowMs) return false;
    if (!exp.is_default && endMs !== null && !Number.isNaN(endMs) && endMs <= nowMs) return false;
    return true;
  });

  if (eligible.length === 0) {
    return {
      activeExperience: { ...defaultPreset, status: "active" },
      updatedExperiences,
      autoActivatedIds,
      autoExpiredIds,
    };
  }

  // Deterministic tie-breaker: non-default active festival with highest priority, then latest updated_at
  const sorted = [...eligible].sort((a, b) => {
    if (a.is_default !== b.is_default && eligible.length > 1) {
      return a.is_default ? 1 : -1;
    }
    const prioDiff = Number(b.priority || 0) - Number(a.priority || 0);
    if (prioDiff !== 0) return prioDiff;
    const timeA = new Date(a.updated_at || 0).getTime();
    const timeB = new Date(b.updated_at || 0).getTime();
    return timeB - timeA;
  });

  return {
    activeExperience: sorted[0],
    updatedExperiences,
    autoActivatedIds,
    autoExpiredIds,
  };
}

export interface ScheduleConflictWarning {
  experienceAId: string;
  experienceAName: string;
  experienceBId: string;
  experienceBName: string;
  overlapStart: string;
  overlapEnd: string;
  samePriority: boolean;
  priorityA: number;
  priorityB: number;
}

/**
 * Detects overlapping date ranges between scheduled/active non-default experiences
 */
export function detectScheduleConflicts(
  experiences: ExperienceRecord[]
): ScheduleConflictWarning[] {
  const candidates = experiences.filter(
    (e) =>
      !e.is_default &&
      (e.status === "scheduled" || e.status === "active") &&
      e.start_at &&
      e.end_at
  );

  const warnings: ScheduleConflictWarning[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const aStart = new Date(a.start_at!).getTime();
      const aEnd = new Date(a.end_at!).getTime();
      const bStart = new Date(b.start_at!).getTime();
      const bEnd = new Date(b.end_at!).getTime();

      if (
        !Number.isNaN(aStart) &&
        !Number.isNaN(aEnd) &&
        !Number.isNaN(bStart) &&
        !Number.isNaN(bEnd) &&
        aStart < bEnd &&
        bStart < aEnd
      ) {
        warnings.push({
          experienceAId: a.id,
          experienceAName: a.name,
          experienceBId: b.id,
          experienceBName: b.name,
          overlapStart: new Date(Math.max(aStart, bStart)).toISOString(),
          overlapEnd: new Date(Math.min(aEnd, bEnd)).toISOString(),
          samePriority: Number(a.priority || 0) === Number(b.priority || 0),
          priorityA: Number(a.priority || 0),
          priorityB: Number(b.priority || 0),
        });
      }
    }
  }
  return warnings;
}
