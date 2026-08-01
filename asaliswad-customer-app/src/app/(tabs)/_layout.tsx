import React from "react";
import { Tabs } from "expo-router";
import { Home, Grid, ShoppingBag, Heart, User } from "lucide-react-native";
import { useCartStore } from "../../shared/stores/useCartStore";

export default function TabLayout() {
  const cartItems = useCartStore((state) => state.items);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#10b981", // emerald-500
        tabBarInactiveTintColor: "#64748b", // slate-500
        tabBarStyle: {
          backgroundColor: "#020617", // slate-950
          borderTopWidth: 1,
          borderTopColor: "#1e293b", // slate-800
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => <Grid size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
          tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#10b981",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: "black",
          },
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
