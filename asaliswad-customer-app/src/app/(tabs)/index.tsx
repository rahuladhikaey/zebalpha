import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, FlatList, TouchableOpacity, RefreshControl, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Grid, Sparkles, TrendingUp } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";
import type { Product, Category } from "../../shared/types";
import { Header } from "../../shared/components/Header";
import { ProductCard } from "../../shared/components/ProductCard";
import { SkeletonLoader } from "../../shared/components/SkeletonLoader";

const { width } = Dimensions.get("window");

// Mock Hero Banners
const BANNERS = [
  { id: "1", title: "Handcrafted Pure Spices", subtitle: "Flat 20% OFF", bg: "#065f46" },
  { id: "2", title: "Organic Ghee & Cold Pressed Oils", subtitle: "100% Certified Pure", bg: "#7c2d12" },
  { id: "3", title: "Pantry Essentials & Snacks", subtitle: "Direct From Organic Farms", bg: "#1e3a8a" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .eq("is_approved", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true })
      ]);

      if (pRes.data) setProducts(pRes.data);
      if (cRes.data) setCategories(cRes.data);
    } catch (e) {
      console.warn("Home loading error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime database updates
    const channel = supabase
      .channel("home-screen-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Asali Swad" showSearch={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Hero Banner Carousel */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ height: 160 }}
        >
          {BANNERS.map((banner) => (
            <View
              key={banner.id}
              style={{ width: width - 32, marginHorizontal: 16, backgroundColor: banner.bg }}
              className="h-36 rounded-3xl p-6 justify-center shadow-lg relative overflow-hidden"
            >
              <Text className="text-white font-black text-lg tracking-tight leading-tight w-2/3">
                {banner.title}
              </Text>
              <Text className="text-emerald-300 font-extrabold text-xs mt-1.5 uppercase tracking-wider">
                {banner.subtitle}
              </Text>
              <Text className="absolute right-4 bottom-4 text-emerald-400 font-black text-xs">
                SHOP NOW →
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Shop By Category Horizontal Row */}
        <View className="mt-6 px-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-100 font-black text-base tracking-tight flex-row items-center">
              Shop by Category
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/categories")}>
              <Text className="text-xs font-black text-primary">See All</Text>
            </TouchableOpacity>
          </View>

          {loading && categories.length === 0 ? (
            <View className="flex-row gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} className="items-center">
                  <SkeletonLoader width={64} height={64} borderRadius={32} />
                  <SkeletonLoader width={48} height={10} className="mt-2" />
                </View>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => router.push(`/(tabs)/categories?category=${encodeURIComponent(cat.name)}` as any)}
                  activeOpacity={0.7}
                  className="items-center w-16"
                >
                  <View className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 items-center justify-center overflow-hidden p-2">
                    {cat.image_url ? (
                      <Image
                        source={cat.image_url}
                        contentFit="cover"
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <Grid size={24} color="#10b981" />
                    )}
                  </View>
                  <Text className="text-[10px] font-black text-slate-300 text-center tracking-tight mt-2 truncate w-full uppercase">
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Trending Products Grid */}
        <View className="mt-8 px-4 pb-12">
          <View className="flex-row items-center gap-2 mb-4">
            <TrendingUp size={18} color="#10b981" />
            <Text className="text-slate-100 font-black text-base tracking-tight">
              Trending Products
            </Text>
          </View>

          {loading && products.length === 0 ? (
            <View className="flex-row flex-wrap justify-between">
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} className="w-[48%] mb-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                  <SkeletonLoader height={120} borderRadius={16} />
                  <SkeletonLoader height={12} className="mt-3" />
                  <SkeletonLoader height={10} width="60%" className="mt-2" />
                </View>
              ))}
            </View>
          ) : products.length === 0 ? (
            <View className="py-12 border border-dashed border-slate-800 rounded-2xl items-center">
              <Text className="text-xs font-bold text-slate-500">No products found.</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              renderItem={({ item }) => <ProductCard product={item} />}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 8 }}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
