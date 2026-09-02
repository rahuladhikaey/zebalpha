export type Category = {
  id: number | string;
  name: string;
  image_url?: string;
  main_category?: string;
  description?: string;
  icon?: string;
};

export type ProductPackage = {
  id: string;
  name: string;
  price: number;
  mrp?: number;
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
  specifications?: Record<string, string>;
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
  virtual_tryon_image?: string;
  virtual_tryon_category?: 'upper_body' | 'lower_body' | 'dresses' | 'outerwear' | string;
  is_vto_enabled?: boolean;
};


export type CartItem = Product & {
  quantity: number;
};

export type OrderPayload = {
  customer_name: string;
  phone: string;
  address: string;
  items: Array<{ name: string; quantity: number; price: number; subtotal: number }>;
  total: number;
};
