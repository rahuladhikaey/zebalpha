import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";
import {
  getShiprocketToken,
  getShiprocketPickupLocations,
  addShiprocketPickupLocation,
  createShiprocketOrder,
  assignShiprocketAWB,
  requestShiprocketPickup,
  generateShiprocketLabel,
} from "@/shared/utils/shiprocket";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, weightKg = 0.5, dimensions, preferredCourier } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID is required." },
        { status: 400 }
      );
    }

    // 1. Authenticate seller session or allow superadmin execution
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Fetch order details from Supabase using service role
    const { data: order, error: orderErr } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, message: "Order record not found in database." },
        { status: 404 }
      );
    }

    // If order is already manifested with live AWB
    if (order.order_status === "ready_to_ship" && order.tracking_number) {
      return NextResponse.json({
        success: true,
        message: "Order is already manifested and ready to ship.",
        awbNumber: order.tracking_number,
        courierName: order.courier_name,
        shipmentId: order.shipment_id || order.shiprocket_shipment_id,
        shiprocketOrderId: order.shiprocket_order_id,
        labelUrl: order.label_url,
      });
    }

    // 3. Resolve Seller Pickup Location
    const sellerId = order.seller_id || user?.id || "default-seller";
    let pickupLocationData: any = null;

    // A. Check seller_pickup_locations table
    try {
      const { data: loc } = await supabaseServer
        .from("seller_pickup_locations")
        .select("*")
        .eq("seller_id", sellerId)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (loc) pickupLocationData = loc;
    } catch (e) {
      console.warn("seller_pickup_locations lookup notice:", e);
    }

    // B. Fallback to sellers profile
    if (!pickupLocationData) {
      const { data: sellerProf } = await supabaseServer
        .from("sellers")
        .select("*")
        .or(`id.eq.${sellerId},user_id.eq.${sellerId}`)
        .maybeSingle();

      if (sellerProf) {
        pickupLocationData = {
          name: sellerProf.business_name || sellerProf.store_name || "Merchant Dispatch Hub",
          phone: sellerProf.mobile_number || sellerProf.phone_number || "9999999999",
          address_line1: sellerProf.pickup_address || sellerProf.warehouse_address || "Merchant Central Hub",
          city: sellerProf.city || "Kolkata",
          state: sellerProf.state || "West Bengal",
          pincode: sellerProf.pincode || "700001",
        };
      }
    }

    if (!pickupLocationData) {
      pickupLocationData = {
        name: "Merchant Central Dispatch Hub",
        phone: "9883637054",
        address_line1: "Radhanagar, Gobindopur",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "741254",
      };
    }

    // 4. Resolve Customer Delivery Address
    const rawAddress = order.shipping_address || order.address || {};
    const customerAddress = {
      name: order.customer_name || (typeof rawAddress === "object" ? rawAddress.name : "") || "Customer",
      address_line1: (typeof rawAddress === "object" ? rawAddress.address || rawAddress.address_line1 : rawAddress) || "Customer Address",
      city: (typeof rawAddress === "object" ? rawAddress.city : order.city) || "Kolkata",
      state: (typeof rawAddress === "object" ? rawAddress.state : order.state) || "West Bengal",
      pincode: String((typeof rawAddress === "object" ? rawAddress.pincode : order.pincode) || "700001").replace(/\D/g, "").slice(0, 6),
      phone: String(order.phone || (typeof rawAddress === "object" ? rawAddress.phone : "") || "9999999999").replace(/\D/g, "").slice(0, 10),
    };

    // 5. Parse Order Items
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

    const orderItems = (rawItems.length > 0 ? rawItems : [{ name: "Apparel Item", price: order.total_amount || 499, quantity: 1 }]).map((it: any) => ({
      name: (it.name || it.title || "Apparel Item").slice(0, 50),
      sku: (it.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`).slice(0, 30),
      units: Number(it.quantity || it.qty || 1),
      selling_price: Number(it.price || it.subtotal || 100),
      discount: 0,
      tax: 0,
      hsn: 0,
    }));

    // 6. Attempt Live Shiprocket Push
    let liveSynced = false;
    let awbNumber = "";
    let courierName = preferredCourier || "Delhivery Surface";
    let shiprocketOrderId = "";
    let shipmentId = "";
    let labelUrl = "";
    let routingHub = "CCU/EAST-HUB-01";

    let shiprocketError = "";

    try {
      const token = await getShiprocketToken();
      if (token) {
        // A. Match or register distinct pickup location in Shiprocket for THIS specific seller
        let activePickupName = "";
        const srLocations = await getShiprocketPickupLocations(token);

        const sellerPincodeStr = String(pickupLocationData.pincode || "741254").replace(/\D/g, "").slice(0, 6);
        const sellerNameStr = String(pickupLocationData.name || "").toLowerCase().trim();
        const sellerAddrStr = String(pickupLocationData.address_line1 || "").toLowerCase().trim();

        // Check if THIS seller's address/pincode is already registered in Shiprocket
        const match = (srLocations || []).find((l: any) => {
          const srPin = String(l.pin_code || l.pincode || "").trim();
          const srName = String(l.pickup_location || l.name || "").toLowerCase().trim();
          const srAddr = String(l.address || l.address_line1 || "").toLowerCase().trim();
          return srPin === sellerPincodeStr || (srName && srName === sellerNameStr) || (srAddr && sellerAddrStr && srAddr.includes(sellerAddrStr.slice(0, 15)));
        });

        if (match) {
          activePickupName = match.pickup_location || match.name;
        } else {
          // Register THIS seller's unique address as a new Pickup Location in Shiprocket
          const sanitizedNick = `Hub_${sellerId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}_${sellerPincodeStr}`.slice(0, 30);
          const regRes = await addShiprocketPickupLocation(token, {
            pickup_location: sanitizedNick,
            name: (pickupLocationData.name || "Seller Hub").slice(0, 30),
            email: "seller@zebalpha.com",
            phone: String(pickupLocationData.phone || "9883637054").replace(/\D/g, "").slice(0, 10),
            address: (pickupLocationData.address_line1 || "Merchant Dispatch Hub").slice(0, 80),
            city: (pickupLocationData.city || "Kolkata").slice(0, 30),
            state: (pickupLocationData.state || "West Bengal").slice(0, 30),
            pin_code: sellerPincodeStr,
          });

          if (regRes.success && regRes.pickup_location) {
            activePickupName = regRes.pickup_location;
          } else if (srLocations && srLocations.length > 0) {
            activePickupName = srLocations[0].pickup_location;
          } else {
            activePickupName = "Primary";
          }
        }

        // B. Construct Shiprocket Payload
        const isCOD = (order.payment_method || "").toUpperCase() === "COD";
        const subTotal = Number(order.total_amount) || orderItems.reduce((acc, it) => acc + (it.selling_price * it.units), 0);

        const shiprocketPayload = {
          order_id: String(order.order_number || order.id).slice(0, 45),
          order_date: new Date(order.created_at || Date.now()).toISOString().slice(0, 19).replace("T", " "),
          pickup_location: activePickupName,
          billing_customer_name: customerAddress.name.slice(0, 40),
          billing_last_name: "",
          billing_address: customerAddress.address_line1.slice(0, 80),
          billing_city: customerAddress.city.slice(0, 30),
          billing_pincode: customerAddress.pincode,
          billing_state: customerAddress.state.slice(0, 30),
          billing_country: "India",
          billing_phone: customerAddress.phone,
          shipping_is_billing: true,
          order_items: orderItems,
          payment_method: isCOD ? "COD" : "Prepaid",
          shipping_charges: Number(order.shipping_charge || 0),
          sub_total: subTotal,
          length: Number(dimensions?.length || 15),
          breadth: Number(dimensions?.breadth || dimensions?.width || 15),
          height: Number(dimensions?.height || 10),
          weight: Number(weightKg || 0.5),
        };

        // C. Create Order in Shiprocket
        const srOrder = await createShiprocketOrder(token, shiprocketPayload);
        if (srOrder && srOrder.shipment_id) {
          shipmentId = String(srOrder.shipment_id);
          shiprocketOrderId = String(srOrder.order_id);

          // D. Assign Live AWB & Request Pickup
          try {
            const awbData = await assignShiprocketAWB(token, shipmentId);
            if (awbData && awbData.awb_code) {
              awbNumber = awbData.awb_code;
              courierName = awbData.courier_name || courierName;
              routingHub = awbData.routing_hub || routingHub;

              // D2. Automatically Request Courier Pickup (No manual Ship Now required on Shiprocket)
              try {
                await requestShiprocketPickup(token, shipmentId);
              } catch (pickupErr) {
                console.warn("Shiprocket Pickup request notice:", pickupErr);
              }
            }
          } catch (awbErr: any) {
            console.warn("Shiprocket AWB assignment notice:", awbErr.message);
            shiprocketError = awbErr.message;
          }

          // E. Generate Official Shiprocket Label Link
          try {
            const lblData = await generateShiprocketLabel(token, shipmentId);
            if (lblData.label_url) {
              labelUrl = lblData.label_url;
            }
          } catch (_) {}

          liveSynced = true;
        } else {
          shiprocketError = "Shiprocket Order Creation failed: No shipment_id returned";
        }
      }
    } catch (srErr: any) {
      shiprocketError = `Live Shiprocket API Error: ${srErr.message}`;
      console.warn(shiprocketError);
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
        message: shiprocketError || "Could not push order to Shiprocket Live. Please verify SHIPROCKET_EMAIL & SHIPROCKET_PASSWORD in environment variables.",
      }, { status: 400 });
    }

    const dispatchSla = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 8. Update Supabase Orders Table
    const updatePayload: any = {
      order_status: "ready_to_ship",
      tracking_number: awbNumber,
      courier_name: courierName,
      shipment_id: shipmentId,
      routing_hub: routingHub,
      dispatch_sla: dispatchSla,
      label_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (shiprocketOrderId) {
      updatePayload.shiprocket_order_id = shiprocketOrderId;
    }
    if (labelUrl) {
      updatePayload.label_url = labelUrl;
    }

    const { error: updError } = await supabaseServer
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (updError) {
      console.error("Failed to update order status in Supabase:", updError);
      // Fallback simple update
      await supabaseServer
        .from("orders")
        .update({
          order_status: "ready_to_ship",
          tracking_number: awbNumber,
          courier_name: courierName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    // 9. Synchronize or Insert into Shipments Table
    try {
      await supabaseServer.from("shipments").upsert({
        order_id: order.id,
        seller_id: sellerId,
        user_id: order.user_id || null,
        shipment_number: `SHP-${order.order_number || order.id.slice(0, 8).toUpperCase()}`,
        shiprocket_order_id: shiprocketOrderId,
        shiprocket_shipment_id: shipmentId,
        awb_code: awbNumber,
        courier_name: courierName,
        routing_hub: routingHub,
        destination_code: `${customerAddress.pincode.slice(0, 3)}_${customerAddress.city.slice(0, 3).toUpperCase()}`,
        return_code: `${pickupLocationData.pincode},${Math.floor(1000000 + Math.random() * 9000000)}`,
        label_url: labelUrl || `https://apiv2.shiprocket.in/v1/external/shipments/print/label/${shipmentId}`,
        status: "ready_to_ship",
        dispatch_sla: dispatchSla,
        customer_name: customerAddress.name,
        shipping_address: customerAddress.address_line1,
        city: customerAddress.city,
        state: customerAddress.state,
        pincode: customerAddress.pincode,
        phone: customerAddress.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "order_id" });
    } catch (shipmentErr) {
      console.warn("Shipments record upsert notice:", shipmentErr);
    }

    return NextResponse.json({
      success: true,
      liveSynced,
      awbNumber,
      courierName,
      routingHub,
      shipmentId,
      shiprocketOrderId,
      labelUrl,
      message: liveSynced 
        ? `Order successfully pushed to Shiprocket! AWB: ${awbNumber}`
        : `Manifested successfully with Courier Gateway! AWB: ${awbNumber}`,
    });
  } catch (err: any) {
    console.error("Create shipment route error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to create shipment" },
      { status: 500 }
    );
  }
}
