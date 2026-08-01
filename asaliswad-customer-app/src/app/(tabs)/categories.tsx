import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, FlatList, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Grid, Search, SlidersHorizontal } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";
import type { Product, Category } from "../../shared/types";
import { Header } from "../../shared/components/Header";
import { ProductCard } from "../../shared/components/ProductCard";
import { SkeletonLoader } from "../../shared/components/SkeletonLoader";

export default function CategoriesScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const categoryParam = category;

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainTab, setSelectedMainTab] = useState<string>("ALL");

  const loadData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        supabase.from("categories").select("*").order("name", { ascending: true }),
        supabase.from("products").select("*").eq("is_active", true).eq("is_approved", true)
      ]);

      if (cRes.data) {
        setCategories(cRes.data);
        // Default selection or selection via searchParam
        if (categoryParam) {
          const found = cRes.data.find(c => c.name.toLowerCase() === decodeURIComponent(categoryParam).toLowerCase());
          if (found) setSelectedCategoryId(found.id);
        } else if (cRes.data.length > 0) {
          setSelectedCategoryId(cRes.data[0].id);
        }
      }
      if (pRes.data) setProducts(pRes.data);
    } catch (e) {
      console.warn("Categories screen load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryParam]);

  // Filter products by selected category and search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategoryId === null || String(p.category_id) === String(selectedCategoryId) || p.category === categories.find(c => c.id === selectedCategoryId)?.name;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View className="flex-1 bg-background">
      <Header title="Browse Catalog" showSearch={false} />

      {/* Top Search Input */}
      <View className="px-4 py-3 border-b border-slate-900 bg-slate-950 flex-row items-center gap-2">
        <View className="flex-1 relative flex-row items-center">
          <Search size={16} color="#64748b" className="absolute left-4 z-10" />
          <TextInput
            placeholder="Search spices, pantry products..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs font-semibold text-white outline-none"
          />
        </View>
        <TouchableOpacity className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
          <SlidersHorizontal size={16} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 flex-row">
        {/* Left Categories Sidebar */}
        <View className="w-24 bg-slate-950 border-r border-slate-900">
          <ScrollView showsVerticalScrollIndicator={false} className="py-2">
            <TouchableOpacity
              onPress={() => setSelectedCategoryId(null)}
              className={`py-4 px-2 items-center border-l-4 ${
                selectedCategoryId === null
                  ? "border-primary bg-slate-900/50"
                  : "border-transparent"
              }`}
            >
              <Text
                className={`text-[9px] font-black uppercase text-center tracking-wider ${
                  selectedCategoryId === null ? "text-primary" : "text-slate-500"
                }`}
              >
                All items
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  className={`py-4 px-2 items-center border-l-4 ${
                    isSelected ? "border-primary bg-slate-900/50" : "border-transparent"
                  }`}
                >
                  <Text
                    className={`text-[9px] font-black uppercase text-center tracking-wider line-clamp-2 ${
                      isSelected ? "text-primary" : "text-slate-500"
                    }`}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Right Products list */}
        <View className="flex-1 bg-slate-950/20 p-2">
          {loading ? (
            <View className="flex-row flex-wrap justify-between">
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} className="w-[48%] mb-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                  <SkeletonLoader height={100} borderRadius={16} />
                  <SkeletonLoader height={10} className="mt-3" />
                  <SkeletonLoader height={8} width="60%" className="mt-2" />
                </View>
              ))}
            </View>
          ) : filteredProducts.length === 0 ? (
            <View className="flex-1 items-center justify-center p-8">
              <Text className="text-xs font-bold text-slate-500 text-center">
                No products found in this category.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={({ item }) => <ProductCard product={item} />}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 8 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}
