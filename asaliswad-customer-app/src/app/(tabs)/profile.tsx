import React from "react";
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { User, ShoppingBag, MapPin, KeyRound, LogOut, HelpCircle, ShieldAlert } from "lucide-react-native";
import { useAuthStore } from "../../shared/stores/useAuthStore";
import { Header } from "../../shared/components/Header";
import { Button } from "../../shared/components/Button";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();

  const handleLogout = async () => {
    await signOut();
    router.replace("/(tabs)");
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="My Account" showSearch={false} />

      {!user ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-4">
            <User size={28} color="#64748b" />
          </View>
          <Text className="text-slate-300 font-extrabold text-sm text-center">
            Sign in to your account
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            Access your orders, track shipments, and manage saved addresses.
          </Text>
          <Button
            title="Log In / Register"
            onPress={() => router.push("/auth/login")}
            className="mt-6 w-full"
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-grow px-4 pt-6">
          {/* User Profile Card */}
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 items-center mb-6">
            <View className="h-16 w-16 rounded-full bg-primary/10 border border-primary/30 items-center justify-center mb-3">
              <User size={32} color="#10b981" />
            </View>
            <Text className="text-slate-100 font-black text-base">
              {profile?.full_name || "Customer"}
            </Text>
            <Text className="text-xs font-bold text-slate-500 mt-0.5">
              {user.email}
            </Text>
            <View className="bg-primary/10 border border-primary/30 px-3 py-1 rounded-full mt-3">
              <Text className="text-[10px] font-black text-primary uppercase tracking-widest">
                VERIFIED USER
              </Text>
            </View>
          </View>

          {/* Settings / Navigation List */}
          <View className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden mb-8">
            <TouchableOpacity
              onPress={() => router.push("/orders/history")}
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-5 py-4 border-b border-slate-800/60"
            >
              <View className="flex-row items-center gap-3">
                <ShoppingBag size={16} color="#10b981" />
                <Text className="text-xs font-extrabold text-slate-200">Track My Orders</Text>
              </View>
              <Text className="text-slate-600 text-xs font-bold">→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/checkout/page")}
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-5 py-4 border-b border-slate-800/60"
            >
              <View className="flex-row items-center gap-3">
                <MapPin size={16} color="#10b981" />
                <Text className="text-xs font-extrabold text-slate-200">Delivery Addresses</Text>
              </View>
              <Text className="text-slate-600 text-xs font-bold">→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-5 py-4 border-b border-slate-800/60"
            >
              <View className="flex-row items-center gap-3">
                <HelpCircle size={16} color="#10b981" />
                <Text className="text-xs font-extrabold text-slate-200">Help Center & FAQ</Text>
              </View>
              <Text className="text-slate-600 text-xs font-bold">→</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="flex-row items-center justify-center bg-rose-950/20 border border-rose-900/40 rounded-2xl py-4 mb-12 gap-2"
          >
            <LogOut size={16} color="#f43f5e" />
            <Text className="text-xs font-black text-rose-500 uppercase tracking-wider">
              Log Out
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
