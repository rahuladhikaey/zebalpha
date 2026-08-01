import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// Use unified production database endpoints
const supabaseUrl = "https://bprkenwmheakcqryjupi.supabase.co";
const supabaseAnonKey = "sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR";

// Custom SecureStore adapter for native AsyncStorage security compliance
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn("SecureStore set item error:", e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn("SecureStore delete item error:", e);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
