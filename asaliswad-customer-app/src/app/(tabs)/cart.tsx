import React from "react";
import { View, Text, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight } from "lucide-react-native";
import { useCartStore } from "../../shared/stores/useCartStore";
import { useAuthStore } from "../../shared/stores/useAuthStore";
import { Header } from "../../shared/components/Header";
import { Button } from "../../shared/components/Button";

export default function CartScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { items, updateQuantity, removeItem } = useCartStore();

  // Price calculations matching website thresholds
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const platformFee = subtotal > 0 ? 5 : 0;
  const deliveryCharge = subtotal > 500 || subtotal === 0 ? 0 : 40;
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const totalAmount = subtotal + platformFee + deliveryCharge + tax;

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!user) {
      router.push("/auth/login");
    } else {
      router.push("/checkout/page");
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Shopping Cart" showSearch={false} />

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-4">
            <ShoppingBag size={28} color="#64748b" />
          </View>
          <Text className="text-slate-300 font-extrabold text-sm text-center">
            Your cart is currently empty.
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            Browse our fresh spices catalog and add items here!
          </Text>
          <Button
            title="Start Shopping"
            onPress={() => router.push("/(tabs)/categories")}
            className="mt-6 w-full"
          />
        </View>
      ) : (
        <View className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-4 pt-4">
            {/* Cart Items List */}
            <View className="space-y-3 mb-6">
              {items.map((item) => (
                <View
                  key={item.id}
                  className="flex-row bg-slate-900 border border-slate-800 rounded-2xl p-3 items-center justify-between"
                >
                  <Image
                    source={item.image_url}
                    contentFit="contain"
                    className="h-14 w-14 bg-slate-950 rounded-xl"
                  />

                  <View className="flex-1 ml-3 mr-2">
                    <Text className="text-slate-100 font-black text-xs leading-tight tracking-tight line-clamp-1">
                      {item.name}
                    </Text>
                    <Text className="text-[10px] font-bold text-slate-500 mt-0.5">
                      ₹{item.price} each
                    </Text>
                    <Text className="text-xs font-black text-primary mt-1">
                      ₹{item.price * item.quantity}
                    </Text>
                  </View>

                  {/* Quantity Actions */}
                  <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-3">
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.quantity - 1, user?.id)}
                      className="p-1 rounded-lg active:bg-slate-900"
                    >
                      <Minus size={12} color="#cbd5e1" />
                    </TouchableOpacity>
                    <Text className="text-xs font-black text-slate-100">{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.quantity + 1, user?.id)}
                      className="p-1 rounded-lg active:bg-slate-900"
                    >
                      <Plus size={12} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => removeItem(item.id, user?.id)}
                    className="p-2 ml-2 rounded-xl bg-rose-950/20 active:bg-rose-950/40"
                  >
                    <Trash2 size={14} color="#f43f5e" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Bill Summary */}
            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-12 space-y-3">
              <Text className="text-xs font-black text-white uppercase tracking-wider mb-2">
                Order Summary
              </Text>

              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-400 font-medium">Subtotal</Text>
                <Text className="text-xs text-slate-200 font-bold">₹{subtotal}</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-400 font-medium">Platform Fee</Text>
                <Text className="text-xs text-slate-200 font-bold">₹{platformFee}</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-400 font-medium">Delivery Charges</Text>
                <Text className={`text-xs font-bold ${deliveryCharge === 0 ? "text-primary" : "text-slate-200"}`}>
                  {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-400 font-medium">Tax & GST (5%)</Text>
                <Text className="text-xs text-slate-200 font-bold">₹{tax}</Text>
              </View>

              <View className="border-t border-slate-800 pt-3 flex-row justify-between">
                <Text className="text-sm font-black text-white">Grand Total</Text>
                <Text className="text-sm font-black text-primary">₹{totalAmount}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Checkout Panel */}
          <View className="bg-slate-950 border-t border-slate-900 px-4 py-3 flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] font-bold text-slate-500 uppercase">Total Amount</Text>
              <Text className="text-base font-black text-primary">₹{totalAmount}</Text>
            </View>
            <TouchableOpacity
              onPress={handleCheckout}
              activeOpacity={0.85}
              className="flex-row items-center bg-primary active:bg-primary-hover px-5 py-3 rounded-xl gap-1.5"
            >
              <Text className="text-xs font-black text-white uppercase tracking-wider">
                Checkout
              </Text>
              <ArrowRight size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
