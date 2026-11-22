import { supabase } from "./supabaseClient";

export interface MediaAuthSession {
  authorized: boolean;
  role: string | null;
  isLeader: boolean;
  userId: string | null;
  email: string | null;
  displayName?: string | null;
  handle?: string | null;
  errorMessage?: string;
}

const LEADER_ROLES = new Set([
  "OWNER",
  "SUPER_ADMIN",
  "MEDIA_LEADER",
  "Media Admin",
  "MEDIA_ADMIN",
]);

export function isMediaLeaderRole(role?: string | null): boolean {
  if (!role) return false;
  return LEADER_ROLES.has(role) || LEADER_ROLES.has(role.toUpperCase());
}

/**
 * Validates whether the currently signed-in user has authorization to access the Media Panel.
 * Non-bypassable: queries database table user_app_memberships under RLS.
 */
export async function checkMediaAccess(): Promise<MediaAuthSession> {
  try {
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();
    if (sessionErr || !session?.user) {
      return {
        authorized: false,
        role: null,
        isLeader: false,
        userId: null,
        email: null,
        errorMessage: "No active authenticated session.",
      };
    }

    const userId = session.user.id;
    const userEmail = session.user.email || null;

    // Check membership in user_app_memberships for 'media' or 'all'
    const { data: memberships, error: memErr } = await supabase
      .from("user_app_memberships")
      .select("app_name, role, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (memErr) {
      return {
        authorized: false,
        role: null,
        isLeader: false,
        userId,
        email: userEmail,
        errorMessage: "Unable to verify application access permissions.",
      };
    }

    // Prefer explicit media membership or global OWNER access
    const mediaMembership =
      (memberships || []).find((m) => m.app_name === "media") ||
      (memberships || []).find((m) => m.app_name === "all" && m.role === "OWNER");

    if (!mediaMembership) {
      return {
        authorized: false,
        role: null,
        isLeader: false,
        userId,
        email: userEmail,
        errorMessage:
          "Unauthorized. Your account does not have active permissions for the Alpha Media Panel.",
      };
    }

    // Optional profile enrichment (non-fatal if table not yet migrated)
    let displayName: string | null = null;
    let handle: string | null = null;
    try {
      const { data: profile } = await supabase
        .from("media_creator_profiles")
        .select("full_name, instagram_handle, youtube_handle")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile) {
        displayName = profile.full_name || null;
        handle = profile.instagram_handle || profile.youtube_handle || null;
      }
    } catch {
      // Non-fatal
    }

    return {
      authorized: true,
      role: mediaMembership.role,
      isLeader: isMediaLeaderRole(mediaMembership.role),
      userId,
      email: userEmail,
      displayName,
      handle,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication verification error.";
    return {
      authorized: false,
      role: null,
      isLeader: false,
      userId: null,
      email: null,
      errorMessage: message,
    };
  }
}
