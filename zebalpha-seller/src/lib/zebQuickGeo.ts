export const ZEB_QUICK_DEFAULT_RADIUS_KM = 17;
export const ZEB_QUICK_RADIUS_SETTING_KEY = "zeb_quick_delivery_radius_km";

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface PincodeLookupResult {
  coord: GeoCoord | null;
  areaName: string;
  city: string;
}

// Runtime in-memory cache populated 100% dynamically (zero hardcoded pincodes)
const runtimeLookupCache = new Map<string, PincodeLookupResult>();

export function parseValidCoord(lat: unknown, lng: unknown): GeoCoord | null {
  if (lat === null || lat === undefined || lat === "" || lng === null || lng === undefined || lng === "") {
    return null;
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (
    !Number.isFinite(nLat) ||
    !Number.isFinite(nLng) ||
    (nLat === 0 && nLng === 0) ||
    nLat < -90 ||
    nLat > 90 ||
    nLng < -180 ||
    nLng > 180
  ) {
    return null;
  }
  return { lat: Number(nLat.toFixed(6)), lng: Number(nLng.toFixed(6)) };
}

export function haversineDistanceKm(a: GeoCoord, b: GeoCoord): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  return Math.round(km * 10) / 10;
}

export function extractRadiusKm(settingValue: unknown): number {
  if (typeof settingValue === "number" && Number.isFinite(settingValue) && settingValue >= 1 && settingValue <= 100) {
    return Math.round(settingValue);
  }
  if (settingValue && typeof settingValue === "object") {
    const raw = Number((settingValue as any).radius_km ?? (settingValue as any).value);
    if (Number.isFinite(raw) && raw >= 1 && raw <= 100) {
      return Math.round(raw);
    }
  }
  return ZEB_QUICK_DEFAULT_RADIUS_KM;
}

async function fetchIndiaPostMeta(
  cleanPin: string
): Promise<{ areaName: string; city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(cleanPin)}`, {
      signal: AbortSignal.timeout(3200),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const po = Array.isArray(json) && json[0]?.Status === "Success" ? json[0]?.PostOffice?.[0] : null;
    if (!po) return null;
    return {
      areaName: String(po.Name || po.Block || "").trim(),
      city: String(po.District || po.Division || "").trim(),
      state: String(po.State || "India").trim(),
    };
  } catch {
    return null;
  }
}

export async function geocodeIndianPincode(
  pincode: string,
  areaName?: string | null,
  city?: string | null
): Promise<GeoCoord | null> {
  const cleanPin = String(pincode || "").replace(/\D/g, "").slice(0, 6);
  if (cleanPin.length !== 6) return null;

  const cached = runtimeLookupCache.get(cleanPin);
  if (cached?.coord) return cached.coord;

  let resolvedArea = String(areaName || "").trim();
  let resolvedCity = String(city || "").trim();
  let resolvedState = "";

  const directUrls = [
    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&postalcode=${encodeURIComponent(cleanPin)}&limit=1`,
  ];
  if (resolvedArea || resolvedCity) {
    const q = [resolvedArea, resolvedCity, cleanPin, "India"].filter(Boolean).join(", ");
    directUrls.push(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(q)}&limit=1`
    );
  }

  for (const url of directUrls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ZebQuick-Hyperlocal/1.0 (support@zebalpha.shop)" },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) continue;
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const parsed = parseValidCoord(rows[0].lat, rows[0].lon);
        if (parsed) {
          runtimeLookupCache.set(cleanPin, { coord: parsed, areaName: resolvedArea, city: resolvedCity });
          return parsed;
        }
      }
    } catch {}
  }

  if (!resolvedArea || !resolvedCity) {
    const postMeta = await fetchIndiaPostMeta(cleanPin);
    if (postMeta) {
      resolvedArea = resolvedArea || postMeta.areaName;
      resolvedCity = resolvedCity || postMeta.city;
      resolvedState = postMeta.state;
    }
  }

  if (resolvedArea || resolvedCity) {
    const placeQuery = [resolvedArea, resolvedCity, resolvedState || "India"].filter(Boolean).join(", ");

    try {
      const phRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(placeQuery)}&limit=1`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (phRes.ok) {
        const phJson = await phRes.json();
        const coords = phJson?.features?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          const parsed = parseValidCoord(coords[1], coords[0]);
          if (parsed) {
            runtimeLookupCache.set(cleanPin, { coord: parsed, areaName: resolvedArea, city: resolvedCity });
            return parsed;
          }
        }
      }
    } catch {}

    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(placeQuery)}&limit=1`,
        {
          headers: { "User-Agent": "ZebQuick-Hyperlocal/1.0 (support@zebalpha.shop)" },
          signal: AbortSignal.timeout(3500),
        }
      );
      if (nomRes.ok) {
        const rows = await nomRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const parsed = parseValidCoord(rows[0].lat, rows[0].lon);
          if (parsed) {
            runtimeLookupCache.set(cleanPin, { coord: parsed, areaName: resolvedArea, city: resolvedCity });
            return parsed;
          }
        }
      }
    } catch {}
  }

  return null;
}

export function resolvePincodeCoordFromRow(
  pincode: string,
  row?: { lat?: unknown; lng?: unknown } | null
): GeoCoord | null {
  const fromRow = row ? parseValidCoord(row.lat, row.lng) : null;
  if (fromRow) return fromRow;
  const cleanPin = String(pincode || "").replace(/\D/g, "").slice(0, 6);
  return runtimeLookupCache.get(cleanPin)?.coord || null;
}
