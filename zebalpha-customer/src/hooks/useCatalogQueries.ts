'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { useState, useEffect } from 'react';

/**
 * Custom 300ms Debounce Hook for Search Inputs (Section 11)
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
 * L1 Browser-Cached Products Hook (Section 8 & 10)
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
    staleTime: 5 * 60 * 1000, // 5 minutes fresh L1 cache
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  });
}

/**
 * L1 Browser-Cached Product Detail Hook (Section 8 & 12)
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
    staleTime: 10 * 60 * 1000, // 10 minutes fresh
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * L1 Browser-Cached Categories Hook (Section 8 & 9)
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiService.getCategories();
      if (res.error) throw new Error(res.error);
      return res.data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes fresh
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * L1 Browser-Cached Debounced Search Hook (Section 8 & 11)
 * Automatically skips network requests for repeated identical search queries.
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
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 20 * 60 * 1000,
  });
}
