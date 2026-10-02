import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { invalidateCachePattern } from "@/lib/cacheHelper";

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json().catch(() => ({}));
    if (secret !== "zebalpha_admin_purge_2026") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const tables = [
      "shipping_events",
      "shipments",
      "order_items",
      "seller_orders",
      "payments",
      "orders",
      "cart",
      "wishlist",
      "stock_history",
      "reviews",
      "products"
    ];

    const results: Record<string, string> = {};

    for (const table of tables) {
      try {
        const { error } = await supabaseServer
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        if (error) {
          results[table] = `Error: ${error.message}`;
        } else {
          results[table] = "Deleted successfully";
        }
      } catch (err: any) {
        results[table] = `Exception: ${err.message}`;
      }
    }

    // Flush all product and homepage caches
    await invalidateCachePattern("products:*");
    await invalidateCachePattern("homepage:*");

    return NextResponse.json({
      success: true,
      message: "All products, shipments, and orders have been purged.",
      results
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
