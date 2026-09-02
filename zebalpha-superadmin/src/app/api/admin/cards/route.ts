import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

// GET /api/admin/cards
export async function GET(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from("card_applications")
      .select("*")
      .order("applied_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("Fetch card applications API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/cards
export async function POST(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { data, error } = await supabaseServer
      .from("card_applications")
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Create card application API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/cards
export async function PUT(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { appId, updates } = body;

    if (!appId || !updates) {
      return NextResponse.json({ success: false, message: "Missing appId or updates" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("card_applications")
      .update(updates)
      .eq("id", appId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Update card application API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
