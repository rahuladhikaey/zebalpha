import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export async function GET(req: Request) {
  try {
    // 1. Cryptographically verify admin session
    await requireSuperAdmin(req);

    // 2. Fetch all profiles using service role
    const { data, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, profiles: data || [] });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("Fetch profiles API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
