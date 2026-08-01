import { create } from "zustand";
import { supabase } from "../../config/supabaseClient";
import type { UserProfile } from "../types";

interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: any) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setSession: async (session) => {
    if (!session?.user) {
      set({ user: null, profile: null, loading: false });
      return;
    }

    set({ user: session.user, loading: true });

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (data) {
        set({ profile: data, loading: false });
      } else {
        // Fallback: Create default profile if missing (similar to web behavior)
        const newProfile = {
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || "Customer",
          role: "customer",
          status: "active",
        };
        await supabase.from("profiles").upsert(newProfile);
        set({ profile: newProfile as any, loading: false });
      }
    } catch (e) {
      console.warn("Error fetching user profile:", e);
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, profile: null, loading: false });
  },

  initializeAuth: async () => {
    if (get().initialized) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await get().setSession(session);

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        await get().setSession(session);
      });

      set({ initialized: true });
    } catch (e) {
      console.warn("Auth initialization notice:", e);
      set({ initialized: true, loading: false });
    }
  },
}));
