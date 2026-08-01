import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock, ShoppingBag, Truck, CheckCircle2, AlertCircle } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";
import { useAuthStore } from "../../shared/stores/useAuthStore";
import type { Order } from "../../shared/types";

export default function OrdersHistoryScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setOrders(data as Order[]);
      }
    } catch (e) {
      console.warn("Orders history load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // Realtime channel for order status updates
    const channel = supabase
      .channel("orders-history-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user?.id}` },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusStyle = (status: string) => {
    const formatted = status.toLowerCase();
    if (formatted === "delivered") return { color: "#10b981", bg: "bg-emerald-950/40 border-emerald-900/50" };
    if (formatted === "cancelled" || formatted === "rejected") return { color: "#f43f5e", bg: "bg-rose-950/20 border-rose-900/40" };
    return { color: "#3b82f6", bg: "bg-blue-950/40 border-blue-900/50" }; // placed, packed, shipped, out_for_delivery
  };

  const getStatusIcon = (status: string) => {
    const formatted = status.toLowerCase();
    if (formatted === "delivered") return <CheckCircle2 size={12} color="#10b981" />;
    if (formatted === "cancelled" || formatted === "rejected") return <AlertCircle size={12} color="#f43f5e" />;
    return <Truck size={12} color="#3b82f6" />;
  };

  return (
    <View className="flex-1 bg-background">
      {/* Navigation Header */}
      <View className="px-4 py-3 bg-slate-950 border-b border-slate-900 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-900">
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-sm font-black text-white">My Orders</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-4">
            <ShoppingBag size={28} color="#64748b" />
          </View>
          <Text className="text-slate-300 font-extrabold text-sm text-center">
            You haven't placed any orders yet.
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            Order premium spices and verify your tracker status in realtime!
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          }
          className="px-4 pt-4"
        >
          <View className="space-y-4 pb-12">
            {orders.map((order) => {
              const statusStyle = getStatusStyle(order.order_status);
              const itemsList = typeof order.product_details === "string"
                ? JSON.parse(order.product_details)
                : order.items || [];

              return (
                <View
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3"
                >
                  {/* Order Header */}
                  <View className="flex-row justify-between items-center pb-2 border-b border-slate-800/60">
                    <View>
                      <Text className="text-[10px] font-bold text-slate-500 uppercase">
                        Order #{order.order_number || "AS-XXXX"}
                      </Text>
                      <Text className="text-[9px] text-slate-400 font-semibold mt-0.5">
                        {new Date(order.created_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <View className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full border ${statusStyle.bg}`}>
                      {getStatusIcon(order.order_status)}
                      <Text className="text-[9px] font-black uppercase tracking-wider" style={{ color: statusStyle.color }}>
                        {order.order_status}
                      </Text>
                    </View>
                  </View>

                  {/* Order Items */}
                  <View className="space-y-2">
                    {itemsList.map((item: any, idx: number) => (
                      <View key={idx} className="flex-row justify-between">
                        <Text className="text-xs font-semibold text-slate-300 flex-1 mr-2">
                          {item.name} <Text className="text-[10px] text-slate-500">x{item.quantity}</Text>
                        </Text>
                        <Text className="text-xs font-black text-slate-200">₹{item.price * item.quantity}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Total Payment details */}
                  <View className="flex-row justify-between pt-2 border-t border-slate-800/60 items-center">
                    <Text className="text-xs font-bold text-slate-400">Total Paid</Text>
                    <Text className="text-sm font-black text-primary">₹{order.total_amount}</Text>
                  </View>

                  {/* Tracking link / details if shipped */}
                  {order.tracking_number ? (
                    <View className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 mt-1.5 flex-row justify-between items-center">
                      <View>
                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Shiprocket Tracking
                        </Text>
                        <Text className="text-[10px] font-extrabold text-slate-300 mt-0.5">
                          ID: {order.tracking_number}
                        </Text>
                      </View>
                      <View className="bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                        <Text className="text-[9px] font-black text-primary uppercase">Track</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
