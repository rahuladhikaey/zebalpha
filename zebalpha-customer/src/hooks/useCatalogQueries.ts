'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, Category } from '@/lib/types';

export const DEFAULT_CLOTHING_CATEGORIES: Category[] = [];

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
 * Queries Supabase categories table directly for 100% real-time dynamic categories.
 */
export async function fetchCanonicalCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, icon, image_url, main_category, description, sort_order, is_active")
      .neq("is_active", false)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.warn("Notice fetching categories in customer app:", error.message);
      // Fallback query selecting all records
      const { data: allData } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      if (allData) return allData as Category[];
    }

    if (data) {
      return data as Category[];
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
        query = query.or("name.ilike.%polo%,description.ilike.%polo%,brand.ilike.%polo%,category.ilike.%polo%,main_category.ilike.%polo%");
      } else if (cat.includes("tee") || cat.includes("t-shirt") || cat.includes("oversized")) {
        query = query.or("name.ilike.%tee%,name.ilike.%t-shirt%,name.ilike.%oversized%,description.ilike.%tee%,category.ilike.%tee%,category.ilike.%t-shirt%,category.ilike.%oversized%,main_category.ilike.%t-shirt%");
      } else if (cat.includes("hoodie") || cat.includes("fleece")) {
        query = query.or("name.ilike.%hoodie%,description.ilike.%hoodie%,category.ilike.%hoodie%,main_category.ilike.%hoodie%");
      } else if (cat.includes("shirt")) {
        query = query.or("name.ilike.%shirt%,description.ilike.%shirt%,category.ilike.%shirt%,main_category.ilike.%shirt%");
      } else if (cat.includes("bottom") || cat.includes("cargo") || cat.includes("pant") || cat.includes("trouser") || cat.includes("denim")) {
        query = query.or("name.ilike.%cargo%,name.ilike.%pant%,name.ilike.%trouser%,description.ilike.%cargo%,category.ilike.%cargo%,category.ilike.%bottom%,main_category.ilike.%bottom%");
      } else if (cat.includes("drop") || cat.includes("limited")) {
        query = query.or("name.ilike.%drop%,name.ilike.%limited%,description.ilike.%drop%,category.ilike.%drop%,category.ilike.%limited%,main_category.ilike.%limited%");
      } else if (cat.includes("accessor") || cat.includes("cap") || cat.includes("headwear") || cat.includes("hat")) {
        query = query.or("name.ilike.%cap%,name.ilike.%beanie%,name.ilike.%accessor%,description.ilike.%cap%,category.ilike.%accessor%,main_category.ilike.%accessor%");
      } else {
        const isNum = !isNaN(Number(cat));
        if (isNum) {
          query = query.eq("category_id", Number(cat));
        } else {
          query = query.or(`name.ilike.%${cat}%,description.ilike.%${cat}%,brand.ilike.%${cat}%,category.ilike.%${cat}%,main_category.ilike.%${cat}%`);
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
