import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

// POST /api/admin/categories (Insert or Seed)
export async function POST(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Check if it's an array of categories (seeding) or a single category
    const isArray = Array.isArray(body);
    const payload = isArray ? body : [body];

    const { data, error } = await supabaseServer
      .from("categories")
      .insert(payload)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: isArray ? data : data?.[0] });
  } catch (error: any) {
    console.error("Create/Seed category API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/categories (Update)
export async function PUT(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ success: false, message: "Missing id or updates" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    console.error("Update category API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/categories (Delete)
export async function DELETE(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing category id" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    console.error("Delete category API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
