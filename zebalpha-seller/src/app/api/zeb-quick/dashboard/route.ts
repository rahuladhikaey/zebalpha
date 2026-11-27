import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { createShadowfaxHyperlocalOrder } from "@/lib/shadowfaxHyperlocal";

async function resolveSeller(req: Request) {
  const supabase = await createSupabaseServerClient();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const { data } = await supabaseServer.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return null;

  let query = supabaseServer
    .from("sellers")
    .select("id, user_id, business_name, full_name, pincode, city, pickup_address, phone_number, mobile_number, email");
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
    const ctx = await resolveSeller(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = supabaseServer.schema("zeb_quick");
    const idsToQuery = Array.from(new Set([ctx.seller.id, ctx.user.id].filter(Boolean)));
    const [
      { data: pickupHub },
      { data: goSeller },
      { data: orderItems },
      { data: ledger },
      { data: goProducts },
    ] = await Promise.all([
      supabaseServer
        .from("seller_pickup_locations")
        .select("pincode, address, address_line1, city, state, is_default")
        .in("seller_id", idsToQuery)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("sellers").select("*").eq("seller_id", ctx.seller.id).maybeSingle(),
      db.from("order_items").select("*, orders(*)").eq("seller_id", ctx.seller.id).order("created_at", { ascending: false }).limit(100),
      db.from("seller_payout_ledger").select("*").eq("seller_id", ctx.seller.id).order("created_at", { ascending: false }),
      db.from("products").select("*").eq("seller_id", ctx.seller.id).eq("is_active", true),
    ]);

    const resolvedPin = String(pickupHub?.pincode || (ctx.seller as any).pincode || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    const resolvedAddr =
      pickupHub?.address ||
      pickupHub?.address_line1 ||
      ctx.seller.pickup_address ||
      "";
    const resolvedCity = pickupHub?.city || (ctx.seller as any).city || "";

    let serviceablePinRow: any = null;
    if (resolvedPin.length === 6) {
      const { data: pinData } = await db
        .from("serviceable_pincodes")
        .select("pincode, area_name, city, corridor_name, is_active")
        .eq("pincode", resolvedPin)
        .eq("is_active", true)
        .maybeSingle();
      serviceablePinRow = pinData || null;
    }

    const items = orderItems || [];
    const ledgerRows = ledger || [];
    const cancelledOrderIds = new Set(
      items
        .filter((i: any) => String(i.item_status || i.orders?.order_status || "").toUpperCase() === "CANCELLED")
        .map((i: any) => String(i.order_id))
    );
    const activeLedgerRows = ledgerRows.filter((r: any) => !cancelledOrderIds.has(String(r.order_id)));
    const totalGrossRevenue = activeLedgerRows.reduce((s: number, r: any) => s + Number(r.gross_amount || 0), 0);
    const totalCommission = activeLedgerRows.reduce((s: number, r: any) => s + Number(r.commission_amount || 0), 0);
    const totalNetEarnings = activeLedgerRows.reduce((s: number, r: any) => s + Number(r.net_earning || 0), 0);

    // Group order_items by order_id so each ZebQuick order shows cleanly once with full customer details
    const orderGroupMap = new Map<string, any>();
    for (const it of items) {
      const oid = String(it.order_id);
      const ord = it.orders || {};
      if (!orderGroupMap.has(oid)) {
        orderGroupMap.set(oid, {
          id: oid,
          order_number: ord.order_number || oid,
          customer_name: ord.customer_name || "Customer",
          phone: ord.phone || "",
          delivery_address: ord.delivery_address || "",
          delivery_pincode: ord.delivery_pincode || "",
          payment_method: ord.payment_method || "COD",
          payment_status: ord.payment_status || "PENDING",
          order_status: ord.order_status || it.item_status || "PLACED",
          subtotal: Number(ord.subtotal || 0),
          delivery_fee: Number(ord.delivery_fee || 0),
          total_amount: Number(ord.total_amount || 0),
          promised_delivery_at: ord.promised_delivery_at || null,
          created_at: ord.created_at || it.created_at,
          cancel_reason: ord.cancel_reason || null,
          cancelled_at: ord.cancelled_at || null,
          shadowfax_order_id: ord.shadowfax_order_id || null,
          tracking_url: ord.tracking_url || null,
          rider_name: ord.rider_name || null,
          rider_phone: ord.rider_phone || null,
          net_earning: 0,
          items: [],
        });
      }
      const grp = orderGroupMap.get(oid);
      grp.net_earning += Number(it.seller_earning || 0);
      grp.items.push({
        id: it.id,
        title: it.title,
        name: it.title,
        size: it.size || "Standard",
        color: it.color || "",
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        price: Number(it.unit_price || 0),
        image_url: it.image_url || "",
        item_status: it.item_status || grp.order_status,
        seller_earning: Number(it.seller_earning || 0),
      });
    }
    const groupedOrders = Array.from(orderGroupMap.values());

    return NextResponse.json({
      goSeller: goSeller || null,
      sellerProfile: {
        business_name: ctx.seller.business_name || ctx.seller.full_name || "ZebQuick Store",
        full_name: ctx.seller.full_name || "",
        phone: ctx.seller.phone_number || ctx.seller.mobile_number || "",
        email: ctx.seller.email || "",
        pickup_address: resolvedAddr,
        city: resolvedCity,
        pincode: resolvedPin,
      },
      zebalphaPickupPincode: resolvedPin,
      zebalphaPickupAddress: resolvedAddr,
      zebalphaPickupCity: resolvedCity,
      isZebQuickServiceable: Boolean(serviceablePinRow),
      serviceAreaName: serviceablePinRow?.area_name || "",
      corridorName: serviceablePinRow?.corridor_name || "",
      stats: {
        totalOrders: groupedOrders.filter((o) => String(o.order_status).toUpperCase() !== "CANCELLED").length,
        activeProducts: (goProducts || []).length,
        totalGrossRevenue,
        totalCommission,
        totalNetEarnings,
      },
      orders: groupedOrders,
      orderItems: items,
      goProducts: goProducts || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await resolveSeller(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const db = supabaseServer.schema("zeb_quick");

    if (body.action === "update_store_location") {
      const pickupPin = String(body.pickup_pincode || "").replace(/\D/g, "").slice(0, 6);
      if (pickupPin.length !== 6) {
        return NextResponse.json({ error: "Valid 6-digit pickup pincode required" }, { status: 400 });
      }
      const extraPins = String(body.serviceable_pincodes || "")
        .split(",")
        .map((p) => p.replace(/\D/g, "").slice(0, 6))
        .filter((p) => p.length === 6);
      const mergedPins = Array.from(new Set([pickupPin, ...extraPins]));

      const { data: upserted, error } = await db
        .from("sellers")
        .upsert(
          {
            seller_id: ctx.seller.id,
            user_id: ctx.user.id,
            store_name: body.store_name || ctx.seller.business_name || ctx.seller.full_name || "ZebQuick Store",
            pickup_pincode: pickupPin,
            pickup_address: body.pickup_address || ctx.seller.pickup_address || "",
            serviceable_pincodes: mergedPins,
            is_approved: true,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "seller_id" }
        )
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Sync pickup pincode onto seller's active ZebQuick products
      await db.from("products").update({ pickup_pincode: pickupPin }).eq("seller_id", ctx.seller.id);

      return NextResponse.json({ success: true, goSeller: upserted });
    }

    if (body.action === "update_order_status" && body.orderId && body.status) {
      const nextStatus = String(body.status).toUpperCase();
      await db
        .from("order_items")
        .update({ item_status: nextStatus })
        .eq("order_id", body.orderId)
        .eq("seller_id", ctx.seller.id);

      const orderUpdate: any = { order_status: nextStatus, updated_at: new Date().toISOString() };
      if (nextStatus === "DELIVERED") {
        orderUpdate.delivered_at = new Date().toISOString();
      }
      await db.from("orders").update(orderUpdate).eq("id", body.orderId);

      return NextResponse.json({ success: true });
    }

    if (body.action === "dispatch_shadowfax" && body.orderId) {
      const { data: orderRow } = await db
        .from("orders")
        .select("*")
        .eq("id", body.orderId)
        .maybeSingle();
      if (!orderRow) {
        return NextResponse.json({ error: "ZebQuick order not found" }, { status: 404 });
      }
      const { data: items } = await db
        .from("order_items")
        .select("*")
        .eq("order_id", body.orderId)
        .eq("seller_id", ctx.seller.id);

      const idsToQuery = Array.from(new Set([ctx.seller.id, ctx.user.id].filter(Boolean)));
      const { data: pickupHub } = await supabaseServer
        .from("seller_pickup_locations")
        .select("pincode, address, address_line1, city, contact_phone, phone, location_name")
        .in("seller_id", idsToQuery)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      const pickupPin = String(pickupHub?.pincode || (ctx.seller as any).pincode || "741222").replace(/\D/g, "").slice(0, 6);
      const sfxRes = await createShadowfaxHyperlocalOrder({
        orderNumber: orderRow.order_number,
        orderValue: Number(orderRow.total_amount || 0),
        paid: String(orderRow.payment_status || "").toUpperCase() === "PAID",
        pickup: {
          name: pickupHub?.location_name || ctx.seller.business_name || ctx.seller.full_name || "ZebAlpha Seller",
          phone: String(pickupHub?.contact_phone || pickupHub?.phone || (ctx.seller as any).phone_number || (ctx.seller as any).mobile_number || "9999999999"),
          address: pickupHub?.address || pickupHub?.address_line1 || ctx.seller.pickup_address || "Local Pickup Hub",
          city: pickupHub?.city || (ctx.seller as any).city || "West Bengal",
          pincode: pickupPin,
        },
        drop: {
          name: orderRow.customer_name,
          phone: orderRow.phone,
          address: orderRow.delivery_address,
          pincode: orderRow.delivery_pincode,
        },
        items: (items || []).map((it: any) => ({
          name: it.title,
          quantity: Number(it.quantity || 1),
          price: Number(it.unit_price || 0),
        })),
      });

      if (!sfxRes.ok) {
        return NextResponse.json(
          { error: sfxRes.data?.message || sfxRes.data?.error || "Shadowfax rider booking failed", details: sfxRes.data },
          { status: sfxRes.status || 400 }
        );
      }

      const sfxOrderId = String(sfxRes.data?.sfx_order_id || sfxRes.data?.id || sfxRes.data?.order_id || "");
      const sfxAwb = String(sfxRes.data?.awb_number || sfxOrderId || "");
      await db
        .from("orders")
        .update({
          courier_partner: "SHADOWFAX_HYPERLOCAL",
          shadowfax_order_id: sfxOrderId || null,
          shadowfax_awb: sfxAwb || null,
          shadowfax_status: String(sfxRes.data?.order_status || "ACCEPTED").toUpperCase(),
          order_status: "PACKED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.orderId);

      await db.from("order_items").update({ item_status: "PACKED" }).eq("order_id", body.orderId).eq("seller_id", ctx.seller.id);

      return NextResponse.json({ success: true, shadowfax: sfxRes.data });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
