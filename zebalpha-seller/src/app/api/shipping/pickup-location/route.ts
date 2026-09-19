import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Valid merchant session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");
    const requestedSellerId = searchParams.get("sellerId");

    // Fetch caller's seller record
    const { data: callerSeller } = await supabaseServer
      .from("sellers")
      .select("id, user_id, business_name, store_name, full_name, mobile_number, phone_number, phone, pickup_address, pickup_location, warehouse_address, city, state, pincode")
      .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const idsToMatch = [user.id, callerSeller?.id].filter(Boolean) as string[];
    let locations: any[] = [];

    // 1. Fetch from seller_pickup_locations by caller's seller IDs
    try {
      const { data: locData } = await supabaseServer
        .from("seller_pickup_locations")
        .select("*")
        .in("seller_id", idsToMatch)
        .order("is_default", { ascending: false });

      if (locData && locData.length > 0) {
        locations = locData.map((loc) => ({
          id: loc.id,
          seller_id: loc.seller_id,
          name: loc.name || loc.location_name || "Primary Warehouse",
          phone: loc.phone || loc.contact_phone || "",
          address_line1: loc.address_line1 || loc.address || loc.pickup_address || "Warehouse Address",
          city: loc.city || "City",
          state: loc.state || "State",
          pincode: loc.pincode || "700001",
          is_default: Boolean(loc.is_default),
        }));
      }
    } catch (e) {
      console.warn("seller_pickup_locations table query notice:", e);
    }

    // 2. If empty, construct fallback location from caller's seller profile
    if (locations.length === 0 && callerSeller) {
      const address = callerSeller.pickup_address || callerSeller.pickup_location || callerSeller.warehouse_address;
      if (address || callerSeller.city || callerSeller.pincode) {
        locations = [{
          id: `profile-${callerSeller.id || user.id}`,
          seller_id: callerSeller.id || user.id,
          name: `${callerSeller.business_name || callerSeller.store_name || callerSeller.full_name || "Primary"} Warehouse`,
          phone: callerSeller.mobile_number || callerSeller.phone_number || callerSeller.phone || "",
          address_line1: address || "Warehouse Address",
          city: callerSeller.city || "City",
          state: callerSeller.state || "State",
          pincode: callerSeller.pincode || "700001",
          is_default: true,
        }];
      }
    }

    return NextResponse.json({ success: true, locations });
  } catch (err: any) {
    console.error("GET pickup-location API error:", err);
    return NextResponse.json({ success: false, message: err.message, locations: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Valid merchant session required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phone, address_line1, city, state, pincode, is_default } = body;

    if (!address_line1 || !pincode || !phone) {
      return NextResponse.json({ success: false, message: "Address, Pincode, and Phone are required." }, { status: 400 });
    }

    // 1. Resolve caller's verified seller profile
    const { data: existingSeller } = await supabaseServer
      .from("sellers")
      .select("*")
      .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    let resolvedSellerId = existingSeller?.id || user.id;

    // 2. Synchronize sellers profile table
    if (existingSeller) {
      await supabaseServer
        .from("sellers")
        .update({
          pickup_address: address_line1.trim(),
          pickup_location: address_line1.trim(),
          warehouse_address: address_line1.trim(),
          city: city ? city.trim() : existingSeller.city,
          state: state ? state.trim() : existingSeller.state,
          pincode: pincode ? pincode.trim() : existingSeller.pincode,
          mobile_number: phone.trim(),
          phone_number: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSeller.id);
    } else {
      const newSellerPayload = {
        user_id: user.id,
        seller_id: `SEL-${Math.floor(100000 + Math.random() * 900000)}`,
        business_name: name || "Zebalpha Merchant Store",
        full_name: name || "Zebalpha Merchant",
        email: user.email?.toLowerCase().trim(),
        pickup_address: address_line1.trim(),
        pickup_location: address_line1.trim(),
        warehouse_address: address_line1.trim(),
        city: city ? city.trim() : "City",
        state: state ? state.trim() : "State",
        pincode: pincode ? pincode.trim() : "700001",
        mobile_number: phone.trim(),
        phone_number: phone.trim(),
        status: "approved",
        account_status: "Active",
        created_at: new Date().toISOString(),
      };

      const { data: insertedSeller } = await supabaseServer
        .from("sellers")
        .insert([newSellerPayload])
        .select()
        .maybeSingle();

      if (insertedSeller?.id) resolvedSellerId = insertedSeller.id;
    }

    const createdLocation = {
      id: `loc-${Date.now()}`,
      seller_id: resolvedSellerId,
      name: name || "Primary Warehouse",
      phone: phone.trim(),
      address_line1: address_line1.trim(),
      city: city ? city.trim() : "City",
      state: state ? state.trim() : "State",
      pincode: pincode ? pincode.trim() : "700001",
      is_default: is_default !== undefined ? is_default : true,
    };

    // 3. Insert into seller_pickup_locations table
    try {
      await supabaseServer
        .from("seller_pickup_locations")
        .insert([{
          seller_id: resolvedSellerId,
          name: name || "Primary Warehouse",
          location_name: name || "Primary Warehouse",
          phone: phone.trim(),
          address: address_line1.trim(),
          address_line1: address_line1.trim(),
          city: city ? city.trim() : "City",
          state: state ? state.trim() : "State",
          pincode: pincode ? pincode.trim() : "700001",
          is_default: true,
        }]);
    } catch (insertErr: any) {
      console.warn("seller_pickup_locations insert notice:", insertErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Warehouse pickup address saved successfully.",
      location: createdLocation,
    });
  } catch (err: any) {
    console.error("POST pickup-location API error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
