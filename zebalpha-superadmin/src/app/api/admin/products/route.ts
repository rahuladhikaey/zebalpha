import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";
import { triggerCacheInvalidation } from "@/shared/utils/cacheInvalidator";

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
    await requireSuperAdmin(req);

    const VALID_ADMIN_PRODUCT_FIELDS = "id, name, slug, description, price, mrp, stock, low_stock_limit, status, tier, collection, is_active, is_approved, approval_status, category_id, brand, seller_id, created_at, updated_at, image_url, images, video_proof_url, specifications, packages";

    let { data: products, error } = await supabaseServer
      .from("products")
      .select(VALID_ADMIN_PRODUCT_FIELDS)
      .order("created_at", { ascending: false });

    if (error || !products) {
      console.warn("Notice fetching specific product columns, retrying with select(*):", error?.message);
      const fallback = await supabaseServer
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (fallback.data) {
        products = fallback.data;
        error = fallback.error;
      }
    }

    if (error) {
      console.warn("Products fetch notice from DB:", error.message);
      return NextResponse.json({ success: true, data: [] }, { headers: NO_STORE_HEADERS });
    }

    const normalized = (products || [])
      .filter((p: any) => String(p.status || "").toUpperCase() !== "DELETED")
      .map((p: any) => ({
        ...p,
        video_proof_url: p.video_proof_url || p.specifications?.video_proof_url || "",
        thumbnail_url: p.thumbnail_url || p.image_url || (Array.isArray(p.images) && p.images[0]) || ""
      }));

    return NextResponse.json({ success: true, data: normalized }, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("GET admin products API error:", error);
    return NextResponse.json({ success: true, data: [] }, { headers: NO_STORE_HEADERS });
  }
}

// PUT /api/admin/products — Moderation update (approval status, active toggle, tier, collection)
export async function PUT(req: Request) {
  try {
    await requireSuperAdmin(req);

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

    // Immediately sync changes to customer website & Android app
    await triggerCacheInvalidation({ target: "product", id, categoryId: data?.[0]?.category_id }).catch(() => {});

    return NextResponse.json({ success: true, data: data?.[0] || null });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("PUT admin products API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/admin/products
export async function DELETE(req: Request) {
  try {
    await requireSuperAdmin(req);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    const { error: hardErr } = await supabaseServer
      .from("products")
      .delete()
      .eq("id", id);

    if (hardErr) {
      // Fallback to soft-delete if historical order_items reference this product
      const { error: softErr } = await supabaseServer
        .from("products")
        .update({ is_active: false, status: "DELETED", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (softErr) throw softErr;
    }

    // Immediately purge deleted product from customer website & Android app caches
    await triggerCacheInvalidation({ target: "product", id }).catch(() => {});

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("DELETE admin products API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to delete product" }, { status: 500 });
  }
}
