'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, Category } from '@/lib/types';

export const DEFAULT_CLOTHING_CATEGORIES: Category[] = [
  { id: "1", name: "Premium Polos", icon: "👕", main_category: "POLOS", description: "100% Supima Pique & Knitted Polos", image_url: "/banner-premium-polo.png" },
  { id: "2", name: "Oversized Tees", icon: "🛹", main_category: "T-SHIRTS", description: "240 GSM Heavyweight Streetwear Tees", image_url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80" },
  { id: "3", name: "Heavyweight Hoodies", icon: "🧥", main_category: "HOODIES", description: "400+ GSM French Terry Fleece Hoodies", image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80" },
  { id: "4", name: "Classic Shirts", icon: "👔", main_category: "SHIRTS", description: "Structured Utility & Camp-Collar Overshirts", image_url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80" },
  { id: "5", name: "Cargo & Bottoms", icon: "👖", main_category: "BOTTOMS", description: "Multi-Pocket Tactical Cargos & Streetwear Bottoms", image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80" },
  { id: "6", name: "Limited Drops", icon: "⚡", main_category: "LIMITED", description: "Exclusive Seasonally Numbered Limited Capsules", image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80" },
  { id: "7", name: "Accessories & Headwear", icon: "🧢", main_category: "ACCESSORIES", description: "Elevated Beanies, Caps & Streetwear Essentials", image_url: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&auto=format&fit=crop&q=80" },
];

export const SLIM_PRODUCT_CARD_FIELDS = "*";

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
 * Tries API service first, falls back gracefully to Supabase client query.
 */
export async function fetchCanonicalCategories(): Promise<Category[]> {
  try {
    const res = await apiService.getCategories();
    if (!res.error && res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data as Category[];
    }
  } catch (_) {}

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, icon, image_url, main_category, description, sort_order, is_active")
      .or("is_active.is.null,is_active.eq.true")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Category[];
    }
  } catch (_) {}

  return DEFAULT_CLOTHING_CATEGORIES;
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
    staleTime: 30 * 60 * 1000, // 30 minutes fresh L1 cache
    gcTime: 60 * 60 * 1000,
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
 * Pushes filtering and limit/offset pagination to the database.
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
      .or("is_approved.is.null,is_approved.eq.true")
      .neq("approval_status", "rejected");

    // Server-side category filtering
    if (params.category && String(params.category).trim() !== "" && String(params.category) !== "all") {
      const cat = String(params.category).toLowerCase().trim();
      if (cat.includes("polo")) {
        query = query.or("name.ilike.%polo%,description.ilike.%polo%,brand.ilike.%polo%");
      } else if (cat.includes("tee") || cat.includes("t-shirt") || cat.includes("oversized")) {
        query = query.or("name.ilike.%tee%,name.ilike.%shirt%,name.ilike.%t-shirt%,description.ilike.%tee%");
      } else if (cat.includes("hoodie") || cat.includes("fleece")) {
        query = query.or("name.ilike.%hoodie%,description.ilike.%hoodie%");
      } else if (cat.includes("shirt")) {
        query = query.or("name.ilike.%shirt%,description.ilike.%shirt%");
      } else if (cat.includes("bottom") || cat.includes("cargo") || cat.includes("pant") || cat.includes("trouser")) {
        query = query.or("name.ilike.%cargo%,name.ilike.%pant%,name.ilike.%trouser%,description.ilike.%cargo%");
      } else if (cat.includes("drop") || cat.includes("limited")) {
        query = query.or("name.ilike.%drop%,name.ilike.%limited%,description.ilike.%drop%");
      } else {
        const isNum = !isNaN(Number(cat));
        if (isNum) {
          query = query.eq("category_id", Number(cat));
        } else {
          query = query.or(`name.ilike.%${cat}%,description.ilike.%${cat}%,brand.ilike.%${cat}%`);
        }
      }
    }

    // Server-side search filtering
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%`);
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

    const { data, count, error } = await query;
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

    const products = (data || []) as Product[];
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
    staleTime: 5 * 60 * 1000, // 5 minutes fresh L1 cache
    gcTime: 30 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
