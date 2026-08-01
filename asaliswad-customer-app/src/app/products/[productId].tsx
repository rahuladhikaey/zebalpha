import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { ArrowLeft, Heart, ShoppingBag, Share2, ShieldCheck, Truck, RotateCcw } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";
import type { Product } from "../../shared/types";
import { useCartStore } from "../../shared/stores/useCartStore";
import { useAuthStore } from "../../shared/stores/useAuthStore";
import { Button } from "../../shared/components/Button";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

      if (data) setProduct(data as Product);
    } catch (e) {
      console.warn("Product loading error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
        <Text className="text-white font-extrabold text-sm text-center">Product not found.</Text>
        <Button title="Go Back" onPress={() => router.back()} className="mt-4" />
      </SafeAreaView>
    );
  }

  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} on Asali Swad: https://www.asaliswad.com/products/${product.id}`,
      });
    } catch (e) {}
  };

  const handleAddToCart = () => {
    addItem(product, 1, user?.id);
    alert("Added to Cart!");
  };

  const handleBuyNow = async () => {
    await addItem(product, 1, user?.id);
    router.push("/(tabs)/cart");
  };

  const productImages = product.images && product.images.length > 0
    ? product.images
    : [product.image_url];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Navigation Header */}
      <View className="px-4 py-3 bg-slate-950 border-b border-slate-900 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-900">
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-sm font-black text-white ml-1 truncate max-w-[200px]">
            {product.name}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={handleShare} className="p-2 rounded-full active:bg-slate-900">
            <Share2 size={18} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsWishlisted(!isWishlisted)}
            className="p-2 rounded-full active:bg-slate-900"
          >
            <Heart size={18} color={isWishlisted ? "#10b981" : "#cbd5e1"} fill={isWishlisted ? "#10b981" : "transparent"} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-grow">
        {/* Image Gallery */}
        <View className="bg-slate-900 aspect-square w-full justify-center items-center p-6 relative">
          <Image
            source={productImages[activeImageIndex]}
            contentFit="contain"
            className="w-full h-full"
          />

          {discountPercent > 0 ? (
            <View className="absolute top-4 left-4 bg-primary rounded-xl px-3 py-1 shadow-lg shadow-primary/20">
              <Text className="text-xs font-black text-white tracking-widest uppercase">
                {discountPercent}% OFF
              </Text>
            </View>
          ) : null}

          {/* Dots Indicator */}
          {productImages.length > 1 ? (
            <View className="absolute bottom-4 flex-row gap-1.5 justify-center w-full">
              {productImages.map((_, idx) => (
                <View
                  key={idx}
                  className={`h-2 rounded-full ${
                    idx === activeImageIndex ? "w-6 bg-primary" : "w-2 bg-slate-700"
                  }`}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Thumbnail Selector */}
        {productImages.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3 gap-2 bg-slate-950/40">
            {productImages.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveImageIndex(idx)}
                className={`h-14 w-14 rounded-xl border-2 overflow-hidden bg-slate-900 ${
                  idx === activeImageIndex ? "border-primary" : "border-slate-800"
                }`}
              >
                <Image source={img} contentFit="contain" className="w-full h-full" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {/* Info Area */}
        <View className="p-4 space-y-4">
          <View>
            <Text className="text-xs font-black text-primary uppercase tracking-widest">
              {product.brand || "Asali Swad Choice"}
            </Text>
            <Text className="text-lg font-black text-white leading-tight tracking-tight mt-1">
              {product.name}
            </Text>
          </View>

          {/* Price Container */}
          <View className="flex-row items-baseline gap-2">
            <Text className="text-2xl font-black text-white">₹{product.price}</Text>
            {product.mrp && product.mrp > product.price ? (
              <Text className="text-sm font-bold text-slate-500 line-through">
                ₹{product.mrp}
              </Text>
            ) : null}
            {discountPercent > 0 ? (
              <Text className="text-xs font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-lg ml-2">
                Save ₹{product.mrp! - product.price}
              </Text>
            ) : null}
          </View>

          {/* Shipping Badges */}
          <View className="flex-row flex-wrap gap-2 pt-2 border-t border-slate-900">
            <View className="flex-row items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Truck size={14} color="#10b981" />
              <Text className="text-[10px] font-extrabold text-slate-300">Fast Shipping</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <RotateCcw size={14} color="#10b981" />
              <Text className="text-[10px] font-extrabold text-slate-300">Easy Returns</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <ShieldCheck size={14} color="#10b981" />
              <Text className="text-[10px] font-extrabold text-slate-300">Secure Payments</Text>
            </View>
          </View>

          {/* Product Description */}
          <View className="pt-4 border-t border-slate-900">
            <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Description
            </Text>
            <Text className="text-slate-300 text-xs font-medium leading-relaxed">
              {product.description || "No description provided for this item."}
            </Text>
          </View>

          {/* Specifications Table */}
          {product.specifications && Object.keys(product.specifications).length > 0 ? (
            <View className="pt-4 border-t border-slate-900">
              <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Product Details
              </Text>
              <View className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {Object.entries(product.specifications).map(([key, val], idx) => (
                  <View
                    key={idx}
                    className={`flex-row px-4 py-3 justify-between ${
                      idx !== 0 ? "border-t border-slate-800/60" : ""
                    }`}
                  >
                    <Text className="text-[11px] font-extrabold text-slate-500 uppercase">{key}</Text>
                    <Text className="text-[11px] font-black text-slate-200">{val}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View className="bg-slate-950 border-t border-slate-900 px-4 py-3 flex-row gap-3">
        <TouchableOpacity
          onPress={handleAddToCart}
          activeOpacity={0.8}
          className="flex-1 flex-row items-center justify-center border border-slate-800 rounded-xl py-3.5 bg-slate-900 active:bg-slate-800"
        >
          <ShoppingBag size={16} color="#cbd5e1" className="mr-2" />
          <Text className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
            Add to Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleBuyNow}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center rounded-xl py-3.5 bg-primary active:bg-primary-hover"
        >
          <Text className="text-xs font-black text-white uppercase tracking-wider">
            Buy Now
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
