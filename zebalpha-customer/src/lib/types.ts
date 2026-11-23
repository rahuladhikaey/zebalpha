export type Category = {
  id: number | string;
  name: string;
  image_url?: string | null;
  main_category?: string;
  description?: string | null;
  icon?: string;
  icon_key?: string;
  icon_url?: string | null;
  icon_source?: string;
  slug?: string;
  sort_order?: number;
  display_order?: number;
  is_active?: boolean;
  parent_id?: string | null;
  subcategories?: Category[];
};

export type ProductPackage = {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  color?: string;
  color_hex?: string;
  size?: string;
  stock?: number;
  image_url?: string;
  gallery?: string[];
  sku?: string;
  isBestSeller?: boolean;
};

export type Product = {
  id: number | string;
  name: string;
  price: number;
  mrp?: number;
  description: string;
  image_url: string;
  images?: string[];
  video_proof_url?: string;
  category_id?: number | string;
  category_name?: string;
  category?: string;
  offers?: string[];
  specifications?: Record<string, any>;
  brand?: string;
  stock?: number;
  sku?: string;
  low_stock_limit?: number;
  status?: string;
  is_active?: boolean;
  is_approved?: boolean;
  approval_status?: string;
  packages?: ProductPackage[];
  rating?: number;
  review_count?: number;
  seller_id?: string;
  seller_name?: string;
  business_name?: string;
  seller?: {
    business_name?: string;
    city?: string;
    state?: string;
    business_logo_url?: string;
    social_page_url?: string;
    social_platform?: string;
  };
  seller_city?: string;
  seller_logo?: string;
  seller_social_url?: string;
  seller_social_platform?: string;
  seller_store_slug?: string | null;
  seller_store_active?: boolean;
  seller_store_tagline?: string | null;
  virtual_tryon_image?: string;
  virtual_tryon_category?: 'upper_body' | 'lower_body' | 'dresses' | 'outerwear' | string;
  is_vto_enabled?: boolean;
  is_premium?: boolean;
  is_new_drop?: boolean;
  collection?: string;
  drop_date?: string;
  tier?: 'STANDARD' | 'PREMIUM' | 'LIMITED' | string;
  default_color?: string;
  main_color?: string;
  mainColorId?: string;
  defaultColorId?: string;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
};


export type CartItem = Product & {
  quantity: number;
  cart_item_key?: string;
  package_name?: string;
  variant_id?: string;
  selected_color?: string;
  selected_size?: string;
  selected_sku?: string;
  selected_image?: string;
};

export type OrderPayload = {
  customer_name: string;
  phone: string;
  address: string;
  items: Array<{ name: string; quantity: number; price: number; subtotal: number }>;
  total: number;
};

export type CuratedCollection = {
  id: string;
  title: string;
  slug?: string;
  short_description?: string;
  link_url?: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type EditorialCard = {
  id: string | number;
  title: string;
  category?: string;
  price?: number;
  badge?: string;
  href?: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export interface PromotionalSlot {
  id: string;
  slot_number: number;
  title: string;
  price_label: string;
  image_url: string;
  destination_type: string;
  destination_url: string;
}

export interface PromotionalCampaign {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  theme_preset: string;
  status: string;
  total_slots: number;
  grid_columns: number;
  website_enabled: boolean;
  android_enabled: boolean;
  slots: PromotionalSlot[];
}

export type SduiWidgetType =
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

export interface SduiTrustBadgeItem {
  icon: "truck" | "shield" | "badge" | string;
  title: string;
  subtitle: string;
}

export interface SduiMarqueeItem {
  icon: "crown" | "flame" | "shield" | "truck" | "tag" | "sparkles" | string;
  text: string;
}

export interface SduiWidgetConfig {
  id: string;
  widget_type: SduiWidgetType;
  title: string;
  subtitle?: string;
  enabled: boolean;
  web_enabled: boolean;
  app_enabled: boolean;
  display_order: number;
  config?: {
    show_first_order_slide?: boolean;
    show_new_drop_slide?: boolean;
    badge_text?: string;
    ends_at?: string;
    product_ids?: string[];
    max_items?: number;
    cta_label?: string;
    cta_href?: string;
    campaign_slug?: string;
    eyebrow?: string;
    title_line_1?: string;
    title_line_2?: string;
    [key: string]: any;
  };
}

export interface SduiHomepageBlueprint {
  version: number;
  updated_at: string;
  global_theme: {
    header_backdrop?: string;
    announcement_bar_enabled?: boolean;
    trust_bar_enabled?: boolean;
    free_shipping_threshold?: number;
    trust_badges: SduiTrustBadgeItem[];
    marquee_items: SduiMarqueeItem[];
  };
  widgets: SduiWidgetConfig[];
}


