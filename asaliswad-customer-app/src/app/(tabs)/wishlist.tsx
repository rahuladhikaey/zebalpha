import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Heart, Trash2, ShoppingBag } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product } from "../../shared/types";
import { Header } from "../../shared/components/Header";
import { ProductCard } from "../../shared/components/ProductCard";
import { Button } from "../../shared/components/Button";

export default function WishlistScreen() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    try {
      const data = await AsyncStorage.getItem("asali_swad_wishlist");
      if (data) {
        setWishlist(JSON.parse(data));
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (productId: string | number) => {
    const updated = wishlist.filter((item) => String(item.id) !== String(productId));
    setWishlist(updated);
    await AsyncStorage.setItem("asali_swad_wishlist", JSON.stringify(updated));
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="My Wishlist" showSearch={false} />

      {wishlist.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-4">
            <Heart size={28} color="#64748b" />
          </View>
          <Text className="text-slate-300 font-extrabold text-sm text-center">
            Your wishlist is empty.
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            Tap the heart icon on any product to save it here!
          </Text>
          <Button
            title="Browse Catalog"
            onPress={() => router.push("/(tabs)/categories")}
            className="mt-6 w-full"
          />
        </View>
      ) : (
        <FlatList
          data={wishlist}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              isWishlisted={true}
              onToggleWishlist={() => handleRemove(item.id)}
            />
          )}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 12, marginTop: 8 }}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );
}
