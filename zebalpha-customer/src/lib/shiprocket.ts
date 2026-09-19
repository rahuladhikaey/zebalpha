/**
 * Shiprocket Utility & Service Integration for E-Commerce App
 * Handles authentication, token caching, serviceability checks, order creation, and webhooks.
 */

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export interface ServiceabilityParams {
  pickup_postcode: string | number;
  delivery_postcode: string | number;
  weight?: number;
  cod?: boolean | number | string;
  length?: number;
  width?: number;
  height?: number;
}

export interface CourierOption {
  courier_company_id: number;
  courier_name: string;
  freight_charge: number;
  cod_charges: number;
  total_charge: number;
  estimated_delivery_days: string | number;
  etd?: string | null;
  rating?: number;
  is_recommended?: boolean;
  cod_available?: boolean;
}

export interface ServiceabilityResult {
  success: boolean;
  serviceable: boolean;
  pickup_postcode?: string | number;
  delivery_postcode?: string | number;
  weight?: number;
  cod?: boolean;
  count?: number;
  recommended_courier_id?: number | null;
  couriers?: CourierOption[];
  message?: string;
  error?: string;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: number;
  hsn?: string;
}

export interface PushOrderParams {
  order_id: string;
  order_date?: string;
  pickup_location?: string;
  comment?: string;
  billing_address: {
    first_name?: string;
    last_name?: string;
    name?: string;
    address_line1?: string;
    address?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pincode?: string | number;
    postcode?: string | number;
    country?: string;
    email?: string;
    phone?: string;
  };
  shipping_address?: any;
  shipping_is_billing?: boolean | number;
  line_items: ShiprocketOrderItem[] | any[];
  payment_method?: 'Prepaid' | 'COD' | string;
  shipping_charges?: number;
  sub_total?: number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
}

/**
 * 1. Authentication & Token Management
 * Obtains and caches Shiprocket Bearer Auth Token (refreshed before 24-hr expiration)
 */
export async function getShiprocketToken(forceRefresh = false): Promise<string> {
  const now = Date.now();

  if (!forceRefresh && cachedToken && tokenExpiresAt - now > 5 * 60 * 1000) {
    return cachedToken;
  }

  const email = (process.env.SHIPROCKET_EMAIL || "").trim();
  const password = (process.env.SHIPROCKET_PASSWORD || "").trim();

  if (!email || !password) {
    const errorMsg = "SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD missing in environment variables.";
    console.error(`[Shiprocket Auth Error]: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    console.log("[Shiprocket Auth] Requesting new token from Shiprocket API...");
    const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.token) {
      throw new Error(data.message || "Failed to authenticate with Shiprocket");
    }

    cachedToken = String(data.token);
    tokenExpiresAt = now + 23 * 60 * 60 * 1000; // 23 hours
    console.log("✓ [Shiprocket Auth] Successfully authenticated and cached token.");
    return cachedToken!;
  } catch (error: any) {
    console.error("[Shiprocket Auth Exception]:", error.message);
    throw new Error(`Shiprocket Authentication Failed: ${error.message}`);
  }
}

/**
 * 2. Serviceability & Shipping Rate Check
 * API: GET /v1/external/courier/serviceability/
 */
export async function checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
  try {
    const token = await getShiprocketToken();
    const isCOD = params.cod === true || params.cod === 1 || String(params.cod).toUpperCase() === "COD" || String(params.cod) === "1" ? 1 : 0;
    const weight = params.weight || 0.5;

    const queryParams = new URLSearchParams({
      pickup_postcode: String(params.pickup_postcode).trim(),
      delivery_postcode: String(params.delivery_postcode).trim(),
      weight: String(weight),
      cod: String(isCOD),
      length: String(params.length || 15),
      width: String(params.width || 15),
      height: String(params.height || 10),
    });

    const response = await fetch(`${SHIPROCKET_BASE_URL}/courier/serviceability/?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok && data.status === 200) {
      const couriers = (data.data?.available_courier_companies || []).map((c: any) => ({
        courier_company_id: c.courier_company_id,
        courier_name: c.courier_name,
        freight_charge: parseFloat(c.freight_charge || 0),
        cod_charges: parseFloat(c.cod_charges || 0),
        total_charge: parseFloat(c.rate || c.freight_charge || 0),
        estimated_delivery_days: c.estimated_delivery_days || c.etd || '3-5 Days',
        etd: c.etd || null,
        rating: c.rating || 4.5,
        is_recommended: c.courier_company_id === data.data?.recommended_courier_company_id,
        cod_available: c.cod === 1,
      }));

      couriers.sort((a: CourierOption, b: CourierOption) => a.total_charge - b.total_charge);

      return {
        success: true,
        serviceable: couriers.length > 0,
        pickup_postcode: params.pickup_postcode,
        delivery_postcode: params.delivery_postcode,
        weight,
        cod: isCOD === 1,
        count: couriers.length,
        recommended_courier_id: data.data?.recommended_courier_company_id || null,
        couriers,
      };
    }

    return {
      success: false,
      serviceable: false,
      message: data.message || "Pincode is not serviceable.",
      couriers: [],
    };
  } catch (error: any) {
    console.error("[Shiprocket Serviceability Error]:", error.message);
    return {
      success: false,
      serviceable: false,
      error: error.message,
      couriers: [],
    };
  }
}

/**
 * 3. Order Push
 * API: POST /v1/external/orders/create/adhoc
 */
export async function pushOrderToShiprocket(orderDetails: PushOrderParams) {
  try {
    const token = await getShiprocketToken();
    const isCOD = String(orderDetails.payment_method || "COD").toUpperCase() === "COD";

    const billing = orderDetails.billing_address || orderDetails;
    const shipping = orderDetails.shipping_address || billing;

    const items = (orderDetails.line_items || []).map((item: any, idx: number) => ({
      name: (item.name || item.title || `Item ${idx + 1}`).substring(0, 255),
      sku: (item.sku || item.product_id || `SKU-${idx + 1}`).substring(0, 100),
      units: Number(item.units || item.quantity || item.qty || 1),
      selling_price: Number(item.selling_price || item.price || 0),
      discount: Number(item.discount || 0),
      tax: Number(item.tax || 0),
      hsn: item.hsn ? String(item.hsn) : "",
    }));

    const payload = {
      order_id: String(orderDetails.order_id),
      order_date: orderDetails.order_date || new Date().toISOString().replace("T", " ").substring(0, 19),
      pickup_location: String(orderDetails.pickup_location || "Primary").substring(0, 36),
      comment: orderDetails.comment || "E-commerce Website Order",
      billing_customer_name: (billing.first_name || billing.name || "Customer").substring(0, 100),
      billing_last_name: (billing.last_name || "").substring(0, 100),
      billing_address: (billing.address_line1 || billing.address || "Street Address").substring(0, 255),
      billing_address_2: (billing.address_line2 || "").substring(0, 255),
      billing_city: (billing.city || "Kolkata").substring(0, 100),
      billing_pincode: String(billing.pincode || billing.postcode || "700001").replace(/\D/g, "").slice(0, 6),
      billing_state: (billing.state || "West Bengal").substring(0, 100),
      billing_country: (billing.country || "India").substring(0, 100),
      billing_email: (billing.email || "customer@example.com").substring(0, 100),
      billing_phone: String(billing.phone || "9999999999").replace(/\D/g, "").slice(0, 10),
      shipping_is_billing: orderDetails.shipping_is_billing !== false ? 1 : 0,
      shipping_customer_name: (shipping.first_name || shipping.name || "Customer").substring(0, 100),
      shipping_last_name: (shipping.last_name || "").substring(0, 100),
      shipping_address: (shipping.address_line1 || shipping.address || "Street Address").substring(0, 255),
      shipping_address_2: (shipping.address_line2 || "").substring(0, 255),
      shipping_city: (shipping.city || "Kolkata").substring(0, 100),
      shipping_pincode: String(shipping.pincode || shipping.postcode || "700001").replace(/\D/g, "").slice(0, 6),
      shipping_state: (shipping.state || "West Bengal").substring(0, 100),
      shipping_country: (shipping.country || "India").substring(0, 100),
      shipping_email: (shipping.email || "customer@example.com").substring(0, 100),
      shipping_phone: String(shipping.phone || "9999999999").replace(/\D/g, "").slice(0, 10),
      order_items: items,
      payment_method: isCOD ? "COD" : "Prepaid",
      shipping_charges: Number(orderDetails.shipping_charges || 0),
      sub_total: Number(orderDetails.sub_total || 0),
      length: Number(orderDetails.length || 15),
      width: Number(orderDetails.width || 15),
      height: Number(orderDetails.height || 10),
      weight: Number(orderDetails.weight || 0.5),
    };

    const response = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || (typeof data.errors === "object" ? JSON.stringify(data.errors) : "Failed to create Shiprocket order"));
    }

    return {
      success: true,
      shiprocket_order_id: data.order_id,
      shiprocket_shipment_id: data.shipment_id,
      awb_code: data.awb_code || null,
      courier_name: data.courier_name || null,
      status: data.status || "NEW",
      data,
    };
  } catch (error: any) {
    console.error("[Shiprocket Order Push Error]:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function createShiprocketOrder(tokenOrOrderData: any, optionalOrderData?: any) {
  if (typeof tokenOrOrderData === "string" && optionalOrderData) {
    return pushOrderToShiprocket(optionalOrderData);
  }
  return pushOrderToShiprocket(tokenOrOrderData);
}

/**
 * 4. Real-time Tracking & Webhook parsing
 */
export async function trackShipment(shipmentId: string) {
  try {
    const token = await getShiprocketToken();
    const response = await fetch(`${SHIPROCKET_BASE_URL}/courier/track/shipment/${shipmentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`[Shiprocket Tracking Error ${shipmentId}]:`, error.message);
    return { success: false, error: error.message };
  }
}
