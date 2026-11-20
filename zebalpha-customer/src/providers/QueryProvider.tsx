'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Enterprise Query Provider tuned for 500+ concurrent shoppers on Free Tier:
 * - Zero persistent Supabase Realtime WebSocket channels on customer storefront
 *   (protects Supabase Free Tier's 200 concurrent Realtime connection ceiling).
 * - Long 5-min staleTime + 30-min gcTime eliminates redundant refetches on navigation.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes fresh client cache
            gcTime: 30 * 60 * 1000, // 30 minutes memory retention
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
