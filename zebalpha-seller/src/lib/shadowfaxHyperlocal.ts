import "server-only";

export type ShadowfaxEnv = "staging" | "production";

function getShadowfaxConfig() {
  const env: ShadowfaxEnv =
    process.env.SHADOWFAX_HL_ENV === "production" ? "production" : "staging";

  const baseUrl =
    env === "production"
      ? "https://api.shadowfax.in"
      : "https://hlbackend.staging.shadowfax.in";

  const token =
    env === "production"
      ? (process.env.SHADOWFAX_HL_PROD_TOKEN || process.env.SHADOWFAX_API_TOKEN || "").trim()
      : (process.env.SHADOWFAX_HL_STAGING_TOKEN || process.env.SHADOWFAX_API_TOKEN || "").trim();

  const clientCode = (process.env.SHADOWFAX_CLIENT_CODE || "zebalpha").trim();

  return { env, baseUrl, token, clientCode };
}

export async function checkShadowfaxServiceability(params: {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  paid: boolean;
  orderValue: number;
  coid?: string;
}) {
  const { baseUrl, token } = getShadowfaxConfig();
  if (!token) {
    return { ok: false, serviceable: false, error: "Shadowfax Hyperlocal token not configured" };
  }

  const res = await fetch(`${baseUrl}/api/v1/order-serviceability/`, {
    method: "PUT",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pickup_latitude: String(params.pickupLat),
      pickup_longitude: String(params.pickupLng),
      drop_latitude: String(params.dropLat),
      drop_longitude: String(params.dropLng),
      paid: params.paid ? "true" : "false",
      order_value: Number(params.orderValue || 0),
      ...(params.coid ? { COID: params.coid } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...data };
}

export async function createShadowfaxHyperlocalOrder(params: {
  orderNumber: string;
  orderValue: number;
  paid: boolean;
  pickup: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    pincode: string;
    lat?: number;
    lng?: number;
  };
  drop: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    pincode: string;
    lat?: number;
    lng?: number;
  };
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  const { baseUrl, token, clientCode, env } = getShadowfaxConfig();
  if (!token) {
    return { ok: false, error: "Shadowfax Hyperlocal token not configured" };
  }

  // Fallback coordinates along Sealdah-Krishnanagar if exact lat/lng not stored on hub yet
  const pickupLat = params.pickup.lat ?? 23.0764;
  const pickupLng = params.pickup.lng ?? 88.5219;
  const dropLat = params.drop.lat ?? 23.0764;
  const dropLng = params.drop.lng ?? 88.5219;

  const payload = {
    client_code: clientCode,
    order_details: {
      client_order_id: params.orderNumber,
      order_value: Number(params.orderValue || 0),
      paid: params.paid ? "true" : "false",
      cash_on_delivery: params.paid ? 0 : Number(params.orderValue || 0),
    },
    pickup_details: {
      name: params.pickup.name,
      contact_number: params.pickup.phone,
      address: `${params.pickup.address}, ${params.pickup.city || "West Bengal"} - ${params.pickup.pincode}`,
      latitude: pickupLat,
      longitude: pickupLng,
      pincode: params.pickup.pincode,
    },
    drop_details: {
      name: params.drop.name,
      contact_number: params.drop.phone,
      address: `${params.drop.address} - ${params.drop.pincode}`,
      latitude: dropLat,
      longitude: dropLng,
      pincode: params.drop.pincode,
    },
    order_items: params.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      price: it.price,
    })),
  };

  const res = await fetch(`${baseUrl}/api/v2/orders/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, env, data };
}
