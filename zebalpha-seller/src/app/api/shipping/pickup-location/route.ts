import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const sellerId = searchParams.get("sellerId");

    if (!userId && !sellerId) {
      return NextResponse.json({ success: false, message: "Missing userId or sellerId" }, { status: 400 });
    }

    const idsToMatch = [sellerId, userId].filter(Boolean) as string[];
    let locations: any[] = [];

    // 1. Try fetching from seller_pickup_locations by seller_id
    try {
      const { data: locData, error: locErr } = await supabaseServer
        .from("seller_pickup_locations")
        .select("*")
        .in("seller_id", idsToMatch)
        .order("is_default", { ascending: false });

      if (locData && locData.length > 0) {
        locations = locData.map(loc => ({
          id: loc.id,
          seller_id: loc.seller_id,
          name: loc.name || loc.location_name || "Primary Warehouse",
          phone: loc.phone || loc.contact_phone || "",
          address_line1: loc.address_line1 || loc.address || loc.pickup_address || "Warehouse Address",
          city: loc.city || "City",
          state: loc.state || "State",
          pincode: loc.pincode || "700001",
          is_default: Boolean(loc.is_default)
        }));
      }
    } catch (e) {
      console.warn("seller_pickup_locations table query notice:", e);
    }

    // 2. If empty, check sellers profile table
    if (locations.length === 0) {
      let sProfile: any = null;

      if (userId) {
        const { data: byUser } = await supabaseServer
          .from("sellers")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        sProfile = byUser;
      }

      if (!sProfile && sellerId) {
        const { data: byId } = await supabaseServer
          .from("sellers")
          .select("*")
          .eq("id", sellerId)
          .maybeSingle();
        sProfile = byId;
      }

      if (sProfile) {
        const address = sProfile.pickup_address || sProfile.pickup_location || sProfile.warehouse_address;
        if (address || sProfile.city || sProfile.pincode) {
          locations = [{
            id: `profile-${sProfile.id || userId}`,
            seller_id: sProfile.id || userId,
            name: `${sProfile.business_name || sProfile.store_name || sProfile.full_name || "Primary"} Warehouse`,
            phone: sProfile.mobile_number || sProfile.phone_number || sProfile.phone || "",
            address_line1: address || "Warehouse Address",
            city: sProfile.city || "City",
            state: sProfile.state || "State",
            pincode: sProfile.pincode || "700001",
            is_default: true
          }];
        }
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
    const body = await req.json();
    const { userId, sellerId, name, phone, address_line1, city, state, pincode, is_default } = body;

    if (!address_line1 || !pincode || !phone) {
      return NextResponse.json({ success: false, message: "Address, Pincode, and Phone are required." }, { status: 400 });
    }

    // 1. Resolve or Create seller profile in sellers table
    let resolvedSellerId = sellerId;
    let existingSeller: any = null;

    if (userId) {
      const { data: sData } = await supabaseServer
        .from("sellers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      existingSeller = sData;
      if (existingSeller?.id) resolvedSellerId = existingSeller.id;
    }

    // 2. Synchronize sellers profile table with address details
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
          updated_at: new Date().toISOString()
        })
        .eq("id", existingSeller.id);
    } else if (userId) {
      // Create seller profile row if not existing
      const newSellerPayload = {
        user_id: userId,
        seller_id: `SEL-${Math.floor(100000 + Math.random() * 900000)}`,
        business_name: name || "Zebalpha Merchant Store",
        full_name: name || "Zebalpha Merchant",
        pickup_address: address_line1.trim(),
        pickup_location: address_line1.trim(),
        warehouse_address: address_line1.trim(),
        city: city ? city.trim() : "City",
        state: state ? state.trim() : "State",
        pincode: pincode ? pincode.trim() : "700001",
        mobile_number: phone.trim(),
        phone_number: phone.trim(),
        status: "Active",
        account_status: "Active",
        created_at: new Date().toISOString()
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
      seller_id: resolvedSellerId || userId,
      name: name || "Primary Warehouse",
      phone: phone.trim(),
      address_line1: address_line1.trim(),
      city: city ? city.trim() : "City",
      state: state ? state.trim() : "State",
      pincode: pincode ? pincode.trim() : "700001",
      is_default: is_default !== undefined ? is_default : true
    };

    // 3. Try inserting into seller_pickup_locations table
    if (resolvedSellerId) {
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
            is_default: true
          }]);
      } catch (insertErr: any) {
        console.warn("seller_pickup_locations full insert notice (retrying minimal):", insertErr.message);
        try {
          await supabaseServer
            .from("seller_pickup_locations")
            .insert([{
              seller_id: resolvedSellerId,
              name: name || "Primary Warehouse",
              phone: phone.trim(),
              address: address_line1.trim(),
              city: city || "City",
              state: state || "State",
              pincode: pincode || "700001",
              is_default: true
            }]);
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: "Warehouse pickup address saved successfully.",
      location: createdLocation
    });
  } catch (err: any) {
    console.error("POST pickup-location API error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
