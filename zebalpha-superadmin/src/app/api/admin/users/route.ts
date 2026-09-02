import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function GET(req: Request) {
  try {
    // 1. Verify admin session
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch all profiles using service role
    const { data, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, profiles: data || [] });
  } catch (error: any) {
    console.error("Fetch profiles API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
