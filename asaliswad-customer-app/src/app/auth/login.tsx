import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Mail, Lock, ShieldCheck, Fingerprint } from "lucide-react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../config/supabaseClient";
import { useAuthStore } from "../../shared/stores/useAuthStore";
import { Input } from "../../shared/components/Input";
import { Button } from "../../shared/components/Button";

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricsAvailable(hasHardware && isEnrolled);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.session) {
        await setSession(data.session);
        // Save email for biometric convenience
        await AsyncStorage.setItem("asali_swad_saved_email", email.trim());
        router.back();
      }
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const savedEmail = await AsyncStorage.getItem("asali_swad_saved_email");
    if (!savedEmail) {
      Alert.alert("Setup Required", "Please log in with password once to set up biometrics.");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to sign in to Asali Swad",
      fallbackLabel: "Enter Password",
    });

    if (result.success) {
      // Simulate biometric credentials retrieval or handle custom secure token refresh
      Alert.alert("Success", "Authenticated via Biometrics!");
    } else {
      Alert.alert("Authentication Failed", "Could not verify identity.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-12 justify-center">
          <View className="items-center mb-10">
            {/* Round Logo */}
            <View className="h-20 w-20 rounded-full bg-slate-900 border border-slate-800 items-center justify-center shadow-xl mb-4 overflow-hidden">
              <ShieldCheck size={40} color="#10b981" />
            </View>
            <Text className="text-2xl font-black text-white tracking-tight">Welcome Back</Text>
            <Text className="text-xs font-semibold text-slate-500 mt-1">
              Sign in to manage your marketplace account
            </Text>
          </View>

          <View className="space-y-4 mb-6">
            <Input
              label="Email Address"
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={16} color="#64748b" />}
            />

            <Input
              label="Password"
              placeholder="••••••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={16} color="#64748b" />}
            />
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            className="mb-4"
          />

          {biometricsAvailable ? (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              activeOpacity={0.7}
              className="flex-row items-center justify-center py-3.5 border border-dashed border-slate-800 rounded-xl mb-4 gap-2"
            >
              <Fingerprint size={18} color="#10b981" />
              <Text className="text-xs font-extrabold text-slate-300">
                Sign In with Fingerprint / Face ID
              </Text>
            </TouchableOpacity>
          ) : null}

          <View className="flex-row items-center justify-center gap-1.5 mt-6">
            <Text className="text-xs text-slate-500 font-bold">New customer?</Text>
            <TouchableOpacity onPress={() => router.push("/auth/otp")}>
              <Text className="text-xs font-black text-primary">Verify Email via OTP</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
