import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (_) {}

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, business_name, store_name")
      .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const sellerId = seller?.id || user.id;

    // Fetch active main categories
    const { data: mainCats } = await supabaseServer
      .from("categories")
      .select("id, name, slug")
      .is("parent_id", null)
      .or("is_active.is.null,is_active.eq.true")
      .order("display_order", { ascending: true });

    // Fetch seller's submitted spotlight requests
    let requests: any[] = [];
    let migrationRequired = false;
    try {
      const { data: rows, error } = await supabaseServer
        .from("category_spotlight_requests")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          migrationRequired = true;
        }
      } else {
        requests = (rows || []).map((r: any) => ({
          ...r,
          category_name: (mainCats || []).find((c: any) => String(c.id) === String(r.category_id))?.name || "Category",
        }));
      }
    } catch {
      migrationRequired = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        mainCategories: mainCats || [],
        requests,
        sellerName: seller?.store_name || seller?.business_name || user.email || "Seller",
        migrationRequired,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, business_name, store_name")
      .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const sellerId = seller?.id || user.id;
    const sellerName = seller?.store_name || seller?.business_name || user.email || "Seller";

    const body = await req.json();
    const { category_id, target_widget, brand_name, headline, offer_badge, banner_image_url, product_ids } = body;

    if (!category_id || !brand_name?.trim() || !headline?.trim()) {
      return NextResponse.json(
        { success: false, error: "Category, Brand Name, and Headline are required." },
        { status: 400 }
      );
    }

    const allowedTargets = ["HERO_CAROUSEL", "BRAND_SPOTLIGHT_GRID", "CURATED_SHELF", "COMBO_KITS_MARQUEE"];
    const safeTarget = allowedTargets.includes(target_widget) ? target_widget : "BRAND_SPOTLIGHT_GRID";

    const { data, error } = await supabaseServer
      .from("category_spotlight_requests")
      .insert({
        seller_id: sellerId,
        seller_name: sellerName,
        category_id,
        target_widget: safeTarget,
        brand_name: brand_name.trim(),
        headline: headline.trim(),
        offer_badge: (offer_badge || "Up to 40% Off").trim(),
        banner_image_url: banner_image_url?.trim() || null,
        product_ids: Array.isArray(product_ids) ? product_ids.slice(0, 4) : [],
        status: "PENDING",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { success: false, error: "Category Spotlight table is pending admin SQL setup." },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to submit request" }, { status: 500 });
  }
}
