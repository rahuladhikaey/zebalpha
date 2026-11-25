import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { GO_ALPHA_INITIAL_PINCODES } from "@shared/constants/goAlpha";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = String(searchParams.get("pincode") || "")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (pincode.length !== 6) {
      return NextResponse.json({ serviceable: false, error: "Invalid pincode" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .schema("go_alpha")
      .from("serviceable_pincodes")
      .select("pincode, area_name, city, corridor_name, is_active")
      .eq("pincode", pincode)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json({
        serviceable: true,
        pincode: data.pincode,
        area_name: data.area_name,
        city: data.city,
        corridor_name: data.corridor_name,
      });
    }

    // Fallback to canonical initial Sealdah-Krishnanagar list if schema is not yet seeded
    if (error) {
      const seed = GO_ALPHA_INITIAL_PINCODES.find((p) => p.pincode === pincode);
      if (seed) {
        return NextResponse.json({
          serviceable: true,
          pincode: seed.pincode,
          area_name: seed.areaName,
          city: seed.city,
          corridor_name: seed.corridorName,
        });
      }
    }

    return NextResponse.json({
      serviceable: false,
      pincode,
      area_name: "",
      city: "",
      corridor_name: "",
    });
  } catch (err: any) {
    return NextResponse.json({ serviceable: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
