import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { ZEB_QUICK_INITIAL_PINCODES } from "@shared/constants/zebQuick";
import {
  extractRadiusKm,
  haversineDistanceKm,
  parseValidCoord,
  resolvePincodeCoordFromRow,
  ZEB_QUICK_RADIUS_SETTING_KEY,
} from "@/lib/zebQuickGeo";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = String(searchParams.get("pincode") || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    const gpsCoord = parseValidCoord(searchParams.get("lat"), searchParams.get("lng"));

    const supabase = getSupabaseServer();

    // Optional GPS fallback when reverse geocoder returns coordinates without postcode
    if (pincode.length !== 6 && gpsCoord) {
      const [{ data: activePins }, { data: radiusSetting }] = await Promise.all([
        supabase
          .schema("zeb_quick")
          .from("serviceable_pincodes")
          .select("pincode, area_name, city, corridor_name, lat, lng, is_active")
          .eq("is_active", true),
        supabase
          .from("store_settings")
          .select("value")
          .eq("key", ZEB_QUICK_RADIUS_SETTING_KEY)
          .maybeSingle(),
      ]);

      const maxRadiusKm = extractRadiusKm(radiusSetting?.value);
      let nearest: { row: any; dist: number } | null = null;

      for (const row of (activePins || []) as any[]) {
        const cleanPin = String(row.pincode || "").replace(/\D/g, "").slice(0, 6);
        const c = resolvePincodeCoordFromRow(cleanPin, row);
        if (!c) continue;
        const dist = haversineDistanceKm(gpsCoord, c);
        if (!nearest || dist < nearest.dist) {
          nearest = { row, dist };
        }
      }

      if (nearest && nearest.dist <= maxRadiusKm) {
        return NextResponse.json({
          serviceable: true,
          pincode: nearest.row.pincode,
          area_name: nearest.row.area_name,
          city: nearest.row.city,
          corridor_name: nearest.row.corridor_name,
          distance_km: nearest.dist,
        });
      }

      return NextResponse.json({
        serviceable: false,
        pincode: nearest?.row?.pincode || "",
        area_name: nearest?.row?.area_name || "",
        city: nearest?.row?.city || "",
        corridor_name: "",
      });
    }

    if (pincode.length !== 6) {
      return NextResponse.json({ serviceable: false, error: "Invalid pincode" }, { status: 400 });
    }

    const { data, error } = await supabase
      .schema("zeb_quick")
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

    // Fallback to canonical initial corridor list only if schema query failed
    if (error) {
      const seed = ZEB_QUICK_INITIAL_PINCODES.find((p) => p.pincode === pincode);
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
