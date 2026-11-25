import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = String(searchParams.get("pincode") || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    const categoryGroup = searchParams.get("category_group") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const q = (searchParams.get("q") || "").trim();
    const idsParam = searchParams.get("ids") || "";

    const supabase = getSupabaseServer();
    const db = supabase.schema("go_alpha");

    // 1. If specific IDs requested (e.g. for Wishlist)
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) return NextResponse.json({ serviceable: true, products: [] });
      const { data: items, error } = await db
        .from("products")
        .select("*")
        .in("id", ids)
        .eq("is_active", true);
      if (error) {
        return NextResponse.json({ serviceable: true, products: [], warning: error.message });
      }
      return NextResponse.json({ serviceable: true, products: items || [] });
    }

    // 2. Validate pincode against active ZebQuick corridor
    if (pincode.length === 6) {
      const { data: pinRow } = await db
        .from("serviceable_pincodes")
        .select("pincode, area_name, city, corridor_name")
        .eq("pincode", pincode)
        .eq("is_active", true)
        .maybeSingle();

      if (!pinRow) {
        return NextResponse.json({
          serviceable: false,
          pincode,
          products: [],
          message: "ZebQuick 5–6 Hr delivery is currently available on the Sealdah – Krishnanagar route.",
        });
      }
    }

    // 3. Find local approved ZebQuick sellers serving this pincode
    let sellerIds: string[] | null = null;
    if (pincode.length === 6) {
      const { data: sellers } = await db
        .from("sellers")
        .select("seller_id, pickup_pincode, serviceable_pincodes")
        .eq("is_active", true)
        .eq("is_approved", true);

      if (Array.isArray(sellers) && sellers.length > 0) {
        const matched = sellers.filter(
          (s: any) =>
            s.pickup_pincode === pincode ||
            (Array.isArray(s.serviceable_pincodes) && s.serviceable_pincodes.includes(pincode)) ||
            // Same 3-digit postal zone prefix (e.g. 700xxx or 741xxx or 743xxx)
            (typeof s.pickup_pincode === "string" && s.pickup_pincode.slice(0, 3) === pincode.slice(0, 3))
        );
        sellerIds = matched.map((s: any) => s.seller_id);
        if (sellerIds.length === 0) {
          return NextResponse.json({ serviceable: true, pincode, products: [] });
        }
      }
    }

    // 4. Query ZebQuick products
    let query = db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .gt("go_alpha_stock", 0)
      .order("activated_at", { ascending: false })
      .limit(100);

    if (sellerIds && sellerIds.length > 0) {
      query = query.in("seller_id", sellerIds);
    }
    if (categoryGroup && categoryGroup !== "All") {
      query = query.eq("category_group", categoryGroup);
    }
    if (subcategory) {
      query = query.eq("subcategory_slug", subcategory);
    }
    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    const { data: products, error } = await query;
    if (error) {
      return NextResponse.json({ serviceable: true, pincode, products: [], warning: error.message });
    }

    return NextResponse.json({
      serviceable: true,
      pincode,
      products: products || [],
    });
  } catch (err: any) {
    return NextResponse.json({ serviceable: false, products: [], error: err?.message || "Server error" }, { status: 500 });
  }
}
