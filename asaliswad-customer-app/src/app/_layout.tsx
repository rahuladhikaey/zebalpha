import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../shared/stores/useAuthStore";
import { useCartStore } from "../shared/stores/useCartStore";
import "../global.css";

const queryClient = new QueryClient();

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const user = useAuthStore((state) => state.user);
  const loadCart = useCartStore((state) => state.loadCart);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Load cart items (automatically syncs from local storage to database on user login)
    loadCart(user?.id);
  }, [user, loadCart]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#020617" }, // slate-950
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" options={{ presentation: "modal" }} />
        <Stack.Screen name="auth/otp" options={{ presentation: "modal" }} />
        <Stack.Screen name="products/[productId]" />
        <Stack.Screen name="checkout/page" />
        <Stack.Screen name="orders/history" />
      </Stack>
    </QueryClientProvider>
  );
}
