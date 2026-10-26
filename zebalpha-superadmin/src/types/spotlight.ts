export type SpotlightStatus = 'draft' | 'published' | 'paused' | 'archived';
export type SpotlightCardType = 'seller_product' | 'editorial';
export type SpotlightPriceMode = 'auto' | 'manual';
export type SpotlightDestinationType = 'category' | 'subcategory' | 'product' | 'custom';
export type SpotlightDefaultSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';

export interface SpotlightCampaign {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  header_image_url?: string | null;
  theme: string;
  status: SpotlightStatus;
  selection_mode: 'manual' | 'auto';
  category_scope: string;
  max_cards: number;
  required_cards: number;
  default_sort: SpotlightDefaultSort;
  display_order: number;
  starts_at?: string | null;
  ends_at?: string | null;
  website_enabled: boolean;
  android_enabled: boolean;
  created_at: string;
  updated_at: string;
  itemCount?: number;
  items?: SpotlightCampaignItem[];
}

export interface SpotlightEditorialCard {
  id: string;
  title: string;
  subtitle?: string | null;
  image_bucket: string;
  image_object_path: string;
  image_url: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  destination_type: SpotlightDestinationType;
  destination_id: string;
  destination_url: string;
  price_mode: SpotlightPriceMode;
  manual_from_price?: number | null;
  calculated_from_price?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpotlightCampaignItem {
  id: string;
  campaign_id: string;
  card_type: SpotlightCardType;
  product_id?: string | null;
  editorial_card_id?: string | null;
  display_order: number;
  created_at: string;
  product?: {
    id: string;
    name: string;
    brand?: string;
    price: number;
    mrp?: number;
    stock?: number;
    image: string;
    seller_name?: string;
    category_name?: string;
  } | null;
  editorial_card?: SpotlightEditorialCard | null;
}

export interface SpotlightSelectedItem {
  uniqueKey: string; // e.g. "seller_product:<id>" or "editorial:<id>"
  cardType: SpotlightCardType;
  productId?: string;
  editorialCardId?: string;
  title: string;
  subtitle?: string;
  image: string;
  price?: number;
  fromPrice?: number;
  destinationUrl: string;
  badge?: string;
}
