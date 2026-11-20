import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCachedOrFetch } from "@/lib/cacheHelper";
import { sanitizeProductMedia } from "@/lib/productImageUtils";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.productId;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid product ID parameter" },
        { status: 400 }
      );
    }

    const product = await getCachedOrFetch(
      `product:variants:v2:${productId}`,
      async () => {
        const { data, error } = await supabaseServer
          .from("products")
          .select("id, name, brand, price, mrp, stock, status, is_active, image_url, images, category_id, packages, specifications, created_at, seller_id")
          .eq("id", productId)
          .maybeSingle();

        if (error) throw new Error(error.message);
        return data ? sanitizeProductMedia(data) : null;
      },
      300 // 5 min Redis TTL (L1 RAM capped at 30s)
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (
      product.is_active === false ||
      product.status === "ARCHIVED" ||
      String(product.status || "").toUpperCase() === "DELETED"
    ) {
      return NextResponse.json(
        { success: false, error: "Product is currently inactive" },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          mrp: product.mrp,
          stock: product.stock,
          status: product.status,
          image_url: product.image_url,
          images: product.images,
          category_id: product.category_id,
          packages: Array.isArray(product.packages) ? product.packages : [],
          specifications: product.specifications || {},
          seller_id: product.seller_id,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    console.error("[Variants API Unexpected Error]:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
