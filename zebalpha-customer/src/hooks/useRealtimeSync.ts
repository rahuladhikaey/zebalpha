'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

/**
 * Enterprise Realtime Sync Hook for Customer Portal
 * Listens to postgres change events on products, categories, and curated_collections tables.
 * Instantly invalidates affected TanStack Query caches whenever a seller or admin mutates data.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const lastEventRef = useRef<number>(0);

  useEffect(() => {
    // 1. Subscribe to products table updates/deletes
    const productsChannel = supabase
      .channel('customer-realtime-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          const now = Date.now();
          // Deduplicate events arriving within 100ms
          if (now - lastEventRef.current < 100) return;
          lastEventRef.current = now;

          console.log('[Realtime Sync] Product mutation detected:', payload.eventType, payload.new?.id || payload.old?.id);

          // Invalidate list & search queries
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['search'] });

          // Invalidate single product detail if ID is available
          const targetId = payload.new?.id || payload.old?.id;
          if (targetId) {
            queryClient.invalidateQueries({ queryKey: ['product', String(targetId)] });
            queryClient.removeQueries({ queryKey: ['product', String(targetId)], exact: true });
          }
        }
      )
      .subscribe();

    // 2. Subscribe to categories & curated_collections table changes
    const categoriesChannel = supabase
      .channel('customer-realtime-categories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          console.log('[Realtime Sync] Category mutation detected');
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'curated_collections' },
        () => {
          console.log('[Realtime Sync] Curated Collection mutation detected');
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [queryClient]);
}
