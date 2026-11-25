import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { matchZebQuickSubcategory, type ZebQuickSubcategoryDef } from "@shared/constants/zebQuick";

async function loadLiveAllowedSubcategories(db: ReturnType<typeof supabaseServer.schema>): Promise<ZebQuickSubcategoryDef[] | undefined> {
  try {
    const { data, error } = await db
      .from("allowed_subcategories")
      .select("slug, name, category_group, keywords")
      .eq("is_active", true);
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        slug: row.slug,
        name: row.name,
        categoryGroup: row.category_group,
        keywords: Array.isArray(row.keywords) ? row.keywords : [String(row.name || "").toLowerCase()],
      }));
    }
  } catch {}
  return undefined;
}

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
    .select("id, user_id, business_name, full_name, owner_name, pincode, city, pickup_address, email");

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

    const db = supabaseServer.schema("zeb_quick");
    const [{ data: goSeller }, { data: goProducts }, allowedSubcategories] = await Promise.all([
      db.from("sellers").select("*").eq("seller_id", ctx.seller.id).maybeSingle(),
      db.from("products").select("id, source_product_id, is_active, zeb_quick_price, zeb_quick_stock").eq("seller_id", ctx.seller.id),
      loadLiveAllowedSubcategories(db),
    ]);

    return NextResponse.json({
      goSeller: goSeller || null,
      activeProductIds: (goProducts || []).filter((p: any) => p.is_active).map((p: any) => p.source_product_id),
      goProducts: goProducts || [],
      allowedSubcategories: allowedSubcategories || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveSellerFromRequest(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { productId, activate, zebQuickPrice, zebQuickStock } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const db = supabaseServer.schema("zeb_quick");

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

    const liveAllowed = await loadLiveAllowedSubcategories(db);
    const matchedSub = matchZebQuickSubcategory(
      {
        name: srcProd.name,
        category: (srcProd as any).categories?.name || "",
      },
      liveAllowed
    );

    if (!matchedSub) {
      return NextResponse.json(
        { error: "This product subcategory is not eligible for ZebQuick 5–6 Hr Quick Commerce." },
        { status: 400 }
      );
    }

    // Resolve seller's registered ZebAlpha Pickup Hub pincode
    const idsToQuery = Array.from(new Set([ctx.seller.id, ctx.user.id].filter(Boolean)));
    const { data: pickupHub } = await supabaseServer
      .from("seller_pickup_locations")
      .select("pincode, address, address_line1, city")
      .in("seller_id", idsToQuery)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sellerPin = String(pickupHub?.pincode || (ctx.seller as any).pincode || "")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (sellerPin.length !== 6) {
      return NextResponse.json(
        { error: "Please set your Pickup Warehouse & Hub pincode first before activating ZebQuick." },
        { status: 400 }
      );
    }

    // Verify seller's registered pincode is active in ZebQuick serviceable_pincodes
    const { data: serviceableRow } = await db
      .from("serviceable_pincodes")
      .select("pincode")
      .eq("pincode", sellerPin)
      .eq("is_active", true)
      .maybeSingle();

    if (!serviceableRow) {
      return NextResponse.json(
        {
          error: `Pickup is not available at your registered address (Pincode ${sellerPin}) yet. ZebQuick Express is coming soon to this pincode.`,
        },
        { status: 400 }
      );
    }

    // Ensure seller has zeb_quick.sellers profile synced with ZebAlpha Pickup Hub
    const resolvedAddress = pickupHub?.address || pickupHub?.address_line1 || ctx.seller.pickup_address || "";
    const { data: upsertedSeller, error: createSelErr } = await db
      .from("sellers")
      .upsert(
        {
          seller_id: ctx.seller.id,
          user_id: ctx.user.id,
          store_name: ctx.seller.business_name || ctx.seller.full_name || "ZebQuick Local Store",
          pickup_pincode: sellerPin,
          pickup_address: resolvedAddress,
          city: pickupHub?.city || "West Bengal",
          serviceable_pincodes: [sellerPin],
          is_approved: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "seller_id" }
      )
      .select()
      .single();

    if (createSelErr) {
      return NextResponse.json({ error: createSelErr.message }, { status: 500 });
    }
    const goSeller = upsertedSeller;

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
          zeb_quick_price: Number(zebQuickPrice || srcProd.price || 0),
          mrp: srcProd.mrp ? Number(srcProd.mrp) : null,
          zeb_quick_stock: Number(zebQuickStock ?? srcProd.stock ?? 10),
          pickup_pincode: sellerPin,
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
