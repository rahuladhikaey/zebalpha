"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_no?: string;
  avatar_url?: string;
  gender?: string;
  role?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Authoritative Profile Synchronizer & Fetcher
  const fetchOrSyncProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setProfile(null);
      return;
    }

    try {
      // 1. Attempt to fetch profile from public.profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (data && !error) {
        setProfile(data as UserProfile);
        return;
      }

      // 2. If profile is missing (e.g. initial Google OAuth login or trigger delay), create idempotently
      const metadata = authUser.user_metadata || {};
      const fallbackName = metadata.full_name || metadata.name || metadata.user_name || authUser.email?.split("@")[0] || "Customer";
      const fallbackAvatar = metadata.avatar_url || metadata.picture || "";

      const newProfileData = {
        id: authUser.id,
        email: authUser.email?.toLowerCase().trim() || "",
        full_name: fallbackName,
        avatar_url: fallbackAvatar,
        role: "customer",
        status: "active",
        updated_at: new Date().toISOString()
      };

      const { data: upsertedProfile, error: upsertErr } = await supabase
        .from("profiles")
        .upsert(newProfileData, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (upsertedProfile && !upsertErr) {
        setProfile(upsertedProfile as UserProfile);
      } else {
        // Fallback to memory profile if DB upsert is restricted by client RLS
        setProfile(newProfileData as UserProfile);
      }
    } catch (err) {
      console.warn("[Auth Profile Sync Notice]:", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchOrSyncProfile(user);
    }
  }, [user, fetchOrSyncProfile]);

  useEffect(() => {
    let mounted = true;

    // Check existing active session and restore session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrSyncProfile(session.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for real-time auth state events (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, SIGNED_OUT)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        if (currentUser) {
          await fetchOrSyncProfile(currentUser);
        }
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchOrSyncProfile]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("loginEmail");
        window.localStorage.removeItem("signupEmail");
      }
    } catch (err) {
      console.error("[SignOut Error]:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

