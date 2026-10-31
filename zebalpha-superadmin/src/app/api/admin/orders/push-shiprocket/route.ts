import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

const SHIPROCKET_API = "https://apiv2.shiprocket.in/v1/external";

export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    // 1. Fetch order
    const { data: order, error: orderErr } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // 2. Try Shiprocket Auth
    let liveSynced = false;
    let awbNumber = order.tracking_number || "";
    let courierName = order.courier_name || "Delhivery Surface";
    let shiprocketOrderId = order.shiprocket_order_id || "";
    let shipmentId = order.shipment_id || "";
    let labelUrl = order.label_url || "";
    let routingHub = order.routing_hub || "CCU/EAST-HUB-01";

    let shiprocketError = "";
    const email = (process.env.SHIPROCKET_EMAIL || "").trim();
    const password = (process.env.SHIPROCKET_PASSWORD || "").trim();

    if (!email || !password) {
      shiprocketError = "Shiprocket credentials (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD) missing in environment variables.";
    } else {
      try {
        const authRes = await fetch(`${SHIPROCKET_API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const authData = await authRes.json();

        if (!authRes.ok || !authData.token) {
          shiprocketError = `Shiprocket Auth Failed (${authRes.status}): ${authData.message || "Invalid credentials"}`;
          console.error(`[Shiprocket Auth Error]: ${shiprocketError}`);
        } else {
          const token = authData.token;

          // Resolve seller's pickup address
          const sellerId = order.seller_id;
          if (!sellerId) {
            return NextResponse.json({
              success: false,
              message: "Cannot manifest shipment: Seller ID is missing on order."
            }, { status: 400 });
          }
          let sellerPincode = "";
          let sellerName = "";
          let sellerPhone = "";
          let sellerAddress = "";
          let sellerCity = "";
          let sellerState = "";

          try {
            const { data: sellerProf } = await supabaseServer
              .from("sellers")
              .select("*")
              .or(`id.eq.${sellerId},user_id.eq.${sellerId}`)
              .maybeSingle();

            if (sellerProf) {
              const sAddr = sellerProf.pickup_address || sellerProf.warehouse_address || sellerProf.address || "";
              let sPin = sellerProf.pincode;
              if (!sPin && sAddr) {
                const m = sAddr.match(/(?:Pin|Pincode|PIN)?\s*[:\-]?\s*(\d{6})\b/i) || sAddr.match(/\b(\d{6})\b/);
                if (m) sPin = m[1];
              }
              sellerPincode = String(sPin || "").replace(/\D/g, "").slice(0, 6);
              sellerName = sellerProf.business_name || sellerProf.store_name || sellerProf.full_name || "Merchant Hub";
              sellerPhone = String(sellerProf.mobile_number || sellerProf.phone_number || sellerProf.phone || "").replace(/\D/g, "").slice(0, 10);
              sellerAddress = sAddr;
              sellerCity = sellerProf.city || "";
              sellerState = sellerProf.state || "";
            }
          } catch (_) { }

          // Check registered pickup locations in Shiprocket
          let activePickup = "";
          const pickupRes = await fetch(`${SHIPROCKET_API}/settings/company/pickup`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const pickupData = await pickupRes.json();
          const srLocations = pickupData.data?.shipping_address || [];

          const expectedNick = `Hub_${sellerId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}_${sellerPincode}`.slice(0, 30);
          const match = srLocations.find((l: any) => {
            const srCode = String(l.pickup_location || l.name || "").trim().toLowerCase();
            const srPin = String(l.pin_code || l.pincode || "").trim();
            const srPhone = String(l.phone || "").replace(/\D/g, "").slice(0, 10);
            const srAddr = String(l.address || l.address_line1 || "").toLowerCase().trim();

            if (srCode === expectedNick.toLowerCase()) return true;

            const isPrimary = srCode === "primary";
            if (isPrimary) {
              return srPin === sellerPincode && srPhone === sellerPhone && srAddr.length > 5 && sellerAddress.toLowerCase().includes(srAddr.slice(0, 15));
            }

            return srPin === sellerPincode && (
              (srPhone && sellerPhone && srPhone === sellerPhone) ||
              (srAddr && sellerAddress && (srAddr.includes(sellerAddress.toLowerCase().slice(0, 15)) || sellerAddress.toLowerCase().includes(srAddr.slice(0, 15))))
            );
          });

          if (match) {
            activePickup = match.pickup_location || match.name;
          } else {
            // Auto-register seller's pickup location in Shiprocket
            const nick = expectedNick;
            const hasRoadOrHouse = /(?:house|flat|road|shop|plot|holding|lane|gali|street|no\.|building|near|bhavan|complex|market|premise)/i.test(sellerAddress);
            const formattedAddr = hasRoadOrHouse ? sellerAddress : `Shop / Holding No. 1, ${sellerAddress}`;

            const regRes = await fetch(`${SHIPROCKET_API}/settings/company/addpickup`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                pickup_location: nick,
                name: sellerName.slice(0, 30),
                email: "seller@zebalpha.com",
                phone: sellerPhone,
                address: formattedAddr.slice(0, 80),
                city: sellerCity.slice(0, 30),
                state: sellerState.slice(0, 30),
                country: "India",
                pin_code: sellerPincode,
              }),
            });
            const regData = await regRes.json();
            if (regRes.ok && (regData?.pickup_location || regData?.address?.pickup_location)) {
              activePickup = regData?.pickup_location || regData?.address?.pickup_location;
            } else if (srLocations.length > 0) {
              activePickup = srLocations[0].pickup_location;
            } else {
              activePickup = "Primary";
            }
          }

          // Format items
          let rawItems: any[] = [];
          if (Array.isArray(order.items) && order.items.length > 0) {
            rawItems = order.items;
          } else if (order.product_details) {
            try {
              rawItems = typeof order.product_details === "string" ? JSON.parse(order.product_details) : order.product_details;
              if (!Array.isArray(rawItems)) rawItems = [rawItems];
            } catch (_) {
              rawItems = [];
            }
          }

          const orderItems = (rawItems.length > 0 ? rawItems : [{ name: "Apparel Item", price: order.total_amount || 499, quantity: 1 }]).map((it: any, idx: number) => ({
            name: (it.name || it.title || "Apparel Item").slice(0, 50),
            sku: String(it.sku || (it.product_id ? `SKU-${it.product_id}` : `SKU-ITEM-${idx + 1}`)).slice(0, 30),
            units: Number(it.quantity || it.qty || 1),
            selling_price: Number(it.price || it.subtotal || 100),
            discount: 0,
            tax: 0,
            hsn: 0,
          }));

          let rawAddressObj: any = {};
          let addressStr = "";

          if (typeof order.shipping_address === "object" && order.shipping_address !== null) {
            rawAddressObj = order.shipping_address;
            addressStr = order.shipping_address.address || order.address || "";
          } else if (typeof order.shipping_address === "string") {
            addressStr = order.shipping_address;
          } else if (typeof order.address === "string") {
            addressStr = order.address;
          } else if (typeof order.address === "object" && order.address !== null) {
            rawAddressObj = order.address;
            addressStr = order.address.address || "";
          }

          let extractedPin = order.pincode || rawAddressObj.pincode || rawAddressObj.pin_code || rawAddressObj.postal_code;
          if (!extractedPin && addressStr) {
            const pinMatch = addressStr.match(/(?:Pin|Pincode|PIN)?\s*[:\-]?\s*(\d{6})\b/i) || addressStr.match(/\b(\d{6})\b/);
            if (pinMatch) extractedPin = pinMatch[1];
          }
          const pincode = String(extractedPin || "").replace(/\D/g, "").slice(0, 6);
          if (!pincode || pincode.length !== 6) {
            throw new Error(`Order #${order.order_number || order.id} has no valid 6-digit delivery PIN code.`);
          }

          let extractedCity = order.city || rawAddressObj.city || rawAddressObj.village;
          if (!extractedCity && addressStr) {
            const cityMatch = addressStr.match(/(?:Vill|Village|City|Town)\s*[:\-]\s*([^,]+)/i);
            if (cityMatch) extractedCity = cityMatch[1].trim();
          }
          const city = (extractedCity || "").trim();

          let extractedState = order.state || rawAddressObj.state;
          if (!extractedState && addressStr) {
            const stateMatch = addressStr.match(/(?:P\.O|PO|State)\s*[:\-]\s*([^,]+)/i);
            if (stateMatch) extractedState = stateMatch[1].trim();
          }
          const state = (extractedState || "").trim();

          if (!city || !state) {
            throw new Error(`Order #${order.order_number || order.id} is missing delivery city or state.`);
          }

          const customerName = order.customer_name || rawAddressObj.name || "Customer";
          const customerAddress = addressStr || rawAddressObj.address_line1 || rawAddressObj.address || "";
          if (!customerAddress) {
            throw new Error(`Order #${order.order_number || order.id} is missing delivery street address.`);
          }

          const phone = String(order.phone || rawAddressObj.phone || "").replace(/\D/g, "").slice(0, 10);
          if (!phone || phone.length !== 10) {
            throw new Error(`Order #${order.order_number || order.id} has no valid 10-digit customer phone number.`);
          }

          const isCOD = (order.payment_method || "").toUpperCase() === "COD";

          // Create order in Shiprocket
          const srOrderRes = await fetch(`${SHIPROCKET_API}/orders/create/adhoc`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              order_id: String(order.order_number || order.id).slice(0, 45),
              order_date: new Date(order.created_at || Date.now()).toISOString().slice(0, 19).replace("T", " "),
              pickup_location: activePickup,
              billing_customer_name: customerName.slice(0, 40),
              billing_last_name: "",
              billing_address: customerAddress.slice(0, 80),
              billing_city: city.slice(0, 30),
              billing_pincode: pincode,
              billing_state: state.slice(0, 30),
              billing_country: "India",
              billing_phone: phone,
              shipping_is_billing: true,
              order_items: orderItems,
              payment_method: isCOD ? "COD" : "Prepaid",
              shipping_charges: Number(order.shipping_charge || 0),
              sub_total: Number(order.total_amount) || 500,
              length: 15,
              width: 15,
              height: 10,
              weight: 0.5,
            }),
          });

          const srOrderData = await srOrderRes.json();
          if (srOrderRes.ok && srOrderData.shipment_id) {
            shipmentId = String(srOrderData.shipment_id);
            shiprocketOrderId = String(srOrderData.order_id);

            // Assign AWB
            const awbRes = await fetch(`${SHIPROCKET_API}/courier/assign/awb`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ shipment_id: shipmentId }),
            });
            const awbData = await awbRes.json();
            const resp = awbData?.response?.data || awbData;
            if (resp?.awb_code) {
              awbNumber = resp.awb_code;
              courierName = resp.courier_name || courierName;
              routingHub = resp.routing_hub || routingHub;
            }

            // Generate Label
            const lblRes = await fetch(`${SHIPROCKET_API}/courier/generate/label`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ shipment_id: [shipmentId] }),
            });
            const lblData = await lblRes.json();
            if (lblData?.label_url) {
              labelUrl = lblData.label_url;
            }

            liveSynced = true;
          } else {
            shiprocketError = `Shiprocket Order Creation Failed (${srOrderRes.status}): ${srOrderData.message || JSON.stringify(srOrderData.errors || "Invalid payload")}`;
            console.error(`[Shiprocket API Error]: ${shiprocketError}`);
          }
        }
      } catch (err: any) {
        shiprocketError = `Shiprocket live push exception: ${err.message}`;
        console.warn(shiprocketError);
      }
    }

    if (!liveSynced) {
      // Save error to database for diagnostic visibility
      await supabaseServer
        .from("orders")
        .update({
          shiprocket_error: shiprocketError || "Failed to sync with live Shiprocket API",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json({
        success: false,
        liveSynced: false,
        message: shiprocketError || "Could not push order to Shiprocket Live. Check API credentials or pickup location.",
      }, { status: 400 });
    }

    // Update orders table with live values
    const updatePayload: any = {
      order_status: "ready_to_ship",
      tracking_number: awbNumber,
      courier_name: courierName,
      shipment_id: shipmentId,
      routing_hub: routingHub,
      shiprocket_order_id: shiprocketOrderId,
      shiprocket_error: null,
      label_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (labelUrl) updatePayload.label_url = labelUrl;

    const { data: updatedOrder, error: updErr } = await supabaseServer
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select()
      .single();

    if (updErr) {
      console.error("Failed to update order:", updErr);
      return NextResponse.json({ success: false, message: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      liveSynced: true,
      data: updatedOrder,
      message: "Pushed to Shiprocket Live successfully!",
    });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("Push Shiprocket error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to process" }, { status: 500 });
  }
}
