import axios from 'axios';
import {
  getShiprocketToken,
  checkServiceability,
  pushOrderToShiprocket,
  trackShiprocketShipment,
  parseShiprocketWebhookPayload,
  cancelShiprocketOrder,
  createShiprocketReturnOrder,
} from './shiprocket.js';

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

export {
  getShiprocketToken,
  checkServiceability,
  pushOrderToShiprocket,
  trackShiprocketShipment,
  parseShiprocketWebhookPayload,
  cancelShiprocketOrder,
  createShiprocketReturnOrder,
};

/**
 * Register or update a Seller's Pickup Location in Shiprocket
 * API: POST /v1/external/settings/company/addpickup
 */
export const addShiprocketPickupLocation = async (locationData) => {
  try {
    const token = await getShiprocketToken();
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
 * Legacy wrapper for creating adhoc order
 */
export const createShiprocketOrder = async (orderPayload) => {
  return pushOrderToShiprocket(orderPayload);
};

/**
 * Assign Courier & Generate AWB Code
 * API: POST /v1/external/courier/assign/awb
 */
export const assignShiprocketAWB = async (shipmentId, courierId = null) => {
  try {
    const token = await getShiprocketToken();
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
  try {
    const token = await getShiprocketToken();
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
  try {
    const token = await getShiprocketToken();
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
