import axios from 'axios';
import { config } from '../config/index.js';

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

// In-memory token cache
let cachedToken = null;
let tokenExpiresAt = 0; // Timestamp in ms

/**
 * 1. Authentication & Token Management
 * Authenticates with Shiprocket API via POST /v1/external/auth/login
 * Caches JWT token securely in memory and refreshes it before expiration (Shiprocket tokens expire in 24 hrs).
 */
export const getShiprocketToken = async (forceRefresh = false) => {
  const now = Date.now();

  // If token is cached and valid for at least another 5 minutes, return cached token
  if (!forceRefresh && cachedToken && tokenExpiresAt - now > 5 * 60 * 1000) {
    return cachedToken;
  }

  const email = (config.shiprocket?.email || process.env.SHIPROCKET_EMAIL || '').trim();
  const password = (config.shiprocket?.password || process.env.SHIPROCKET_PASSWORD || '').trim();

  if (!email || !password) {
    const errorMsg = '[Shiprocket Auth Error] SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be configured in environment variables (.env)';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    console.log('[Shiprocket Auth] Requesting new JWT token from Shiprocket API...');
    const response = await axios.post(
      `${SHIPROCKET_BASE_URL}/auth/login`,
      { email, password },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    if (response.data && response.data.token) {
      cachedToken = response.data.token;
      // Cache token for 23 hours (82,800,000 ms)
      tokenExpiresAt = now + 23 * 60 * 60 * 1000;
      console.log('✓ [Shiprocket Auth] Successfully authenticated and cached JWT token.');
      return cachedToken;
    }

    throw new Error(response.data?.message || 'Token not present in response payload');
  } catch (error) {
    const status = error.response?.status;
    const errorDetails = error.response?.data?.message || error.response?.data?.errors || error.message;
    console.error(`[Shiprocket Auth Failure] Status: ${status || 'N/A'}, Error:`, errorDetails);
    throw new Error(`Shiprocket Authentication Failed: ${typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorDetails}`);
  }
};

/**
 * 2. Serviceability & Shipping Rate Check
 * Calls GET https://apiv2.shiprocket.in/v1/external/courier/serviceability/
 *
 * @param {Object} params
 * @param {string|number} params.pickup_postcode - Sender Pincode (6 digits)
 * @param {string|number} params.delivery_postcode - Recipient Pincode (6 digits)
 * @param {number} params.weight - Package weight in kg (e.g., 0.5)
 * @param {boolean|number|string} params.cod - COD status (1 or true for COD, 0 or false for Prepaid)
 * @param {number} [params.length=15] - Package length in cm
 * @param {number} [params.width=15] - Package width in cm
 * @param {number} [params.height=10] - Package height in cm
 */
export const checkServiceability = async ({
  pickup_postcode,
  delivery_postcode,
  weight = 0.5,
  cod = 0,
  length = 15,
  width = 15,
  height = 10,
}) => {
  try {
    const token = await getShiprocketToken();

    // Standardize COD flag (1 = COD, 0 = Prepaid)
    const isCOD = (cod === true || cod === 1 || String(cod).toUpperCase() === 'COD' || String(cod) === '1') ? 1 : 0;
    const parsedWeight = parseFloat(weight) || 0.5;

    const queryParams = new URLSearchParams({
      pickup_postcode: String(pickup_postcode).trim(),
      delivery_postcode: String(delivery_postcode).trim(),
      weight: String(parsedWeight),
      cod: String(isCOD),
      length: String(length),
      width: String(width),
      height: String(height),
    });

    console.log(`[Shiprocket Serviceability] Checking rates for pickup: ${pickup_postcode} -> delivery: ${delivery_postcode}, weight: ${parsedWeight}kg, cod: ${isCOD}`);

    const response = await axios.get(
      `${SHIPROCKET_BASE_URL}/courier/serviceability/?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const data = response.data;
    if (data && data.status === 200) {
      const availableCouriers = data.data?.available_courier_companies || [];
      const recommendedId = data.data?.recommended_courier_company_id || null;

      const formattedCouriers = availableCouriers.map((courier) => ({
        courier_company_id: courier.courier_company_id,
        courier_name: courier.courier_name,
        freight_charge: parseFloat(courier.freight_charge || 0),
        cod_charges: parseFloat(courier.cod_charges || 0),
        total_charge: parseFloat(courier.rate || courier.freight_charge || 0),
        estimated_delivery_days: courier.estimated_delivery_days || courier.etd || '3-5 Days',
        etd: courier.etd || null,
        min_weight: courier.min_weight,
        charge_weight: courier.charge_weight,
        rating: courier.rating || 4.5,
        pickup_performance: courier.pickup_performance || 'High',
        delivery_performance: courier.delivery_performance || 'High',
        is_recommended: courier.courier_company_id === recommendedId,
        cod_available: courier.cod === 1,
      }));

      // Sort by rate (cheapest first)
      formattedCouriers.sort((a, b) => a.total_charge - b.total_charge);

      return {
        success: true,
        serviceable: formattedCouriers.length > 0,
        pickup_postcode,
        delivery_postcode,
        weight: parsedWeight,
        cod: isCOD === 1,
        count: formattedCouriers.length,
        recommended_courier_id: recommendedId,
        couriers: formattedCouriers,
      };
    }

    return {
      success: false,
      serviceable: false,
      message: data?.message || 'Pincode not serviceable by Shiprocket couriers.',
      couriers: [],
    };
  } catch (error) {
    // If 401 Unauthorized, invalidate token cache and retry once
    if (error.response?.status === 401) {
      console.warn('[Shiprocket Serviceability] Token expired. Retrying with fresh authentication...');
      await getShiprocketToken(true);
      return checkServiceability({ pickup_postcode, delivery_postcode, weight, cod, length, width, height });
    }

    const errorMsg = error.response?.data?.message || error.response?.data?.errors || error.message;
    console.error('[Shiprocket Serviceability Error]:', errorMsg);
    return {
      success: false,
      serviceable: false,
      error: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg),
      couriers: [],
    };
  }
};

/**
 * 3. Order Push
 * Pushes successful website orders to Shiprocket using POST /v1/external/orders/create/adhoc
 *
 * @param {Object} orderDetails - Order details object
 */
export const pushOrderToShiprocket = async (orderDetails) => {
  try {
    const token = await getShiprocketToken();

    const isCOD = String(orderDetails.payment_method || orderDetails.payment_mode || 'COD').toUpperCase() === 'COD';
    const paymentMode = isCOD ? 'COD' : 'Prepaid';

    // Format line items
    const rawItems = Array.isArray(orderDetails.line_items || orderDetails.items || orderDetails.order_items)
      ? (orderDetails.line_items || orderDetails.items || orderDetails.order_items)
      : [];

    const orderItems = rawItems.map((item, idx) => ({
      name: (item.name || item.title || `Item ${idx + 1}`).substring(0, 255),
      sku: (item.sku || item.product_id || `SKU-${idx + 1}`).substring(0, 100),
      units: parseInt(item.quantity || item.units || item.qty || 1, 10),
      selling_price: parseFloat(item.price || item.selling_price || item.unit_price || 0),
      discount: parseFloat(item.discount || 0),
      tax: parseFloat(item.tax || 0),
      hsn: item.hsn ? String(item.hsn) : '',
    }));

    // Extract Billing & Shipping Address details with intelligent regex parsing
    const rawAddrStr = typeof orderDetails.address === 'string'
      ? orderDetails.address
      : (typeof orderDetails.shipping_address === 'string' ? orderDetails.shipping_address : '');

    const billing = orderDetails.billing_address || orderDetails.shipping_address || orderDetails;
    const shipping = orderDetails.shipping_address || billing;

    let extractedPin = billing.pincode || billing.postcode || billing.zip || orderDetails.pincode;
    if (!extractedPin && rawAddrStr) {
      const pinMatch = rawAddrStr.match(/(?:Pin|Pincode|PIN)?\s*[:\-]?\s*(\d{6})\b/i) || rawAddrStr.match(/\b(\d{6})\b/);
      if (pinMatch) extractedPin = pinMatch[1];
    }
    const finalPincode = String(extractedPin || '700001').replace(/\D/g, '').slice(0, 6);

    let extractedCity = billing.city || orderDetails.city;
    if (!extractedCity && rawAddrStr) {
      const cityMatch = rawAddrStr.match(/(?:Vill|Village|City|Town)\s*[:\-]\s*([^,]+)/i);
      if (cityMatch) extractedCity = cityMatch[1].trim();
    }
    const finalCity = (extractedCity || 'Kolkata').substring(0, 100);

    let extractedState = billing.state || orderDetails.state;
    if (!extractedState && rawAddrStr) {
      const stateMatch = rawAddrStr.match(/(?:P\.O|PO|State)\s*[:\-]\s*([^,]+)/i);
      if (stateMatch) extractedState = stateMatch[1].trim();
    }
    const finalState = (extractedState || 'West Bengal').substring(0, 100);

    const fullAddrLine = (rawAddrStr || billing.address_line1 || billing.address || 'Street Address').substring(0, 255);

    const payload = {
      order_id: String(orderDetails.order_id || orderDetails.order_number || `ORD-${Date.now()}`),
      order_date: orderDetails.order_date || new Date().toISOString().replace('T', ' ').substring(0, 19),
      pickup_location: String(orderDetails.pickup_location || config.shiprocket?.defaultPickupLocation || 'Primary').substring(0, 36),
      channel_id: orderDetails.channel_id || '',
      comment: orderDetails.comment || 'E-commerce Website Order',
      billing_customer_name: (billing.first_name || billing.name || orderDetails.customer_name || 'Customer').substring(0, 100),
      billing_last_name: (billing.last_name || '').substring(0, 100),
      billing_address: fullAddrLine,
      billing_address_2: (billing.address_line2 || billing.landmark || '').substring(0, 255),
      billing_city: finalCity,
      billing_pincode: finalPincode,
      billing_state: finalState,
      billing_country: (billing.country || 'India').substring(0, 100),
      billing_email: (billing.email || orderDetails.email || 'customer@example.com').substring(0, 100),
      billing_phone: String(billing.phone || orderDetails.phone || '9999999999').replace(/\D/g, '').slice(0, 10),
      shipping_is_billing: orderDetails.shipping_is_billing !== false ? 1 : 0,
      shipping_customer_name: (shipping.first_name || shipping.name || orderDetails.customer_name || 'Customer').substring(0, 100),
      shipping_last_name: (shipping.last_name || '').substring(0, 100),
      shipping_address: fullAddrLine,
      shipping_address_2: (shipping.address_line2 || shipping.landmark || '').substring(0, 255),
      shipping_city: finalCity,
      shipping_pincode: finalPincode,
      shipping_state: finalState,
      shipping_country: (shipping.country || 'India').substring(0, 100),
      shipping_email: (shipping.email || orderDetails.email || 'customer@example.com').substring(0, 100),
      shipping_phone: String(shipping.phone || orderDetails.phone || '9999999999').replace(/\D/g, '').slice(0, 10),
      order_items: orderItems,
      payment_method: paymentMode,
      shipping_charges: parseFloat(orderDetails.shipping_charges || orderDetails.shipping_charge || 0),
      giftwrap_charges: parseFloat(orderDetails.giftwrap_charges || 0),
      transaction_charges: parseFloat(orderDetails.transaction_charges || 0),
      total_discount: parseFloat(orderDetails.total_discount || orderDetails.discount_amount || 0),
      sub_total: parseFloat(orderDetails.sub_total || orderDetails.subtotal || orderDetails.total_amount || 0),
      length: parseFloat(orderDetails.length || orderDetails.dimensions?.length || 15),
      breadth: parseFloat(orderDetails.breadth || orderDetails.width || orderDetails.dimensions?.breadth || orderDetails.dimensions?.width || 15),
      height: parseFloat(orderDetails.height || orderDetails.dimensions?.height || 10),
      weight: parseFloat(orderDetails.weight || orderDetails.weight_kg || 0.5),
    };

    console.log(`[Shiprocket Order Push] Creating order #${payload.order_id} in Shiprocket...`);

    const response = await axios.post(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });

    const data = response.data;
    console.log(`✓ [Shiprocket Order Push Success] Order #${payload.order_id} created in Shiprocket. Shipment ID: ${data.shipment_id || 'N/A'}`);

    return {
      success: true,
      shiprocket_order_id: data.order_id,
      shiprocket_shipment_id: data.shipment_id,
      awb_code: data.awb_code || null,
      courier_name: data.courier_name || null,
      status: data.status || 'NEW',
      raw_response: data,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      console.warn('[Shiprocket Order Push] Token expired. Retrying with fresh authentication...');
      await getShiprocketToken(true);
      return pushOrderToShiprocket(orderDetails);
    }

    const errorDetails = error.response?.data?.errors || error.response?.data?.message || error.message;
    console.error('[Shiprocket Order Push Error]:', errorDetails);

    return {
      success: false,
      error: typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : String(errorDetails),
      raw_error: error.response?.data || null,
    };
  }
};

/**
 * 4. Real-time Tracking Helper
 * Fetch current live tracking details from Shiprocket API
 *
 * @param {string|number} shipmentId - Shiprocket Shipment ID or AWB Code
 */
export const trackShiprocketShipment = async (shipmentId) => {
  try {
    const token = await getShiprocketToken();
    console.log(`[Shiprocket Tracking] Querying tracking for shipment: ${shipmentId}`);

    const response = await axios.get(
      `${SHIPROCKET_BASE_URL}/courier/track/shipment/${shipmentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      }
    );

    return {
      success: true,
      tracking_data: response.data?.tracking_data || response.data,
    };
  } catch (error) {
    if (error.response?.status === 401) {
      await getShiprocketToken(true);
      return trackShiprocketShipment(shipmentId);
    }

    const errorMsg = error.response?.data?.message || error.message;
    console.error(`[Shiprocket Tracking Error] Shipment ID ${shipmentId}:`, errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
};

/**
 * Helper to translate Shiprocket Webhook status codes and text into application order statuses
 *
 * @param {Object} webhookPayload
 * @returns {Object} Translated status info
 */
export const parseShiprocketWebhookPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, reason: 'Payload is null or not an object' };
  }

  const {
    awb,
    shipment_id,
    order_id,
    current_status,
    status_code,
    courier_name,
    etd,
    location,
    scans,
  } = payload;

  const code = Number(status_code);
  const statusStr = String(current_status || '').toUpperCase();

  let mappedOrderStatus = 'processing';
  let paymentStatusUpdate = null;

  // Shiprocket Status Code Mapping:
  // 6: Shipped / Manifest Generated / Pickup Scheduled
  // 13: Pickup Done / In Transit
  // 18: In Transit
  // 17: Out For Delivery
  // 7: Delivered
  // 9 / 14 / 21: RTO (Return to Origin)
  // 10: Canceled

  if (code === 7 || statusStr.includes('DELIVERED')) {
    mappedOrderStatus = 'delivered';
    paymentStatusUpdate = 'PAID';
  } else if (code === 17 || statusStr.includes('OUT FOR DELIVERY')) {
    mappedOrderStatus = 'out_for_delivery';
  } else if (code === 13 || code === 18 || statusStr.includes('TRANSIT') || statusStr.includes('DISPATCHED')) {
    mappedOrderStatus = 'shipped';
  } else if (code === 6 || statusStr.includes('MANIFEST') || statusStr.includes('PICKUP SCHEDULED')) {
    mappedOrderStatus = 'ready_to_ship';
  } else if (code === 9 || code === 14 || code === 21 || statusStr.includes('RTO')) {
    mappedOrderStatus = 'rto';
  } else if (code === 10 || statusStr.includes('CANCELED') || statusStr.includes('CANCELLED')) {
    mappedOrderStatus = 'cancelled';
  }

  return {
    isValid: true,
    awb_code: awb || null,
    shipment_id: shipment_id ? String(shipment_id) : null,
    order_id: order_id ? String(order_id) : null,
    raw_status: current_status,
    status_code: code,
    mapped_order_status: mappedOrderStatus,
    payment_status_update: paymentStatusUpdate,
    courier_name: courier_name || null,
    etd: etd || null,
    location: location || null,
    scans: scans || [],
  };
};
