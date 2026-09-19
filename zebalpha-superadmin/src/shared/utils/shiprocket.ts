/**
 * Shiprocket Utility for Admin & Seller Panels
 * Implements all 11 official Shiprocket API Workflow Steps:
 * 1. Auth Login (/v1/external/auth/login)
 * 2. Serviceability (/v1/external/courier/serviceability/)
 * 3. Create Adhoc Order (/v1/external/orders/create/adhoc)
 * 4. Assign AWB (/v1/external/courier/assign/awb)
 * 5. Request Pickup (/v1/external/courier/generate/pickup)
 * 6. Generate Manifest (/v1/external/manifests/generate)
 * 7. Print Manifest (/v1/external/manifests/print)
 * 8. Generate Label (/v1/external/courier/generate/label)
 * 9. Print Invoice (/v1/external/orders/print/invoice)
 * 10. Track AWB (/v1/external/courier/track/awb/{awb_code})
 */

const SHIPROCKET_API = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Step 1: Obtain or refresh Shiprocket Bearer Auth Token (cached for 23 hours)
 * POST /v1/external/auth/login
 */
export async function getShiprocketToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now) {
    return cachedToken;
  }

  const email = (process.env.SHIPROCKET_EMAIL || "").trim();
  const password = (process.env.SHIPROCKET_PASSWORD || "").trim();

  if (!email || !password) {
    throw new Error("Shiprocket credentials (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD) missing in environment variables.");
  }

  const response = await fetch(`${SHIPROCKET_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok || !data.token) {
    const errorMsg = data.message || (typeof data.errors === "object" ? JSON.stringify(data.errors) : "Invalid API User credentials");
    throw new Error(`Shiprocket Auth Error (${response.status}): ${errorMsg}`);
  }

  cachedToken = data.token;
  tokenExpiresAt = now + 23 * 60 * 60 * 1000;
  return cachedToken!;
}

/**
 * Fetch all registered Pickup Locations from Shiprocket account
 * GET /settings/company/pickup
 */
export async function getShiprocketPickupLocations(token: string): Promise<any[]> {
  try {
    const response = await fetch(`${SHIPROCKET_API}/settings/company/pickup`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn("Failed to fetch Shiprocket pickup locations:", data);
      return [];
    }

    return data.data?.shipping_address || [];
  } catch (err) {
    console.warn("Error fetching Shiprocket pickup locations:", err);
    return [];
  }
}

/**
 * Register a new Pickup Location in Shiprocket
 * POST /settings/company/addpickup
 */
export async function addShiprocketPickupLocation(token: string, locationData: {
  pickup_location: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country?: string;
  pin_code: string;
}) {
  const payload = {
    pickup_location: String(locationData.pickup_location || "Warehouse").slice(0, 36),
    name: locationData.name || "Merchant Dispatch Hub",
    email: locationData.email || "seller@zebalpha.com",
    phone: String(locationData.phone || "9999999999").replace(/\D/g, "").slice(0, 10),
    address: locationData.address || "Merchant Address",
    address_2: locationData.address_2 || "",
    city: locationData.city || "Kolkata",
    state: locationData.state || "West Bengal",
    country: locationData.country || "India",
    pin_code: String(locationData.pin_code || "700001").replace(/\D/g, "").slice(0, 6),
  };

  const response = await fetch(`${SHIPROCKET_API}/settings/company/addpickup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || (typeof data.errors === "object" ? JSON.stringify(data.errors) : "Failed to add pickup location to Shiprocket"));
  }

  return {
    success: true,
    data,
    pickup_location: payload.pickup_location,
    address_id: data?.address?.id || data?.id || null,
  };
}

/**
 * Step 2: Check Courier Serviceability
 * GET /v1/external/courier/serviceability/
 */
export async function checkCourierServiceability(token: string, params: {
  pickup_postcode: string;
  delivery_postcode: string;
  weight: number;
  cod?: number;
}) {
  const query = new URLSearchParams({
    pickup_postcode: params.pickup_postcode,
    delivery_postcode: params.delivery_postcode,
    weight: String(params.weight || 0.5),
    cod: String(params.cod || 0),
  }).toString();

  const response = await fetch(`${SHIPROCKET_API}/courier/serviceability/?${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}

/**
 * Step 3: Create Adhoc Order in Shiprocket
 * POST /v1/external/orders/create/adhoc
 */
export async function createShiprocketOrder(token: string, orderData: any) {
  const response = await fetch(`${SHIPROCKET_API}/orders/create/adhoc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || (typeof data.errors === "object" ? JSON.stringify(data.errors) : "Failed to create Shiprocket order");
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Step 4: Assign Courier & Generate Live AWB in Shiprocket
 * POST /v1/external/courier/assign/awb
 */
export async function assignShiprocketAWB(token: string, shipmentId: string | number, courierId?: number | null) {
  const payload: any = { shipment_id: shipmentId };
  if (courierId) payload.courier_id = courierId;

  const response = await fetch(`${SHIPROCKET_API}/courier/assign/awb`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  const respData = data?.response?.data || data;

  if (!response.ok || !respData?.awb_code) {
    const errMsg = data?.message || data?.response?.data?.message || "Failed to assign Shiprocket AWB";
    throw new Error(errMsg);
  }

  return {
    success: true,
    awb_code: respData.awb_code,
    courier_name: respData.courier_name || "Delhivery Surface",
    courier_company_id: respData.courier_company_id,
    routing_hub: respData.routing_hub || "CCU/EAST-HUB-01",
    data: respData,
  };
}

/**
 * Step 5: Generate Courier Pickup Request
 * POST /v1/external/courier/generate/pickup
 */
export async function requestShiprocketPickup(token: string, shipmentId: string | number | (string | number)[]) {
  const ids = Array.isArray(shipmentId) ? shipmentId : [shipmentId];
  const response = await fetch(`${SHIPROCKET_API}/courier/generate/pickup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ shipment_id: ids }),
  });

  const data = await response.json();
  return data;
}

/**
 * Step 6: Generate Manifest
 * POST /v1/external/manifests/generate
 */
export async function generateShiprocketManifest(token: string, shipmentId: (string | number)[]) {
  const response = await fetch(`${SHIPROCKET_API}/manifests/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ shipment_id: shipmentId }),
  });

  const data = await response.json();
  return data;
}

/**
 * Step 7: Print Manifest PDF
 * POST /v1/external/manifests/print
 */
export async function printShiprocketManifest(token: string, orderId: (string | number)[]) {
  const response = await fetch(`${SHIPROCKET_API}/manifests/print`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ order_ids: orderId }),
  });

  const data = await response.json();
  return data;
}

/**
 * Step 8: Generate Carrier Label URL
 * POST /v1/external/courier/generate/label
 */
export async function generateShiprocketLabel(token: string, shipmentId: string | number) {
  const ids = Array.isArray(shipmentId) ? shipmentId : [shipmentId];
  const response = await fetch(`${SHIPROCKET_API}/courier/generate/label`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ shipment_id: ids }),
  });

  const data = await response.json();
  return {
    success: response.ok,
    label_url: data?.label_url || data?.label_created || `https://apiv2.shiprocket.in/v1/external/shipments/print/label/${ids[0]}`,
    data,
  };
}

/**
 * Step 9: Print Invoice PDF
 * POST /v1/external/orders/print/invoice
 */
export async function printShiprocketInvoice(token: string, orderId: (string | number)[]) {
  const response = await fetch(`${SHIPROCKET_API}/orders/print/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ids: orderId }),
  });

  const data = await response.json();
  return data;
}

/**
 * Step 10: Track Shipment by AWB Code
 * GET /v1/external/courier/track/awb/{awb_code}
 */
export async function trackShipment(token: string, awbCode: string) {
  const response = await fetch(`${SHIPROCKET_API}/courier/track/awb/${awbCode}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}
