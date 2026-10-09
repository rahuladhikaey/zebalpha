import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// GET /api/admin/products — Returns 100% of seller products using service role key (bypasses RLS)
export async function GET(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { data: products, error } = await supabaseServer
      .from("products")
      .select("id, name, slug, description, price, mrp, stock, low_stock_limit, status, is_premium, is_new_drop, tier, collection, target_drop_date, is_active, is_approved, approval_status, category_id, brand, seller_id, created_at, updated_at, image_url, thumbnail_url, images, specifications, packages")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Products fetch notice from DB:", error.message);
      return NextResponse.json({ success: true, data: [] }, { headers: NO_STORE_HEADERS });
    }

    return NextResponse.json({ success: true, data: products || [] }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    console.error("GET admin products API error:", error);
    return NextResponse.json({ success: true, data: [] }, { headers: NO_STORE_HEADERS });
  }
}

// PUT /api/admin/products — Moderation update (approval status, active toggle, tier, collection)
export async function PUT(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("products")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data?.[0] || null });
  } catch (error: any) {
    console.error("PUT admin products API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/admin/products
export async function DELETE(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("DELETE admin products API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to delete product" }, { status: 500 });
  }
}
