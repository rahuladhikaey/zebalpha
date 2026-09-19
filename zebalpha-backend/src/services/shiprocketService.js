import axios from 'axios';
import { config } from '../config/index.js';

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Obtain or refresh Shiprocket Bearer Auth Token
 */
export const getShiprocketToken = async () => {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now) {
    return cachedToken;
  }

  const email = (config.shiprocket?.email || process.env.SHIPROCKET_EMAIL || '').trim();
  const password = (config.shiprocket?.password || process.env.SHIPROCKET_PASSWORD || '').trim();

  if (!email || !password || email === 'dummy@example.com') {
    console.warn('[Shiprocket Service] Live credentials missing or dummy. Using fallback courier simulation.');
    return null;
  }

  try {
    const res = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
      email,
      password
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 12000
    });

    if (res.data && res.data.token) {
      cachedToken = res.data.token;
      // Cache token for 23 hours (Shiprocket tokens are valid for 24 hours)
      tokenExpiresAt = now + (23 * 60 * 60 * 1000);
      console.log('✓ [Shiprocket Service] Authenticated successfully with Shiprocket API Gateway.');
      return cachedToken;
    }
    return null;
  } catch (err) {
    console.warn('[Shiprocket Service Auth Warning]:', err.response?.data?.message || err.message);
    return null;
  }
};

/**
 * Register or update a Seller's Pickup Location in Shiprocket
 * API: POST /v1/external/settings/company/addpickup
 */
export const addShiprocketPickupLocation = async (locationData) => {
  const token = await getShiprocketToken();
  if (!token) {
    return {
      success: false,
      isSimulated: true,
      location_id: `SR-LOC-${Date.now()}`,
      message: 'Simulated location registration (Offline / Sandbox mode)'
    };
  }

  try {
    const payload = {
      pickup_location: String(locationData.location_name || `Seller_${locationData.seller_id}`).slice(0, 36),
      name: locationData.contact_name || locationData.name || 'Merchant Dispatch Hub',
      email: locationData.contact_email || locationData.email || 'seller@zebalpha.com',
      phone: String(locationData.contact_phone || locationData.phone || '9999999999').replace(/\D/g, '').slice(0, 10),
      address: locationData.address_line1 || locationData.address || 'Seller Workshop',
      address_2: locationData.address_line2 || locationData.landmark || '',
      city: locationData.city || 'Kolkata',
      state: locationData.state || 'West Bengal',
      country: locationData.country || 'India',
      pin_code: String(locationData.pincode || '700001').replace(/\D/g, '').slice(0, 6)
    };

    const response = await axios.post(`${SHIPROCKET_BASE_URL}/settings/company/addpickup`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      timeout: 15000
    });

    return {
      success: true,
      data: response.data,
      pickup_location: payload.pickup_location,
      address_id: response.data?.address?.id || response.data?.id || null
    };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.response?.data?.errors || err.message;
    console.warn('[Shiprocket Add Pickup Warning]:', errMsg);
    return {
      success: false,
      error: typeof errMsg === 'object' ? JSON.stringify(errMsg) : String(errMsg)
    };
  }
};

/**
 * Create Adhoc Shipment Order in Shiprocket
 * API: POST /v1/external/orders/create/adhoc
 */
export const createShiprocketOrder = async (orderPayload) => {
  const token = await getShiprocketToken();
  if (!token) {
    return {
      success: false,
      isSimulated: true,
      message: 'Provider unavailable, using intelligent courier allocation'
    };
  }

  try {
    const response = await axios.post(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, orderPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      timeout: 20000
    });

    return {
      success: true,
      data: response.data,
      order_id: response.data.order_id,
      shipment_id: response.data.shipment_id,
      awb_code: response.data.awb_code,
      courier_name: response.data.courier_name
    };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.response?.data?.errors || err.message;
    console.warn('[Shiprocket Create Order Warning]:', errMsg);
    return {
      success: false,
      error: typeof errMsg === 'object' ? JSON.stringify(errMsg) : String(errMsg)
    };
  }
};

/**
 * Assign Courier & Generate AWB Code
 * API: POST /v1/external/courier/assign/awb
 */
export const assignShiprocketAWB = async (shipmentId, courierId = null) => {
  const token = await getShiprocketToken();
  if (!token) return { success: false, isSimulated: true };

  try {
    const payload = { shipment_id: shipmentId };
    if (courierId) payload.courier_id = courierId;

    const response = await axios.post(`${SHIPROCKET_BASE_URL}/courier/assign/awb`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      timeout: 15000
    });

    const respData = response.data?.response?.data || response.data;
    return {
      success: true,
      awb_code: respData.awb_code,
      courier_name: respData.courier_name,
      courier_company_id: respData.courier_company_id,
      routing_hub: respData.routing_hub || 'CCU/EAST-HUB-01',
      data: respData
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message
    };
  }
};

/**
 * Generate Shipping Label URL
 * API: POST /v1/external/courier/generate/label
 */
export const generateShiprocketLabel = async (shipmentIds) => {
  const token = await getShiprocketToken();
  if (!token) return { success: false, isSimulated: true };

  try {
    const ids = Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds];
    const response = await axios.post(`${SHIPROCKET_BASE_URL}/courier/generate/label`, {
      shipment_id: ids
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      timeout: 15000
    });

    return {
      success: true,
      label_url: response.data.label_url,
      label_created: response.data.label_created
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message
    };
  }
};

/**
 * Request Courier Rider Pickup Handover
 * API: POST /v1/external/courier/generate/pickup
 */
export const requestShiprocketPickup = async (shipmentIds) => {
  const token = await getShiprocketToken();
  if (!token) return { success: false, isSimulated: true };

  try {
    const ids = Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds];
    const response = await axios.post(`${SHIPROCKET_BASE_URL}/courier/generate/pickup`, {
      shipment_id: ids
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      timeout: 15000
    });

    return {
      success: true,
      data: response.data
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message
    };
  }
};

/**
 * Track Live Shipment Journey
 * API: GET /v1/external/courier/track/shipment/{shipment_id}
 */
export const trackShiprocketShipment = async (shipmentId) => {
  const token = await getShiprocketToken();
  if (!token) return { success: false, isSimulated: true };

  try {
    const response = await axios.get(`${SHIPROCKET_BASE_URL}/courier/track/shipment/${shipmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000
    });

    return {
      success: true,
      tracking_data: response.data?.tracking_data || response.data
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message
    };
  }
};
