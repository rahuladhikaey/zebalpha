import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { ShoppingBag, Search, User } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCartStore } from "../stores/useCartStore";
import { useAuthStore } from "../stores/useAuthStore";

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Asali Swad",
  showSearch = true,
}) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View className="bg-slate-950 border-b border-slate-900 px-4 py-3 flex-row items-center justify-between">
      {/* Brand Logo & Name */}
      <View className="flex-row items-center gap-2">
        <Image
          source={require("../../../assets/images/icon.png")}
          contentFit="cover"
          className="h-8 w-8 rounded-full border border-slate-800"
        />
        <View>
          <Text className="text-slate-100 font-black text-sm tracking-tight uppercase">
            {title}
          </Text>
          <Text className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Premium Spices & Pantry
          </Text>
        </View>
      </View>

      {/* Action Items */}
      <View className="flex-row items-center gap-3">
        {showSearch ? (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/categories")}
            activeOpacity={0.7}
            className="p-2 rounded-full bg-slate-900 border border-slate-800"
          >
            <Search size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ) : null}

        {/* Profile / Account Login Action */}
        <TouchableOpacity
          onPress={() => {
            if (user) {
              router.push("/(tabs)/profile");
            } else {
              router.push("/auth/login");
            }
          }}
          activeOpacity={0.7}
          className="p-2 rounded-full bg-slate-900 border border-slate-800"
        >
          <User size={16} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Cart Icon & Badge */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/cart")}
          activeOpacity={0.7}
          className="p-2 rounded-full bg-slate-900 border border-slate-800 relative"
        >
          <ShoppingBag size={16} color="#cbd5e1" />
          {cartItemCount > 0 ? (
            <View className="absolute -top-1 -right-1 bg-primary h-4 min-w-[16px] px-1 rounded-full items-center justify-center border border-slate-950">
              <Text className="text-[8px] font-black text-white text-center">
                {cartItemCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};
