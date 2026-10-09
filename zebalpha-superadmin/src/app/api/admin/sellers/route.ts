import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { triggerCacheInvalidation } from "@shared/utils/cacheInvalidator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// GET /api/admin/sellers
export async function GET(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { data, error } = await supabaseServer
      .from("sellers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Sellers fetch notice from DB:", error.message);
      return NextResponse.json({ success: true, data: [] }, { headers: NO_STORE_HEADERS });
    }

    return NextResponse.json({ success: true, data: data || [] }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    console.error("GET sellers API error:", error);
    return NextResponse.json({ success: true, data: [] }, { headers: NO_STORE_HEADERS });
  }
}

// POST /api/admin/sellers
export async function POST(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { data, error } = await supabaseServer
      .from("sellers")
      .insert([body])
      .select();

    if (error) throw error;

    const newSeller = data?.[0];
    if (newSeller?.id) {
      await triggerCacheInvalidation({ target: "seller", sellerId: newSeller.id });
    }

    return NextResponse.json({ success: true, data: newSeller });
  } catch (error: any) {
    console.error("POST seller API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/sellers
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
      .from("sellers")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    await triggerCacheInvalidation({ target: "seller", sellerId: id });

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    console.error("PUT seller API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/sellers
export async function DELETE(req: Request) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing seller id" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("sellers")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await triggerCacheInvalidation({ target: "seller_lifecycle", sellerId: id });

    return NextResponse.json({ success: true, message: "Seller deleted successfully" });
  } catch (error: any) {
    console.error("DELETE seller API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
