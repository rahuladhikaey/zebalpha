import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { createShadowfaxHyperlocalOrder } from "@/lib/shadowfaxHyperlocal";
import {
  extractRadiusKm,
  geocodeIndianPincode,
  haversineDistanceKm,
  parseValidCoord,
  resolvePincodeCoordFromRow,
  ZEB_QUICK_RADIUS_SETTING_KEY,
} from "@/lib/zebQuickGeo";

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
      { data: activePincodes },
      { data: radiusSetting },
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
      db.from("serviceable_pincodes").select("pincode, area_name, city, corridor_name, lat, lng, is_active").eq("is_active", true),
      supabaseServer.from("store_settings").select("value").eq("key", ZEB_QUICK_RADIUS_SETTING_KEY).maybeSingle(),
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

    const deliveryRadiusKm = extractRadiusKm(radiusSetting?.value);
    const activePinList = (activePincodes || []) as any[];
    const serviceablePinRow =
      resolvedPin.length === 6
        ? activePinList.find((p) => String(p.pincode || "").replace(/\D/g, "").slice(0, 6) === resolvedPin) || null
        : null;

    let coveredPincodes: Array<{
      pincode: string;
      area_name: string;
      city: string;
      distance_km: number;
    }> = [];
    if (serviceablePinRow) {
      let sellerCoord =
        parseValidCoord(goSeller?.lat, goSeller?.lng) ||
        resolvePincodeCoordFromRow(resolvedPin, serviceablePinRow);
      if (!sellerCoord && resolvedPin.length === 6) {
        sellerCoord = await geocodeIndianPincode(resolvedPin, serviceablePinRow.area_name, serviceablePinRow.city);
        if (sellerCoord) {
          void db.from("serviceable_pincodes").update({ lat: sellerCoord.lat, lng: sellerCoord.lng }).eq("pincode", resolvedPin);
          if (goSeller?.id) {
            void db.from("sellers").update({ lat: sellerCoord.lat, lng: sellerCoord.lng }).eq("id", goSeller.id);
          }
        }
      }
      if (sellerCoord) {
        coveredPincodes = activePinList
          .map((p) => {
            const pPin = String(p.pincode || "").replace(/\D/g, "").slice(0, 6);
            if (pPin === resolvedPin) {
              return {
                pincode: pPin,
                area_name: p.area_name || "",
                city: p.city || "",
                distance_km: 0,
              };
            }
            const pCoord = resolvePincodeCoordFromRow(pPin, p);
            if (!pCoord) return null;
            const dist = haversineDistanceKm(sellerCoord, pCoord);
            if (dist > deliveryRadiusKm) return null;
            return {
              pincode: pPin,
              area_name: p.area_name || "",
              city: p.city || "",
              distance_km: dist,
            };
          })
          .filter((x): x is NonNullable<typeof x> => Boolean(x))
          .sort((a, b) => a.distance_km - b.distance_km || a.pincode.localeCompare(b.pincode));
      } else {
        coveredPincodes = [
          {
            pincode: resolvedPin,
            area_name: serviceablePinRow.area_name || "",
            city: serviceablePinRow.city || "",
            distance_km: 0,
          },
        ];
      }
    }
    const coveredPincodeCount = coveredPincodes.length;

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
          shadowfax_awb: ord.shadowfax_awb || ord.shadowfax_order_id || null,
          shadowfax_status: ord.shadowfax_status || null,
          tracking_url: ord.shadowfax_tracking_url || ord.tracking_url || null,
          rider_name: ord.shadowfax_rider_name || ord.rider_name || null,
          rider_phone: ord.shadowfax_rider_phone || ord.rider_phone || null,
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
      deliveryRadiusKm,
      coveredPincodeCount,
      coveredPincodes,
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

      const [{ data: pinMeta }, { data: radiusSetting }] = await Promise.all([
        db.from("serviceable_pincodes").select("pincode, area_name, city, lat, lng").eq("pincode", pickupPin).maybeSingle(),
        supabaseServer.from("store_settings").select("value").eq("key", ZEB_QUICK_RADIUS_SETTING_KEY).maybeSingle(),
      ]);
      const coord =
        resolvePincodeCoordFromRow(pickupPin, pinMeta) ||
        (await geocodeIndianPincode(pickupPin, pinMeta?.area_name, pinMeta?.city));
      const radiusKm = extractRadiusKm(radiusSetting?.value);

      const { data: upserted, error } = await db
        .from("sellers")
        .upsert(
          {
            seller_id: ctx.seller.id,
            user_id: ctx.user.id,
            store_name: body.store_name || ctx.seller.business_name || ctx.seller.full_name || "ZebQuick Store",
            pickup_pincode: pickupPin,
            pickup_address: body.pickup_address || ctx.seller.pickup_address || "",
            lat: coord?.lat ?? null,
            lng: coord?.lng ?? null,
            delivery_radius_km: radiusKm,
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
      if (String(orderRow.order_status || "").toUpperCase() === "CANCELLED") {
        return NextResponse.json({ error: "Cannot accept a cancelled order." }, { status: 400 });
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
      const dropPin = String(orderRow.delivery_pincode || "").replace(/\D/g, "").slice(0, 6);

      // Resolve real GPS coordinates for pickup & drop pincodes for accurate Shadowfax Hyperlocal dispatch
      const [{ data: pinCoords }, { data: goSellerRow }] = await Promise.all([
        db
          .from("serviceable_pincodes")
          .select("pincode, area_name, city, lat, lng")
          .in("pincode", Array.from(new Set([pickupPin, dropPin].filter((p) => p.length === 6)))),
        db
          .from("sellers")
          .select("lat, lng")
          .eq("seller_id", ctx.seller.id)
          .maybeSingle(),
      ]);

      const coordPinMap = new Map<string, any>();
      (pinCoords || []).forEach((p: any) => {
        coordPinMap.set(String(p.pincode || "").replace(/\D/g, "").slice(0, 6), p);
      });

      const pickupRow = coordPinMap.get(pickupPin);
      const dropRow = coordPinMap.get(dropPin);

      let pickupCoord =
        parseValidCoord(goSellerRow?.lat, goSellerRow?.lng) ||
        resolvePincodeCoordFromRow(pickupPin, pickupRow);
      if (!pickupCoord && pickupPin.length === 6) {
        pickupCoord = await geocodeIndianPincode(pickupPin, pickupRow?.area_name, pickupRow?.city);
        if (pickupCoord && pickupRow) {
          void db.from("serviceable_pincodes").update({ lat: pickupCoord.lat, lng: pickupCoord.lng }).eq("pincode", pickupPin);
        }
      }

      let dropCoord = resolvePincodeCoordFromRow(dropPin, dropRow);
      if (!dropCoord && dropPin.length === 6) {
        dropCoord = await geocodeIndianPincode(dropPin, dropRow?.area_name, dropRow?.city);
        if (dropCoord && dropRow) {
          void db.from("serviceable_pincodes").update({ lat: dropCoord.lat, lng: dropCoord.lng }).eq("pincode", dropPin);
        }
      }

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
          lat: pickupCoord?.lat,
          lng: pickupCoord?.lng,
        },
        drop: {
          name: orderRow.customer_name,
          phone: orderRow.phone,
          address: orderRow.delivery_address,
          pincode: dropPin || orderRow.delivery_pincode,
          lat: dropCoord?.lat,
          lng: dropCoord?.lng,
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
