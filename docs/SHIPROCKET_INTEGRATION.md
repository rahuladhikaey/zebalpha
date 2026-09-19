# Shiprocket API Integration Documentation

## Overview
This document outlines the architecture, configuration, helper utilities, and route handlers for the Shiprocket shipping integration built for the e-commerce application.

---

## 1. Environment Variables Configuration (`.env`)

Add the following credentials to your `.env` / `.env.production` file:

```env
SHIPROCKET_EMAIL=your_registered_shiprocket_email@example.com
SHIPROCKET_PASSWORD=your_secure_shiprocket_password
```

---

## 2. Authentication & Token Management

**Implementation:** [`zebalpha-backend/src/services/shiprocket.js`](file:///d:/Full%20Folder%2077/zebalpha-backend/src/services/shiprocket.js) & [`zebalpha-customer/src/lib/shiprocket.ts`](file:///d:/Full%20Folder%2077/zebalpha-customer/src/lib/shiprocket.ts)

- **Endpoint:** `POST https://apiv2.shiprocket.in/v1/external/auth/login`
- **Caching & Refresh:**
  - Token is cached in memory upon initial successful login.
  - Automatically re-authenticated 5 minutes before the 24-hour expiration window or when an API call returns `401 Unauthorized`.
- **Security:** Credentials are retrieved strictly from environment variables (`SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`).

---

## 3. Serviceability & Shipping Rate Check API

- **Backend Route:** `GET /api/shipping/check-serviceability` & `POST /api/shipping/check-serviceability`
- **Next.js Route:** `GET /api/shipping/check-serviceability` & `POST /api/shipping/check-serviceability`
- **Shiprocket API:** `GET https://apiv2.shiprocket.in/v1/external/courier/serviceability/`

### Query / Body Parameters:
| Field | Type | Required | Description |
|---|---|---|---|
| `pickup_postcode` | String / Number | Yes | 6-digit origin pincode |
| `delivery_postcode` | String / Number | Yes | 6-digit destination pincode |
| `weight` | Number | No | Weight in KG (Default: `0.5`) |
| `cod` | Boolean / Number | No | `1` / `true` for Cash on Delivery, `0` / `false` for Prepaid |

### Sample Response:
```json
{
  "success": true,
  "serviceable": true,
  "pickup_postcode": "700001",
  "delivery_postcode": "110001",
  "weight": 0.5,
  "cod": false,
  "count": 4,
  "recommended_courier_id": 10,
  "couriers": [
    {
      "courier_company_id": 10,
      "courier_name": "Delhivery Surface",
      "freight_charge": 45,
      "cod_charges": 0,
      "total_charge": 45,
      "estimated_delivery_days": "2-3 Days",
      "rating": 4.6,
      "is_recommended": true,
      "cod_available": true
    }
  ]
}
```

---

## 4. Order Push API (Adhoc Order Creation)

- **Backend Route:** `POST /api/shipping/create-order` / `POST /api/shipping/push-order`
- **Next.js Route:** `POST /api/shipping/create-order`
- **Shiprocket API:** `POST https://apiv2.shiprocket.in/v1/external/orders/create/adhoc`

### Request Payload Example:
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "orderData": {
    "order_id": "ORD-100234",
    "order_date": "2026-09-20 12:00:00",
    "pickup_location": "Primary",
    "billing_address": {
      "first_name": "Rahul",
      "last_name": "Adhikary",
      "address_line1": "Flat 4B, Park Street",
      "city": "Kolkata",
      "pincode": "700016",
      "state": "West Bengal",
      "country": "India",
      "email": "rahul@example.com",
      "phone": "9876543210"
    },
    "line_items": [
      {
        "name": "Oversized Cotton Tee",
        "sku": "TSHIRT-BLK-L",
        "units": 2,
        "selling_price": 799,
        "discount": 0,
        "tax": 0
      }
    ],
    "payment_method": "Prepaid",
    "sub_total": 1598,
    "shipping_charges": 0,
    "weight": 0.5
  }
}
```

### Response Example:
```json
{
  "success": true,
  "message": "Order pushed to Shiprocket successfully.",
  "data": {
    "shiprocket_order_id": 89234123,
    "shiprocket_shipment_id": 89123411,
    "awb_code": "DEL129384712",
    "courier_name": "Delhivery Express",
    "status": "NEW"
  }
}
```

---

## 5. Real-Time Tracking & Webhook Handler

- **Webhook URL:** `POST /api/webhooks/shiprocket` & `POST /api/shipping/webhook`

### Handled Status Mappings:
| Shiprocket Status / Code | App Order Status | Payment Status Update |
|---|---|---|
| Code 6 (`MANIFEST GENERATED` / `PICKUP SCHEDULED`) | `ready_to_ship` | Unchanged |
| Code 13 / 18 (`PICKED UP` / `IN TRANSIT`) | `shipped` | Unchanged |
| Code 17 (`OUT FOR DELIVERY`) | `out_for_delivery` | Unchanged |
| Code 7 (`DELIVERED`) | `delivered` | `PAID` / `COMPLETE` |
| Code 9 / 14 / 21 (`RTO INITIATED`) | `rto` | Unchanged |
| Code 10 (`CANCELLED`) | `cancelled` | Unchanged |

### Database Auditing:
Whenever a webhook trigger is received, the system updates:
1. `orders` table (`order_status`, `payment_status`, `tracking_number`, `courier_name`).
2. `shipments` table (`status`, `delivered_at`).
3. `shipment_tracking` / `shipping_events` table (audited log entry with raw payload).

---

## Code Architecture & File References

- **Backend Service:** [`zebalpha-backend/src/services/shiprocket.js`](file:///d:/Full%20Folder%2077/zebalpha-backend/src/services/shiprocket.js)
- **Backend Controller:** [`zebalpha-backend/src/controllers/shippingController.js`](file:///d:/Full%20Folder%2077/zebalpha-backend/src/controllers/shippingController.js)
- **Backend Routes:** [`zebalpha-backend/src/routes/shippingRoutes.js`](file:///d:/Full%20Folder%2077/zebalpha-backend/src/routes/shippingRoutes.js) & [`zebalpha-backend/src/routes/webhookRoutes.js`](file:///d:/Full%20Folder%2077/zebalpha-backend/src/routes/webhookRoutes.js)
- **Customer Frontend Service:** [`zebalpha-customer/src/lib/shiprocket.ts`](file:///d:/Full%20Folder%2077/zebalpha-customer/src/lib/shiprocket.ts)
- **Customer API Routes:**
  - [`zebalpha-customer/src/app/api/shipping/check-serviceability/route.ts`](file:///d:/Full%20Folder%2077/zebalpha-customer/src/app/api/shipping/check-serviceability/route.ts)
  - [`zebalpha-customer/src/app/api/shipping/create-order/route.ts`](file:///d:/Full%20Folder%2077/zebalpha-customer/src/app/api/shipping/create-order/route.ts)
  - [`zebalpha-customer/src/app/api/webhooks/shiprocket/route.ts`](file:///d:/Full%20Folder%2077/zebalpha-customer/src/app/api/webhooks/shiprocket/route.ts)
