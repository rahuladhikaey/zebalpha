import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { matchGoAlphaSubcategory } from "@shared/constants/goAlpha";

async function resolveSellerFromRequest(req: Request) {
  const supabase = await createSupabaseServerClient();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const { data } = await supabaseServer.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return null;

  let query = supabaseServer
    .from("sellers")
    .select("id, user_id, business_name, full_name, owner_name, pickup_pincode, pickup_address, email");

  if (user.email) {
    query = query.or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`);
  } else {
    query = query.eq("user_id", user.id);
  }
  const { data: seller } = await query.maybeSingle();
  return seller ? { user, seller } : null;
}

export async function GET(req: Request) {
  try {
    const ctx = await resolveSellerFromRequest(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = supabaseServer.schema("go_alpha");
    const [{ data: goSeller }, { data: goProducts }] = await Promise.all([
      db.from("sellers").select("*").eq("seller_id", ctx.seller.id).maybeSingle(),
      db.from("products").select("id, source_product_id, is_active, go_alpha_price, go_alpha_stock").eq("seller_id", ctx.seller.id),
    ]);

    return NextResponse.json({
      goSeller: goSeller || null,
      activeProductIds: (goProducts || []).filter((p: any) => p.is_active).map((p: any) => p.source_product_id),
      goProducts: goProducts || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveSellerFromRequest(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { productId, activate, goAlphaPrice, goAlphaStock } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const db = supabaseServer.schema("go_alpha");

    // Deactivate if requested
    if (!activate) {
      await db
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("source_product_id", productId)
        .eq("seller_id", ctx.seller.id);

      return NextResponse.json({ success: true, is_active: false });
    }

    // Fetch source product from public.products (zero duplicate image upload)
    const { data: srcProd, error: prodErr } = await supabaseServer
      .from("products")
      .select("id, seller_id, name, price, mrp, stock, image_url, images, sizes, colors, category_id, categories(name)")
      .eq("id", productId)
      .eq("seller_id", ctx.seller.id)
      .maybeSingle();

    if (prodErr || !srcProd) {
      return NextResponse.json({ error: "Product not found for this seller" }, { status: 404 });
    }

    const matchedSub = matchGoAlphaSubcategory({
      name: srcProd.name,
      category: (srcProd as any).categories?.name || "",
    });

    if (!matchedSub) {
      return NextResponse.json(
        { error: "This product subcategory is not eligible for GOα 5–6 Hr Quick Commerce." },
        { status: 400 }
      );
    }

    // Ensure seller has go_alpha.sellers profile
    let { data: goSeller } = await db
      .from("sellers")
      .select("*")
      .eq("seller_id", ctx.seller.id)
      .maybeSingle();

    const fallbackPin = String(ctx.seller.pickup_pincode || "700014").replace(/\D/g, "").slice(0, 6) || "700014";
    if (!goSeller) {
      const { data: createdSeller, error: createSelErr } = await db
        .from("sellers")
        .insert({
          seller_id: ctx.seller.id,
          user_id: ctx.user.id,
          store_name: ctx.seller.business_name || ctx.seller.full_name || "GOα Local Store",
          pickup_pincode: fallbackPin,
          pickup_address: ctx.seller.pickup_address || "",
          serviceable_pincodes: [fallbackPin],
          is_approved: true,
          is_active: true,
        })
        .select()
        .single();
      if (createSelErr) {
        return NextResponse.json({ error: createSelErr.message }, { status: 500 });
      }
      goSeller = createdSeller;
    }

    const primaryImg =
      srcProd.image_url ||
      (Array.isArray(srcProd.images) && srcProd.images.length > 0 ? srcProd.images[0] : null);

    const { data: upserted, error: upsertErr } = await db
      .from("products")
      .upsert(
        {
          source_product_id: srcProd.id,
          seller_id: ctx.seller.id,
          subcategory_slug: matchedSub.slug,
          category_group: matchedSub.categoryGroup,
          title: srcProd.name,
          image_url: primaryImg,
          images: srcProd.images || [],
          sizes: srcProd.sizes || [],
          colors: srcProd.colors || [],
          go_alpha_price: Number(goAlphaPrice || srcProd.price || 0),
          mrp: srcProd.mrp ? Number(srcProd.mrp) : null,
          go_alpha_stock: Number(goAlphaStock ?? srcProd.stock ?? 10),
          pickup_pincode: goSeller.pickup_pincode || fallbackPin,
          delivery_eta_label: "5–6 Hours",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "source_product_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_active: true, product: upserted });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
