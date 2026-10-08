export type Category = {
  id: number | string;
  name: string;
  image_url?: string;
  main_category?: string;
  description?: string;
  icon?: string;
  slug?: string;
  sort_order?: number;
  is_active?: boolean;
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
  seller_city?: string;
  seller_logo?: string;
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

