import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = supabaseServer.schema("zeb_quick");

    const [
      { data: orders },
      { data: products },
      { data: sellers },
      { data: pincodes },
      { data: subcategories },
      { data: mainCategories },
      { data: publicSellers },
      { data: publicPickupHubs },
      { data: publicProducts },
    ] = await Promise.all([
      db.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("products").select("*").order("activated_at", { ascending: false }).limit(300),
      db.from("sellers").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("serviceable_pincodes").select("*").order("corridor_name", { ascending: true }).order("pincode", { ascending: true }),
      db.from("allowed_subcategories").select("*").order("display_order", { ascending: true }),
      db.from("main_categories").select("*").order("display_order", { ascending: true }),
      supabaseServer.from("sellers").select("id, user_id, business_name, owner_name, full_name, email, phone_number, mobile_number, pincode, city, pickup_address, status, account_status").limit(500),
      supabaseServer.from("seller_pickup_locations").select("seller_id, location_name, name, contact_name, contact_phone, phone, contact_email, address, address_line1, city, state, pincode, is_default").order("is_default", { ascending: false }).limit(1000),
      supabaseServer.from("products").select("id, seller_id").limit(2000),
    ]);

    const orderList = orders || [];
    const productList = products || [];
    const sellerList = sellers || [];
    const pincodeList = pincodes || [];
    const subcategoryList = subcategories || [];

    // Build lookup maps for full seller details + eligible sellers with 0 live ZebQuick products
    const activePinMap = new Map<string, any>();
    pincodeList.filter((p: any) => p.is_active).forEach((p: any) => activePinMap.set(String(p.pincode), p));

    const hubBySellerOrUser = new Map<string, any>();
    (publicPickupHubs || []).forEach((h: any) => {
      if (h.seller_id && !hubBySellerOrUser.has(String(h.seller_id))) {
        hubBySellerOrUser.set(String(h.seller_id), h);
      }
    });

    const goProductsCountBySeller = new Map<string, number>();
    productList.filter((p: any) => p.is_active).forEach((p: any) => {
      const k = String(p.seller_id);
      goProductsCountBySeller.set(k, (goProductsCountBySeller.get(k) || 0) + 1);
    });

    const totalZebProductsBySeller = new Map<string, number>();
    (publicProducts || []).forEach((p: any) => {
      const k = String(p.seller_id);
      totalZebProductsBySeller.set(k, (totalZebProductsBySeller.get(k) || 0) + 1);
    });

    const goSellerIds = new Set(sellerList.map((s: any) => String(s.seller_id)));
    const publicSellerMap = new Map((publicSellers || []).map((ps: any) => [String(ps.id), ps]));

    const enrichedGoSellers = sellerList.map((gs: any) => {
      const ps = publicSellerMap.get(String(gs.seller_id)) || {};
      const hub = hubBySellerOrUser.get(String(gs.seller_id)) || hubBySellerOrUser.get(String(ps.user_id || "")) || {};
      const pin = String(hub.pincode || gs.pickup_pincode || ps.pincode || "").replace(/\D/g, "").slice(0, 6);
      const pinMeta = activePinMap.get(pin);
      return {
        ...gs,
        owner_name: ps.owner_name || ps.full_name || hub.contact_name || "",
        email: ps.email || hub.contact_email || "",
        phone: ps.phone_number || ps.mobile_number || hub.contact_phone || hub.phone || "",
        pickup_address: hub.address || hub.address_line1 || gs.pickup_address || ps.pickup_address || "",
        city: hub.city || gs.city || ps.city || "",
        pickup_pincode: pin,
        corridor_name: pinMeta?.corridor_name || "",
        live_go_products: goProductsCountBySeller.get(String(gs.seller_id)) || 0,
        total_zeb_products:
          (totalZebProductsBySeller.get(String(gs.seller_id)) || 0) +
          (ps.user_id && String(ps.user_id) !== String(gs.seller_id) ? totalZebProductsBySeller.get(String(ps.user_id)) || 0 : 0),
      };
    });

    const eligibleNotLiveSellers = (publicSellers || [])
      .map((ps: any) => {
        const hub = hubBySellerOrUser.get(String(ps.id)) || hubBySellerOrUser.get(String(ps.user_id || "")) || {};
        const pin = String(hub.pincode || ps.pincode || "").replace(/\D/g, "").slice(0, 6);
        const pinMeta = activePinMap.get(pin);
        const liveGoCount = goProductsCountBySeller.get(String(ps.id)) || 0;
        if (!pinMeta || liveGoCount > 0) return null;
        return {
          id: ps.id,
          seller_id: ps.id,
          store_name: ps.business_name || hub.location_name || hub.name || ps.full_name || "Seller Store",
          owner_name: ps.owner_name || ps.full_name || hub.contact_name || "",
          email: ps.email || hub.contact_email || "",
          phone: ps.phone_number || ps.mobile_number || hub.contact_phone || hub.phone || "",
          pickup_pincode: pin,
          pickup_address: hub.address || hub.address_line1 || ps.pickup_address || "",
          city: hub.city || ps.city || "",
          area_name: pinMeta.area_name || "",
          corridor_name: pinMeta.corridor_name || "",
          account_status: ps.account_status || ps.status || "Active",
          is_onboarded_zeb_quick: goSellerIds.has(String(ps.id)),
          live_go_products: 0,
          total_zeb_products:
            (totalZebProductsBySeller.get(String(ps.id)) || 0) +
            (ps.user_id && String(ps.user_id) !== String(ps.id) ? totalZebProductsBySeller.get(String(ps.user_id)) || 0 : 0),
        };
      })
      .filter(Boolean);

    const totalRevenue = orderList.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    const totalCommission = orderList.reduce((s: number, o: any) => s + Number(o.commission_amount || 0), 0);
    const activeUsers = new Set(orderList.map((o: any) => o.user_id || o.phone).filter(Boolean)).size;
    const deliveredOrders = orderList.filter((o: any) => o.order_status === "DELIVERED");
    const onTimeDelivered = deliveredOrders.filter((o: any) =>
      o.delivered_at && o.promised_delivery_at
        ? new Date(o.delivered_at).getTime() <= new Date(o.promised_delivery_at).getTime()
        : true
    ).length;

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalCommission,
        totalOrders: orderList.length,
        activeUsers,
        activeProducts: productList.filter((p: any) => p.is_active).length,
        totalSellers: sellerList.length,
        activePincodes: pincodeList.filter((p: any) => p.is_active).length,
        onTimeSlaPct: deliveredOrders.length > 0 ? Math.round((onTimeDelivered / deliveredOrders.length) * 100) : 100,
      },
      orders: orderList,
      products: productList,
      sellers: enrichedGoSellers,
      eligibleNotLiveSellers,
      pincodes: pincodeList,
      subcategories: subcategoryList,
      mainCategories: mainCategories || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load ZebQuick data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = supabaseServer.schema("zeb_quick");

    if (body.action === "add_pincode") {
      const pincode = String(body.pincode || "").replace(/\D/g, "").slice(0, 6);
      if (pincode.length !== 6 || !body.area_name || !body.city) {
        return NextResponse.json({ error: "6-digit pincode, area name, and city are required" }, { status: 400 });
      }
      const { error } = await db.from("serviceable_pincodes").upsert(
        {
          pincode,
          area_name: String(body.area_name).trim(),
          city: String(body.city).trim(),
          corridor_name: String(body.corridor_name || "Sealdah-Krishnanagar").trim(),
          is_active: true,
        },
        { onConflict: "pincode" }
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (body.action === "create_main_category") {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Main category name is required" }, { status: 400 });
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const { error } = await db.from("main_categories").upsert(
        {
          slug,
          name,
          description: String(body.description || "").trim() || null,
          image_url: String(body.image_url || "").trim() || null,
          theme_color: String(body.theme_color || "#F8CB46").trim() || "#F8CB46",
          display_order: Number(body.display_order || 10),
          is_active: true,
        },
        { onConflict: "slug" }
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (body.action === "create_subcategory") {
      const name = String(body.name || "").trim();
      const categoryGroup = String(body.category_group || "").trim();
      if (!name || !categoryGroup) {
        return NextResponse.json({ error: "Main category and subcategory name are required" }, { status: 400 });
      }
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const keywords = String(body.keywords || name)
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      const { error } = await db.from("allowed_subcategories").upsert(
        {
          slug,
          name,
          category_group: categoryGroup,
          image_url: String(body.image_url || "").trim() || null,
          keywords: keywords.length > 0 ? keywords : [name.toLowerCase()],
          display_order: Number(body.display_order || 50),
          is_active: true,
        },
        { onConflict: "slug" }
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const db = supabaseServer.schema("zeb_quick");

    if (body.action === "toggle_product" && body.id) {
      await db.from("products").update({ is_active: Boolean(body.is_active) }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "toggle_seller" && body.id) {
      await db.from("sellers").update({ is_approved: Boolean(body.is_approved), is_active: Boolean(body.is_approved) }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "toggle_pincode" && body.pincode) {
      await db.from("serviceable_pincodes").update({ is_active: Boolean(body.is_active) }).eq("pincode", body.pincode);
      return NextResponse.json({ success: true });
    }
    if (body.action === "delete_pincode" && body.pincode) {
      await db.from("serviceable_pincodes").delete().eq("pincode", body.pincode);
      return NextResponse.json({ success: true });
    }
    if (body.action === "toggle_subcategory" && body.id) {
      await db.from("allowed_subcategories").update({ is_active: Boolean(body.is_active) }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "toggle_featured_subcategory" && body.id) {
      await db.from("allowed_subcategories").update({ is_featured: Boolean(body.is_featured) }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "toggle_main_category" && body.id) {
      await db.from("main_categories").update({ is_active: Boolean(body.is_active) }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "update_main_theme" && body.id && body.theme_color) {
      await db.from("main_categories").update({ theme_color: String(body.theme_color).trim() }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "update_main_icon" && body.id && typeof body.image_url === "string") {
      await db.from("main_categories").update({ image_url: body.image_url.trim() || null }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "update_subcategory_icon" && body.id && typeof body.image_url === "string") {
      await db.from("allowed_subcategories").update({ image_url: body.image_url.trim() || null }).eq("id", body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "update_order_status" && body.id && body.order_status) {
      const nextStatus = String(body.order_status).toUpperCase();
      const patch: any = { order_status: nextStatus, updated_at: new Date().toISOString() };
      if (nextStatus === "DELIVERED") patch.delivered_at = new Date().toISOString();
      await db.from("orders").update(patch).eq("id", body.id);
      await db.from("order_items").update({ item_status: nextStatus }).eq("order_id", body.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
