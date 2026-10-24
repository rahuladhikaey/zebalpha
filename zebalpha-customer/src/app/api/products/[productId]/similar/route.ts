import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSimilarProducts } from "@/lib/similarProducts";
import { Product } from "@/lib/types";

export const revalidate = 60;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await context.params;
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID parameter is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    let limit = 20;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 50); // Enforce reasonable upper limit
      }
    }

    // 1. Fetch current product details to supply to recommendation engine
    const { data: currentProduct, error: prodErr } = await supabaseServer
      .from("products")
      .select("id, name, brand, price, mrp, stock, status, is_active, category_id, description, image_url, images, specifications, packages, rating, review_count")
      .eq("id", productId)
      .maybeSingle();

    if (prodErr || !currentProduct) {
      return NextResponse.json(
        { error: "Product not found", products: [] },
        { status: 404 }
      );
    }

    // 2. Compute intelligent similar recommendations
    const similarProducts = await getSimilarProducts(currentProduct as unknown as Product, limit);

    return NextResponse.json({
      success: true,
      productId,
      count: similarProducts.length,
      products: similarProducts,
    });
  } catch (error: any) {
    console.error("[API /api/products/:productId/similar] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch similar products", products: [] },
      { status: 500 }
    );
  }
}
