import React from "react";
import { View, Text, TouchableOpacity, Share } from "react-native";
import { Image } from "expo-image";
import { Heart, ShoppingBag } from "lucide-react-native";
import { useRouter } from "expo-router";
import type { Product } from "../types";
import { useCartStore } from "../stores/useCartStore";
import { useAuthStore } from "../stores/useAuthStore";

interface ProductCardProps {
  product: Product;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((state) => state.user);

  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  // Replicate rating logic from website
  const numId = typeof product.id === "number"
    ? product.id
    : String(product.id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const rating = Number((4.0 + ((numId * 7) % 11) / 10).toFixed(1));
  const ratingCount = 30 + ((numId * 13) % 150);

  const handleAddToCart = () => {
    addItem(product, 1, user?.id);
  };

  return (
    <View className="flex-1 bg-background-surface border border-background-border rounded-2xl overflow-hidden m-1 shadow-sm relative">
      {/* Image & Wishlist Button container */}
      <TouchableOpacity
        onPress={() => router.push(`/products/${product.id}` as any)}
        activeOpacity={0.9}
        className="aspect-square bg-slate-900 flex items-center justify-center p-3 relative"
      >
        <Image
          source={product.images?.[0] || product.image_url}
          contentFit="contain"
          transition={200}
          className="w-full h-full"
        />

        {/* Discount Badge */}
        {discountPercent > 0 ? (
          <View className="absolute top-2 left-2 bg-primary rounded-lg px-2 py-0.5 shadow-md shadow-primary/20">
            <Text className="text-[9px] font-black text-white uppercase tracking-wider">
              {discountPercent}% OFF
            </Text>
          </View>
        ) : null}

        {/* Wishlist Button */}
        <TouchableOpacity
          onPress={onToggleWishlist}
          activeOpacity={0.8}
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center"
        >
          <Heart
            size={14}
            color={isWishlisted ? "#10b981" : "#cbd5e1"}
            fill={isWishlisted ? "#10b981" : "transparent"}
          />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Info Content Section */}
      <View className="p-3 justify-between flex-1">
        <TouchableOpacity 
          onPress={() => router.push(`/products/${product.id}` as any)}
          activeOpacity={0.7}
        >
          <Text className="text-slate-100 font-extrabold text-xs leading-tight tracking-tight line-clamp-2 h-8">
            {product.name}
          </Text>

          {/* Rating stars */}
          <View className="flex-row items-center mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Text
                key={i}
                className={`text-[10px] ${
                  i < Math.floor(rating) ? "text-amber-400" : "text-slate-700"
                }`}
              >
                ★
              </Text>
            ))}
            <Text className="text-[9px] font-bold text-slate-500 ml-1">
              ({ratingCount})
            </Text>
          </View>

          <Text className="text-[9px] font-black uppercase text-slate-500 tracking-wider mt-1.5 truncate">
            {product.brand || "ASALISWAD"}
          </Text>
        </TouchableOpacity>

        {/* Price and Add to Cart Section */}
        <View className="mt-3 space-y-2">
          <View className="flex-row items-baseline flex-wrap gap-1">
            <Text className="text-sm font-black text-slate-100">
              ₹{product.price}
            </Text>
            {product.mrp && product.mrp > product.price ? (
              <Text className="text-[10px] font-bold text-slate-500 line-through">
                ₹{product.mrp}
              </Text>
            ) : null}
          </View>

          {/* Add to Cart button */}
          <TouchableOpacity
            onPress={handleAddToCart}
            activeOpacity={0.85}
            className="w-full flex-row items-center justify-center bg-primary active:bg-primary-hover py-2 rounded-xl"
          >
            <ShoppingBag size={12} color="#ffffff" className="mr-1.5" />
            <Text className="text-[10px] font-black text-white tracking-wider uppercase">
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
