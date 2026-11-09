import { supabase } from "./supabaseClient";

export interface MediaAuthSession {
  authorized: boolean;
  role: string | null;
  userId: string | null;
  email: string | null;
  errorMessage?: string;
}

/**
 * Validates whether the currently signed-in user has authorization to access the Media Panel.
 * Non-bypassable: queries database table user_app_memberships under RLS.
 */
export async function checkMediaAccess(): Promise<MediaAuthSession> {
  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session?.user) {
      return {
        authorized: false,
        role: null,
        userId: null,
        email: null,
        errorMessage: "No active authenticated session."
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
        userId,
        email: userEmail,
        errorMessage: "Unable to verify application access permissions."
      };
    }

    // Determine if user has media or global OWNER access
    const mediaMembership = (memberships || []).find(
      (m) => m.app_name === "media" || (m.app_name === "all" && m.role === "OWNER")
    );

    if (!mediaMembership) {
      return {
        authorized: false,
        role: null,
        userId,
        email: userEmail,
        errorMessage: "Unauthorized. Your account does not have access permissions for the Media & Marketing Panel."
      };
    }

    return {
      authorized: true,
      role: mediaMembership.role,
      userId,
      email: userEmail
    };
  } catch (err: any) {
    return {
      authorized: false,
      role: null,
      userId: null,
      email: null,
      errorMessage: err.message || "Authentication verification error."
    };
  }
}

