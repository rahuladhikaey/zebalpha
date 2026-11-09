import { supabase } from "./supabaseClient";

export interface OperationsAuthSession {
  authorized: boolean;
  role: string | null;
  userId: string | null;
  email: string | null;
  errorMessage?: string;
}

/**
 * Validates whether the currently signed-in user has authorization to access the Operations Panel.
 * Non-bypassable: queries database table user_app_memberships under RLS.
 */
export async function checkOperationsAccess(): Promise<OperationsAuthSession> {
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

    // Check membership in user_app_memberships for 'operations' or 'all'
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

    // Determine if user has operations or global OWNER access
    const opsMembership = (memberships || []).find(
      (m) => m.app_name === "operations" || (m.app_name === "all" && m.role === "OWNER")
    );

    if (!opsMembership) {
      return {
        authorized: false,
        role: null,
        userId,
        email: userEmail,
        errorMessage: "Unauthorized. Your account does not have access permissions for the Internal Operations Panel."
      };
    }

    return {
      authorized: true,
      role: opsMembership.role,
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

