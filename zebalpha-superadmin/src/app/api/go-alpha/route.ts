import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const db = supabaseServer.schema("go_alpha");

    const [
      { data: orders },
      { data: products },
      { data: sellers },
      { data: pincodes },
      { data: subcategories },
    ] = await Promise.all([
      db.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("products").select("*").order("activated_at", { ascending: false }).limit(300),
      db.from("sellers").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("serviceable_pincodes").select("*").order("corridor_name", { ascending: true }).order("pincode", { ascending: true }),
      db.from("allowed_subcategories").select("*").order("display_order", { ascending: true }),
    ]);

    const orderList = orders || [];
    const productList = products || [];
    const sellerList = sellers || [];
    const pincodeList = pincodes || [];
    const subcategoryList = subcategories || [];

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
      sellers: sellerList,
      pincodes: pincodeList,
      subcategories: subcategoryList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load GOα data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = supabaseServer.schema("go_alpha");

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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const db = supabaseServer.schema("go_alpha");

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
    if (body.action === "toggle_subcategory" && body.id) {
      await db.from("allowed_subcategories").update({ is_active: Boolean(body.is_active) }).eq("id", body.id);
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
