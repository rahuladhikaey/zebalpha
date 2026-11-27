import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  extractRadiusKm,
  geocodeIndianPincode,
  haversineDistanceKm,
  lookupIndianPincodeMeta,
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
    const db = supabase.schema("zeb_quick");

    const [{ data: allPins }, { data: activeSellers }, { data: radiusSetting }] =
      await Promise.all([
        db
          .from("serviceable_pincodes")
          .select("pincode, area_name, city, corridor_name, lat, lng, is_active"),
        db
          .from("sellers")
          .select("id, seller_id, pickup_pincode, city, lat, lng, serviceable_pincodes")
          .eq("is_active", true)
          .eq("is_approved", true),
        supabase
          .from("store_settings")
          .select("value")
          .eq("key", ZEB_QUICK_RADIUS_SETTING_KEY)
          .maybeSingle(),
      ]);

    const maxRadiusKm = extractRadiusKm(radiusSetting?.value);
    const pinRows = (allPins || []) as any[];
    const activePins = pinRows.filter((p) => p.is_active !== false);
    const disabledPinSet = new Set(
      pinRows
        .filter((p) => p.is_active === false)
        .map((p) => String(p.pincode || "").replace(/\D/g, "").slice(0, 6))
    );
    const activePinMap = new Map<string, any>();
    activePins.forEach((p) => {
      activePinMap.set(String(p.pincode || "").replace(/\D/g, "").slice(0, 6), p);
    });

    // Resolve coordinates for active sellers (self-healing DB cache if any seller has NULL lat/lng)
    const resolvedSellers: Array<{ seller: any; coord: { lat: number; lng: number } }> = [];
    for (const s of (activeSellers || []) as any[]) {
      const sPin = String(s.pickup_pincode || "").replace(/\D/g, "").slice(0, 6);
      const pinMeta = activePinMap.get(sPin);
      let sCoord = parseValidCoord(s.lat, s.lng) || resolvePincodeCoordFromRow(sPin, pinMeta);
      if (!sCoord && sPin.length === 6) {
        sCoord = await geocodeIndianPincode(sPin, pinMeta?.area_name, pinMeta?.city || s.city);
        if (sCoord) {
          void db.from("sellers").update({ lat: sCoord.lat, lng: sCoord.lng }).eq("id", s.id);
          if (pinMeta && !parseValidCoord(pinMeta.lat, pinMeta.lng)) {
            void db.from("serviceable_pincodes").update({ lat: sCoord.lat, lng: sCoord.lng }).eq("pincode", sPin);
          }
        }
      }
      if (sCoord) {
        resolvedSellers.push({ seller: s, coord: sCoord });
      }
    }

    // Helper: find nearest active seller OR active hub pincode within maxRadiusKm
    const findNearestCoverage = (targetCoord: { lat: number; lng: number }) => {
      let nearestSellerDist: number | null = null;
      let nearestHub: { row: any; dist: number } | null = null;

      for (const { coord } of resolvedSellers) {
        const d = haversineDistanceKm(targetCoord, coord);
        if (nearestSellerDist === null || d < nearestSellerDist) {
          nearestSellerDist = d;
        }
      }

      for (const row of activePins) {
        const cleanPin = String(row.pincode || "").replace(/\D/g, "").slice(0, 6);
        const c = resolvePincodeCoordFromRow(cleanPin, row);
        if (!c) continue;
        const d = haversineDistanceKm(targetCoord, c);
        if (!nearestHub || d < nearestHub.dist) {
          nearestHub = { row, dist: d };
        }
      }

      const bestDist =
        nearestSellerDist !== null && nearestHub
          ? Math.min(nearestSellerDist, nearestHub.dist)
          : nearestSellerDist ?? nearestHub?.dist ?? null;

      return { bestDist, nearestSellerDist, nearestHub };
    };

    // GPS-only lookup when reverse geocoder returned coordinates without postcode
    if (pincode.length !== 6 && gpsCoord) {
      const { bestDist, nearestHub } = findNearestCoverage(gpsCoord);
      if (bestDist !== null && bestDist <= maxRadiusKm) {
        return NextResponse.json({
          serviceable: true,
          pincode: nearestHub?.row?.pincode || "",
          area_name: nearestHub?.row?.area_name || "Current Location",
          city: nearestHub?.row?.city || "",
          corridor_name: nearestHub?.row?.corridor_name || "ZebQuick Express Zone",
          distance_km: bestDist,
          radius_km: maxRadiusKm,
        });
      }

      return NextResponse.json({
        serviceable: false,
        pincode: nearestHub?.row?.pincode || "",
        area_name: nearestHub?.row?.area_name || "",
        city: nearestHub?.row?.city || "",
        corridor_name: "",
        radius_km: maxRadiusKm,
      });
    }

    if (pincode.length !== 6) {
      return NextResponse.json({ serviceable: false, error: "Invalid pincode" }, { status: 400 });
    }

    // 1. Respect explicit Admin OFF toggle
    if (disabledPinSet.has(pincode)) {
      return NextResponse.json({
        serviceable: false,
        pincode,
        area_name: "",
        city: "",
        corridor_name: "",
        radius_km: maxRadiusKm,
      });
    }

    // 2. Direct match in Admin active serviceable_pincodes
    const exactRow = activePinMap.get(pincode);
    if (exactRow) {
      return NextResponse.json({
        serviceable: true,
        pincode: exactRow.pincode,
        area_name: exactRow.area_name,
        city: exactRow.city,
        corridor_name: exactRow.corridor_name,
        radius_km: maxRadiusKm,
      });
    }

    // 3. Automatic 17 km Radius Coverage for ANY pincode/GPS near an active seller or hub
    const meta = await lookupIndianPincodeMeta(pincode);
    const targetCoord = gpsCoord || meta.coord;
    if (targetCoord) {
      const { bestDist, nearestHub } = findNearestCoverage(targetCoord);
      if (bestDist !== null && bestDist <= maxRadiusKm) {
        return NextResponse.json({
          serviceable: true,
          pincode,
          area_name: meta.areaName || nearestHub?.row?.area_name || `Pincode ${pincode}`,
          city: meta.city || nearestHub?.row?.city || "",
          corridor_name: nearestHub?.row?.corridor_name || "ZebQuick Express Zone",
          distance_km: bestDist,
          radius_km: maxRadiusKm,
          auto_covered_by_radius: true,
        });
      }
    }

    return NextResponse.json({
      serviceable: false,
      pincode,
      area_name: meta.areaName || "",
      city: meta.city || "",
      corridor_name: "",
      radius_km: maxRadiusKm,
    });
  } catch (err: any) {
    return NextResponse.json({ serviceable: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
