import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Mail, KeyRound, ArrowLeft } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";
import { useAuthStore } from "../../shared/stores/useAuthStore";
import { Input } from "../../shared/components/Input";
import { Button } from "../../shared/components/Button";

export default function OTPScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true, // Auto-registers new users
        },
      });

      if (error) throw error;

      setOtpSent(true);
      setTimer(60);
      Alert.alert("Code Sent", "6-digit verification code sent to your email inbox.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!token || token.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: "email",
      });

      if (error) throw error;

      if (data.session) {
        await setSession(data.session);
        Alert.alert("Verified", "OTP code successfully verified.");
        router.dismissAll();
      }
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="px-6 pt-4 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-900">
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-sm font-black text-white ml-2">Back</Text>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6 justify-center">
          <View className="items-center mb-10">
            <View className="h-20 w-20 rounded-full bg-slate-900 border border-slate-800 items-center justify-center shadow-xl mb-4 overflow-hidden">
              <KeyRound size={40} color="#10b981" />
            </View>
            <Text className="text-2xl font-black text-white tracking-tight">
              {!otpSent ? "Email OTP Verification" : "Verify Code"}
            </Text>
            <Text className="text-xs font-semibold text-slate-500 mt-1 text-center">
              {!otpSent 
                ? "Enter your email address to receive a secure login OTP code" 
                : `Enter the 6-digit verification code sent to ${email}`}
            </Text>
          </View>

          {!otpSent ? (
            <View className="space-y-6">
              <Input
                label="Email Address"
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                icon={<Mail size={16} color="#64748b" />}
              />

              <Button
                title="Send Verification Code"
                onPress={handleSendOTP}
                loading={loading}
              />
            </View>
          ) : (
            <View className="space-y-6">
              <Input
                label="6-Digit Verification Code"
                placeholder="000 000"
                keyboardType="number-pad"
                maxLength={6}
                value={token}
                onChangeText={setToken}
                icon={<KeyRound size={16} color="#64748b" />}
              />

              <Button
                title="Verify OTP & Complete Log In"
                onPress={handleVerifyOTP}
                loading={loading}
              />

              <View className="items-center mt-4">
                {timer > 0 ? (
                  <Text className="text-xs font-bold text-slate-500">
                    Resend code in {timer}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOTP} disabled={loading}>
                    <Text className="text-xs font-black text-primary hover:underline">
                      Resend Verification Code
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
