'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // L1 Browser Cache Rules (Section 8)
            staleTime: 5 * 60 * 1000, // 5 minutes before considering data stale
            gcTime: 30 * 60 * 1000, // 30 minutes in garbage collection cache
            refetchOnWindowFocus: false, // Prevent background refetches when user switches browser tabs
            refetchOnReconnect: false, // Prevent jarring refetches on reconnect
            retry: 1, // Single retry on transient network error
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
