'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

function RealtimeSyncSubscriber() {
  useRealtimeSync();
  return null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds fresh L1 cache (invalidated instantly by Realtime on DB mutations)
            gcTime: 10 * 60 * 1000, // 10 minutes garbage collection retention
            refetchOnWindowFocus: false, // Prevent unwanted focus refetches
            refetchOnReconnect: true, // Reconcile authoritative state automatically upon network reconnect
            retry: 1, // Single retry on transient network error
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSyncSubscriber />
      {children}
    </QueryClientProvider>
  );
}
