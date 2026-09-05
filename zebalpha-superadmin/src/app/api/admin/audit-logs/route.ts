import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const actionFilter = searchParams.get("action");

    let query = supabaseServer
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100));

    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (err: any) {
    console.error("[Audit Logs Query Error]:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
