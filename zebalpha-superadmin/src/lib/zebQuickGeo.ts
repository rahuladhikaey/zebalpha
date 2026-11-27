export const ZEB_QUICK_DEFAULT_RADIUS_KM = 25;
export const ZEB_QUICK_RADIUS_SETTING_KEY = "zeb_quick_delivery_radius_km";

export interface GeoCoord {
  lat: number;
  lng: number;
}

/**
 * Accurate GPS coordinates for Sealdah -> Krishnanagar corridor & adjacent West Bengal pincodes.
 * Used as instant zero-latency fallback when DB lat/lng has not been backfilled yet.
 */
export const ZEB_QUICK_PINCODE_COORDS: Record<string, GeoCoord> = {
  "700014": { lat: 22.5646, lng: 88.3698 }, // Sealdah / Entally
  "700009": { lat: 22.5769, lng: 88.3679 }, // Sealdah / Amherst Street
  "700004": { lat: 22.6013, lng: 88.3737 }, // Shyambazar / Bidhan Sarani
  "700028": { lat: 22.6224, lng: 88.4193 }, // Dum Dum
  "700030": { lat: 22.6258, lng: 88.3935 }, // Dum Dum / Sinthi
  "700050": { lat: 22.6335, lng: 88.3782 }, // Sinthee / Baranagar
  "700074": { lat: 22.6421, lng: 88.4172 }, // Dum Dum Cantonment
  "700056": { lat: 22.6625, lng: 88.3821 }, // Belghoria / Agarpara
  "700110": { lat: 22.6986, lng: 88.3895 }, // Sodepur
  "700114": { lat: 22.6939, lng: 88.3752 }, // Sodepur / Panihati
  "700115": { lat: 22.7242, lng: 88.3772 }, // Khardah
  "700116": { lat: 22.7248, lng: 88.3790 }, // Khardah / Rahara
  "700117": { lat: 22.7215, lng: 88.3738 }, // Khardah / B.T. Road
  "700118": { lat: 22.7383, lng: 88.3737 }, // Titagarh / Barrackpore
  "700119": { lat: 22.7412, lng: 88.3731 }, // Titagarh
  "700120": { lat: 22.7674, lng: 88.3688 }, // Barrackpore
  "700121": { lat: 22.7662, lng: 88.3596 }, // Barrackpore / Manirampur
  "700122": { lat: 22.7852, lng: 88.3681 }, // Barrackpore / Palta
  "700123": { lat: 22.8058, lng: 88.3702 }, // Ichapur
  "700124": { lat: 22.7228, lng: 88.4806 }, // Barasat
  "700125": { lat: 22.7072, lng: 88.4631 }, // Barasat / Hridaypur
  "743122": { lat: 22.8204, lng: 88.3712 }, // Palta / Garulia
  "743127": { lat: 22.8331, lng: 88.3806 }, // Shyamnagar West
  "743144": { lat: 22.8364, lng: 88.3849 }, // Shyamnagar
  "743132": { lat: 22.8602, lng: 88.3958 }, // Jagaddal / Kankinara
  "743134": { lat: 22.9438, lng: 88.4201 }, // Halisahar East
  "743145": { lat: 22.9442, lng: 88.4335 }, // Kanchrapara
  "743165": { lat: 22.8938, lng: 88.4220 }, // Naihati
  "743166": { lat: 22.9369, lng: 88.4223 }, // Halisahar
  "741235": { lat: 22.9751, lng: 88.4345 }, // Kalyani
  "741245": { lat: 22.9682, lng: 88.4774 }, // Kalyani / Gayeshpur
  "741222": { lat: 23.0772, lng: 88.5197 }, // Chakdaha
  "741201": { lat: 23.1763, lng: 88.5679 }, // Ranaghat
  "741202": { lat: 23.1972, lng: 88.5562 }, // Ranaghat / Habibpur
  "741254": { lat: 23.2414, lng: 88.5608 }, // Birnagar / Taherpur
  "741127": { lat: 23.2254, lng: 88.5735 }, // Taherpur
  "741404": { lat: 23.2528, lng: 88.4357 }, // Shantipur / Phulia
  "741101": { lat: 23.4013, lng: 88.5021 }, // Krishnanagar
  "741102": { lat: 23.4126, lng: 88.5042 }, // Krishnanagar / Ghurni
  "741103": { lat: 23.4092, lng: 88.4847 }, // Krishnanagar / Shaktinagar
};

export function parseValidCoord(lat: unknown, lng: unknown): GeoCoord | null {
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

/**
 * Great-circle Haversine distance in kilometers (rounded to 1 decimal place).
 */
export function haversineDistanceKm(a: GeoCoord, b: GeoCoord): number {
  const R = 6371; // Earth mean radius in km
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

/**
 * Resolve GPS coordinates for an Indian 6-digit pincode.
 * Order: built-in corridor seed -> OpenStreetMap Nominatim postalcode -> area/city query.
 */
export async function geocodeIndianPincode(
  pincode: string,
  areaName?: string | null,
  city?: string | null
): Promise<GeoCoord | null> {
  const cleanPin = String(pincode || "").replace(/\D/g, "").slice(0, 6);
  if (cleanPin.length !== 6) return null;

  if (ZEB_QUICK_PINCODE_COORDS[cleanPin]) {
    return ZEB_QUICK_PINCODE_COORDS[cleanPin];
  }

  const queries = [
    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&postalcode=${encodeURIComponent(cleanPin)}&limit=1`,
  ];
  if (areaName || city) {
    const q = [areaName, city, cleanPin, "India"].filter(Boolean).join(", ");
    queries.push(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(q)}&limit=1`
    );
  }

  for (const url of queries) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ZebQuick-Hyperlocal/1.0 (support@zebalpha.shop)" },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) continue;
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const parsed = parseValidCoord(rows[0].lat, rows[0].lon);
        if (parsed) return parsed;
      }
    } catch {
      // Ignore network/timeout errors and try next fallback
    }
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
  return ZEB_QUICK_PINCODE_COORDS[cleanPin] || null;
}
