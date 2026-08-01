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
  is_active?: boolean;
  is_approved?: boolean;
  approval_status?: string;
  offers?: string[];
  specifications?: Record<string, string>;
  brand?: string;
  stock?: number;
  sku?: string;
  low_stock_limit?: number;
  status?: string;
  packages?: ProductPackage[];
  seller_id?: string;
};

export type CartItem = Product & {
  quantity: number;
};

export type Order = {
  id: string | number;
  order_number?: string;
  seller_id?: string;
  customer_name: string;
  phone?: string;
  address?: string;
  shipping_address?: any;
  product_details?: string; // JSON string of ordered items
  items?: any[];
  order_status: string;
  payment_status: string;
  payment_method?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  shipment_id?: string;
  shiprocket_order_id?: string;
  tracking_number?: string;
  total_amount: number;
  created_at: string;
};

export type Category = {
  id: number | string;
  name: string;
  main_category?: string;
  description?: string;
  icon?: string;
  image_url?: string;
};

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone_no?: string;
  gender?: string;
  avatar_url?: string;
  status: 'active' | 'suspended';
  role: 'customer' | 'seller' | 'admin';
  created_at: string;
  updated_at: string;
};

export type SavedAddress = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
};
