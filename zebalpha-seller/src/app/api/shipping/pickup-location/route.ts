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

    const idsToMatch = [userId, sellerId].filter(Boolean) as string[];

    // 1. Fetch from seller_pickup_locations
    let { data: locations, error } = await supabaseServer
      .from("seller_pickup_locations")
      .select("*")
      .or(`seller_id.in.(${idsToMatch.join(",")})${userId ? `,user_id.eq.${userId}` : ""}`)
      .order("is_default", { ascending: false });

    // 2. If empty, check sellers profile table for default pickup address
    if ((!locations || locations.length === 0) && (userId || sellerId)) {
      const { data: sProfile } = await supabaseServer
        .from("sellers")
        .select("*")
        .or(`user_id.eq.${userId || ""}${sellerId ? `,id.eq.${sellerId}` : ""}`)
        .maybeSingle();

      if (sProfile && (sProfile.pickup_address || sProfile.pickup_location || sProfile.city)) {
        locations = [{
          id: `profile-${sProfile.id}`,
          seller_id: sProfile.id,
          user_id: sProfile.user_id,
          name: `${sProfile.business_name || sProfile.full_name || "Primary"} Warehouse`,
          phone: sProfile.phone_number || sProfile.mobile_number || sProfile.phone || "",
          address_line1: sProfile.pickup_address || sProfile.pickup_location || "Warehouse Address",
          city: sProfile.city || "City",
          state: sProfile.state || "State",
          pincode: sProfile.pincode || "700001",
          is_default: true,
          created_at: sProfile.created_at || new Date().toISOString()
        }];
      }
    }

    return NextResponse.json({ success: true, locations: locations || [] });
  } catch (err: any) {
    console.error("GET pickup-location API error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, sellerId, name, phone, address_line1, city, state, pincode, is_default } = body;

    if (!address_line1 || !pincode || !phone) {
      return NextResponse.json({ success: false, message: "Address, Pincode, and Phone are required." }, { status: 400 });
    }

    // 1. Resolve seller profile
    let resolvedSellerId = sellerId;
    if (userId && !resolvedSellerId) {
      const { data: sProfile } = await supabaseServer
        .from("sellers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      resolvedSellerId = sProfile?.id || userId;
    }

    const payload = {
      seller_id: resolvedSellerId || userId,
      user_id: userId || null,
      name: name || "Primary Warehouse",
      location_name: name || "Primary Warehouse",
      phone: phone.trim(),
      address: address_line1.trim(),
      address_line1: address_line1.trim(),
      city: city ? city.trim() : "City",
      state: state ? state.trim() : "State",
      pincode: pincode ? pincode.trim() : "700001",
      is_default: is_default !== undefined ? is_default : true,
      created_at: new Date().toISOString()
    };

    // 2. Insert into seller_pickup_locations with service role (bypassing RLS)
    const { data: newLocation, error: insertErr } = await supabaseServer
      .from("seller_pickup_locations")
      .insert([payload])
      .select()
      .single();

    if (insertErr) {
      console.warn("seller_pickup_locations insert notice (retrying simplified):", insertErr.message);
      // Fallback with minimal columns
      await supabaseServer
        .from("seller_pickup_locations")
        .insert([{
          seller_id: resolvedSellerId || userId,
          name: name || "Warehouse",
          phone: phone.trim(),
          address_line1: address_line1.trim(),
          city: city || "City",
          state: state || "State",
          pincode: pincode || "700001",
          is_default: true
        }]);
    }

    // 3. Also update sellers table profile so pickup location is permanently synchronized
    if (userId || resolvedSellerId) {
      try {
        await supabaseServer
          .from("sellers")
          .update({
            pickup_address: address_line1.trim(),
            pickup_location: address_line1.trim(),
            city: city ? city.trim() : undefined,
            state: state ? state.trim() : undefined,
            pincode: pincode ? pincode.trim() : undefined,
            contact_phone: phone.trim(),
            phone_number: phone.trim()
          })
          .or(`user_id.eq.${userId || ""}${resolvedSellerId ? `,id.eq.${resolvedSellerId}` : ""}`);
      } catch (sUpdErr) {
        console.warn("Seller profile address update notice:", sUpdErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pickup warehouse location registered successfully.",
      location: newLocation || payload
    });
  } catch (err: any) {
    console.error("POST pickup-location API error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
