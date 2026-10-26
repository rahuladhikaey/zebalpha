import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Validates editorial card "From Price" against real eligible products in the catalog.
 * For Auto From Price: returns the lowest purchasable price.
 * For Manual From Price: validates that entered price is >= lowest purchasable price.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { destinationType, destinationId, manualPrice } = body;

    if (!destinationType || !destinationId) {
      return NextResponse.json(
        { success: false, message: "destinationType and destinationId are required." },
        { status: 400 }
      );
    }

    let lowestPrice = 0;
    let eligibleProductsCount = 0;

    if (destinationType === "category" || destinationType === "subcategory") {
      // Find active products under category
      const { data: prods, error: pErr } = await supabaseServer
        .from("products")
        .select("id, price, stock, is_active, is_approved")
        .or(`category_id.eq.${destinationId},subcategory_id.eq.${destinationId}`)
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock", 0)
        .gt("price", 0)
        .order("price", { ascending: true })
        .limit(100);

      if (pErr) {
        console.warn("[Price Validation] Direct product query error:", pErr);
      }

      if (prods && prods.length > 0) {
        eligibleProductsCount = prods.length;
        lowestPrice = Math.min(...prods.map((p) => Number(p.price)));
      } else {
        // Fallback: check subcategories under this parent category
        const { data: subcats } = await supabaseServer
          .from("categories")
          .select("id")
          .eq("parent_id", destinationId);

        if (subcats && subcats.length > 0) {
          const subcatIds = subcats.map((s) => s.id);
          const { data: subProds } = await supabaseServer
            .from("products")
            .select("price")
            .in("category_id", subcatIds)
            .eq("is_active", true)
            .eq("is_approved", true)
            .gt("stock", 0)
            .gt("price", 0)
            .order("price", { ascending: true })
            .limit(100);

          if (subProds && subProds.length > 0) {
            eligibleProductsCount = subProds.length;
            lowestPrice = Math.min(...subProds.map((p) => Number(p.price)));
          }
        }
      }
    } else if (destinationType === "product") {
      const { data: prod } = await supabaseServer
        .from("products")
        .select("id, price, stock, is_active, is_approved")
        .eq("id", destinationId)
        .maybeSingle();

      if (prod && prod.is_active && prod.is_approved && prod.stock > 0) {
        eligibleProductsCount = 1;
        lowestPrice = Number(prod.price);
      }
    } else {
      // Custom URL or generic
      lowestPrice = 0;
      eligibleProductsCount = 1;
    }

    const numericManual = manualPrice !== undefined && manualPrice !== null && manualPrice !== "" 
      ? Number(manualPrice) 
      : null;

    let isValid = true;
    let reason = "Valid price configuration";

    if (eligibleProductsCount === 0 && (destinationType === "category" || destinationType === "subcategory" || destinationType === "product")) {
      isValid = false;
      reason = "No eligible active, in-stock products found for this destination.";
    } else if (numericManual !== null) {
      if (numericManual <= 0) {
        isValid = false;
        reason = "Manual From Price must be greater than zero.";
      } else if (lowestPrice > 0 && numericManual > lowestPrice) {
        // Warning: Manual price is higher than the lowest product
        isValid = true;
        reason = `Note: Advertised From ₹${numericManual} is higher than the lowest found product (₹${lowestPrice}).`;
      } else if (lowestPrice > 0 && numericManual < lowestPrice) {
        // Admin entered a price that is lower than any real product in that category! Misleading claim!
        isValid = false;
        reason = `Misleading claim rejected: Lowest available product in this category is ₹${lowestPrice}. You entered ₹${numericManual}, which has no matching purchasable item.`;
      }
    }

    return NextResponse.json({
      success: true,
      isValid,
      reason,
      lowestPrice,
      eligibleProductsCount,
      autoFromPrice: lowestPrice,
      manualPrice: numericManual,
    });
  } catch (error: any) {
    console.error("[Spotlight Price Validation Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to validate price." },
      { status: 500 }
    );
  }
}
