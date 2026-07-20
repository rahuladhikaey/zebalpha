# Payment & Shipping Integration Guide

This guide explains how to integrate and configure **Razorpay** (Payments) and **Shiprocket** (Logistics) for the Asali Swad eCommerce platform.


---

## 1. Razorpay Integration (Payment Gateway)

### Step 1: Get API Keys
1. Sign up/Login to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Go to **Settings** > **API Keys**.
3. Generate **Test Keys** (for development) or **Live Keys** (for production).
4. You will get a `Key ID` and a `Key Secret`.

### Step 2: Environment Variables
Add the following to your `.env.local` file:
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### Step 3: Backend Implementation (API Routes)
The project uses two main API routes for Razorpay:

#### A. Create Order (`/api/checkout/create-order`)
This route communicates with Razorpay to create a transaction ID.
```typescript
// Example Logic
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const order = await razorpay.orders.create({
  amount: amount * 100, // Amount in paise
  currency: "INR",
  receipt: "receipt_id_" + Date.now(),
});
```

#### B. Verify Payment (`/api/checkout/verify-payment`)
This route verifies the payment signature sent by Razorpay after a successful transaction to ensure it's authentic.
```typescript
// Signature Verification
const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
const sign = razorpay_order_id + "|" + razorpay_payment_id;
const expectedSign = crypto
  .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
  .update(sign.toString())
  .digest("hex");

if (razorpay_signature === expectedSign) {
  // Payment Verified! Save order to Supabase.
}
```

### Step 4: Frontend Checkout
The checkout page (`src/app/checkout/page.tsx`) already contains the logic to:
1. Load the Razorpay SDK script.
2. Call `/api/checkout/create-order`.
3. Open the Razorpay Modal.
4. Call `/api/checkout/verify-payment` on success.

---

## 2. Shiprocket Integration (Shipping & Logistics)

### Step 1: Get Credentials
1. Create an account at [Shiprocket](https://www.shiprocket.in/).
2. Go to **Settings** > **API** > **Configure**.
3. Create an API User to get your **Email** and **Password**.

### Step 2: Environment Variables
Add these to your `.env.local`:
```env
SHIPROCKET_EMAIL=your_email
SHIPROCKET_PASSWORD=your_password
```

### Step 3: Authentication (Token Generation)
Shiprocket requires a JWT token for every request. You should create a utility to get this token.
```typescript
// src/lib/shiprocket.ts
export async function getShiprocketToken() {
  const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  const data = await res.json();
  return data.token;
}
```

### Step 4: Create a Custom Order
When a payment is verified (or a COD order is placed), you can automatically push the order to Shiprocket.

**API Endpoint**: `POST https://apiv2.shiprocket.in/v1/external/orders/create/adhoc`

**Payload Example**:
```json
{
  "order_id": "AS-12345",
  "order_date": "2024-04-22",
  "pickup_location": "Primary",
  "billing_customer_name": "John Doe",
  "billing_last_name": "Doe",
  "billing_address": "House No 123",
  "billing_city": "Kolkata",
  "billing_pincode": "700001",
  "billing_state": "West Bengal",
  "billing_country": "India",
  "billing_email": "john@example.com",
  "billing_phone": "9999999999",
  "shipping_is_billing": true,
  "order_items": [
    {
      "name": "Organic Honey",
      "sku": "HON-001",
      "units": 1,
      "selling_price": "500"
    }
  ],
  "payment_method": "Prepaid",
  "sub_total": 500,
  "length": 10,
  "breadth": 10,
  "height": 10,
  "weight": 0.5
}
```

### Step 5: Tracking Orders
To show tracking info to the customer, use the tracking API:
`GET https://apiv2.shiprocket.in/v1/external/courier/track/shipment/{shipment_id}`

---

## 3. Recommended Workflow
1. **Customer places order** on Website.
2. **Payment is verified** via Razorpay.
3. **Database updated** (Supabase) with `payment_status: "paid"`.
4. **Trigger Shiprocket API** to create a shipment.
5. **Save Tracking ID** from Shiprocket back to your database.
6. **Notify Customer** via Email/WhatsApp (using the saved tracking ID).

---

## Important Links
- [Razorpay Documentation](https://razorpay.com/docs/payments/server-integration/nodejs/)
- [Shiprocket API Reference](https://shiprocket.readme.io/reference/introduction)
