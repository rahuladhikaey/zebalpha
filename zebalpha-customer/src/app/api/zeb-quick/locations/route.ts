import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { ZEB_QUICK_INITIAL_PINCODES } from "@shared/constants/zebQuick";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const cityFilter = (searchParams.get("city") || "").trim();

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .schema("zeb_quick")
      .from("serviceable_pincodes")
      .select("pincode, area_name, city, corridor_name, is_active")
      .eq("is_active", true)
      .order("city", { ascending: true })
      .order("area_name", { ascending: true });

    const areas =
      !error && Array.isArray(data) && data.length > 0
        ? data
        : ZEB_QUICK_INITIAL_PINCODES.map((p) => ({
            pincode: p.pincode,
            area_name: p.areaName,
            city: p.city,
            corridor_name: p.corridorName,
            is_active: true,
          }));

    // Build distinct active cities from Admin serviceable_pincodes
    const cityCountMap = new Map<string, number>();
    for (const a of areas) {
      const c = String(a.city || "").trim();
      if (!c) continue;
      cityCountMap.set(c, (cityCountMap.get(c) || 0) + 1);
    }

    const cities = Array.from(cityCountMap.entries())
      .map(([name, areaCount]) => ({ name, areaCount }))
      .sort((a, b) => b.areaCount - a.areaCount || a.name.localeCompare(b.name));

    const activePinSet = new Set(areas.map((a) => String(a.pincode)));

    // Optional live street/area search (Admin areas + Nominatim street suggestions)
    let streetSuggestions: Array<{
      title: string;
      subtitle: string;
      area_name: string;
      city: string;
      pincode: string;
      serviceable: boolean;
      source: "admin" | "osm";
    }> = [];

    const filteredAdminAreas = areas
      .filter((a) => {
        if (cityFilter && a.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
        if (!q) return true;
        const ql = q.toLowerCase();
        return (
          a.area_name.toLowerCase().includes(ql) ||
          a.city.toLowerCase().includes(ql) ||
          String(a.pincode).includes(ql)
        );
      })
      .map((a) => ({
        title: a.area_name,
        subtitle: `${a.city}, West Bengal • Pincode ${a.pincode}`,
        area_name: a.area_name,
        city: a.city,
        pincode: String(a.pincode),
        serviceable: true,
        source: "admin" as const,
      }));

    streetSuggestions = [...filteredAdminAreas];

    if (q.length >= 3) {
      try {
        const searchStr = cityFilter ? `${q}, ${cityFilter}, India` : `${q}, West Bengal, India`;
        const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(searchStr)}`;
        const osmRes = await fetch(osmUrl, {
          headers: { "User-Agent": "ZebQuick-Express/1.0" },
          signal: AbortSignal.timeout(3500),
        });
        if (osmRes.ok) {
          const osmRows = await osmRes.json();
          if (Array.isArray(osmRows)) {
            for (const row of osmRows) {
              const addr = row.address || {};
              const pin = String(addr.postcode || "").replace(/\D/g, "").slice(0, 6);
              const title =
                row.name ||
                addr.road ||
                addr.suburb ||
                addr.neighbourhood ||
                String(row.display_name || "").split(",")[0];
              const resolvedCity =
                addr.city || addr.town || addr.village || addr.state_district || cityFilter || "";
              const subtitle = String(row.display_name || "")
                .split(",")
                .slice(0, 4)
                .join(", ");

              if (!title) continue;
              // Match pincode or fallback to city's first serviceable pincode if OSM omitted postcode
              const fallbackCityPin =
                !pin && resolvedCity
                  ? areas.find((a) => a.city.toLowerCase() === resolvedCity.toLowerCase())?.pincode || ""
                  : "";
              const finalPin = pin || fallbackCityPin;

              streetSuggestions.push({
                title,
                subtitle,
                area_name: title,
                city: resolvedCity,
                pincode: finalPin,
                serviceable: finalPin ? activePinSet.has(finalPin) : false,
                source: "osm",
              });
            }
          }
        }
      } catch {
        // Ignore OSM timeout and return Admin areas cleanly
      }
    }

    return NextResponse.json({
      cities,
      areas,
      streetSuggestions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load locations" }, { status: 500 });
  }
}
