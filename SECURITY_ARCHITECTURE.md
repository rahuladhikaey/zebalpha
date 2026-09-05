# 🛡️ ZEB-ALPHA Clothing E-Commerce — Security Architecture & Threat Model

## 1. Architectural Overview

The ZEB-ALPHA clothing e-commerce platform implements a multi-tier, zero-trust architecture designed to protect customer financial data, seller business confidentiality, and administrative platform controls.

```
+-----------------------------------------------------------------------------------+
|                                CLIENT APPLICATIONS                                |
+-----------------------+-----------------------------------+-----------------------+
|  zebalpha-customer    |          zebalpha-seller          |  zebalpha-superadmin  |
|  (Storefront Web App) |        (Merchant Portal)          |   (Dual-Key Portal)   |
|   Next.js 16 App      |          Next.js 16 App           |    Next.js 16 App     |
+-----------+-----------+-----------------+-----------------+-----------+-----------+
            |                             |                             |
            |                             |                             |
            v                             v                             v
+-----------------------------------------------------------------------------------+
|                         CENTRAL API GATEWAY & EDGE PROXIES                        |
|                                                                                   |
|  - Helmet HTTP Defensive Headers (HSTS, CSP, X-Frame-Options: DENY)               |
|  - Dual-Tier Rate Limiting (Global 300 req/15m; Sensitive 20 req/15m)             |
|  - Cryptographic Signature & Session Validation Middleware                         |
|  - Next.js Edge Middleware with 30-Minute Idle Session Tracking                   |
+-----------------------------------------------------------------------------------+
            |                                                           |
            v                                                           v
+---------------------------------------+   +---------------------------------------+
|        CORE BUSINESS SERVICES         |   |         FINANCIAL PIPELINES           |
|                                       |   |                                       |
| - Product & Inventory Management      |   | - Server-Side Authoritative Pricing   |
| - Multi-Tenant Seller Isolation       |   | - Razorpay HMAC-SHA256 Timing-Safe    |
| - Order Lifecycle & Shipment API      |   | - Immutable Payment Audit Ledger      |
+---------------------------------------+   +---------------------------------------+
                                            |
                                            v
+-----------------------------------------------------------------------------------+
|                       DATA LAYER: SUPABASE POSTGRESQL 17                          |
|                                                                                   |
| - Zero-Trust Row Level Security (RLS) across all 32 public tables                 |
| - Administrative Tables Restricted Exclusively to `service_role`                  |
| - Tenant Isolation Enforced via `auth.uid() = user_id` and `auth.uid() = seller_id`|
| - Immutable Audit Logging (`admin_audit_logs`, `payment_audit_logs`)              |
+-----------------------------------------------------------------------------------+
```

---

## 2. Role-Based Access Control (RBAC) Matrix

The system enforces three strictly delineated roles:

| Action / Resource | 👤 Customer (`customer`) | 🏪 Seller (`seller`) | 👑 Admin (`SUPER_ADMIN`) | Anonymous / Guest |
| :--- | :--- | :--- | :--- | :--- |
| **Browse Active Catalog** | Allowed | Allowed | Allowed | Allowed |
| **View Store Settings** | Read-Only | Read-Only | Read & Write | Read-Only |
| **Create Cart & Checkout** | Allowed (Own items) | Denied | Denied | Denied |
| **View Orders** | Own orders only | Assigned orders only | All platform orders | Denied |
| **Manage Products** | Denied | Own products only | All products | Denied |
| **Update Order Status** | Denied | Assigned shipments | Full authority | Denied |
| **Access Financial Reports** | Denied | Own earnings only | Platform ledger | Denied |
| **Administrative Access** | Denied (403) | Denied (403) | Granted (Dual-Key) | Denied (401) |
| **Trigger Maintenance Cron** | Denied (403) | Denied (403) | Bearer Secret Only | Denied (401) |

---

## 3. Administrative Dual-Key Authentication (2FA)

Access to the administrative control plane (`zebalpha-superadmin`) requires two independent security keys:

1. **Security Factor 1 (`ADMIN_ACCESS_KEY_1`)**: Primary administrative key stored as a high-entropy secret.
2. **Security Factor 2 (`ADMIN_ACCESS_KEY_2`)**: Secondary operational passcode / token.

### Authentication Flow:
1. **Input Submission**: Client submits `{ adminKey1, adminKey2 }` over TLS.
2. **Timing-Safe Evaluation**: Both keys are verified using `crypto.timingSafeEqual`:
   ```typescript
   const isFactor1Valid = await verifyPassword(factor1, ADMIN_ACCESS_KEY_1);
   const isFactor2Valid = await verifyPassword(factor2, ADMIN_ACCESS_KEY_2);
   const isTwoFactorVerified = isFactor1Valid && isFactor2Valid;
   ```
3. **Brute-Force Protection**: An in-memory tracker records failed attempts by client IP. Reaching 5 failed attempts locks the IP address out for 15 minutes (`HTTP 429 Too Many Requests` with `Retry-After` header).
4. **Audit Logging**: Every authentication event (successful, failed, or lockout) is recorded in `public.admin_audit_logs` with timestamp, client IP, and User-Agent.
5. **Session Issuance**: Upon successful dual-key validation, a cryptographically signed JWT is issued via `httpOnly`, `secure`, `sameSite: "strict"` cookie (`admin_session_token`).
6. **Session Lifecycle**:
   - Absolute session expiration: **2 hours**.
   - Inactivity / Idle timeout: **30 minutes**. Edge middleware checks `lastActive` timestamp and terminates expired sessions.

---

## 4. Financial & Payment Integrity Architecture

### 4.1 Server-Side Authoritative Pricing
- Cart item prices submitted by clients are completely discarded.
- The server retrieves unit prices directly from the `public.products` database table via product UUIDs.
- Subtotals, coupon discounts (`WELCOME10`), shipping charges, platform fees, packaging charges, and GST are calculated centrally in [`zebalpha-backend/src/utils/orderCalculator.js`](file:///d:/Full%20Folder%2077/zebalpha-backend/src/utils/orderCalculator.js).
- Orders are validated against inventory levels to prevent negative inventory exploitation.

### 4.2 Razorpay Payment Verification
- Payment callbacks must provide `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
- The server computes the expected HMAC-SHA256 signature using `process.env.RAZORPAY_KEY_SECRET`.
- Cryptographic comparison is performed using `crypto.timingSafeEqual`:
  ```javascript
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${orderId}|${paymentId}`);
  const expectedSignature = hmac.digest('hex');
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
  ```
- All test/mock signature bypasses have been removed.

---

## 5. PostgreSQL Row Level Security (RLS) Model

The database enforces a zero-trust model where client queries from Supabase SDKs cannot access or modify records outside their ownership:

- **Administrative Tables (`admin_users`, `admin_audit_logs`, `payment_audit_logs`)**:
  - `anon` and `authenticated` roles have zero access.
  - Accessible only via backend services operating with `service_role`.
- **Customer Ownership Scoping**:
  - `orders`, `cart_items`, `user_addresses`, `notifications`: Scoped via `auth.uid() = user_id`.
- **Seller Tenant Isolation**:
  - `products`: Public can read active items; sellers can read and write only items matching their seller ID.
  - `sellers`: Public can read approved sellers; sellers can update only their own profile (`auth.uid() = user_id`).
  - `orders`: Sellers can view only orders containing items assigned to their merchant ID.

---

## 6. Perimeter & Application Hardening

1. **HTTP Security Headers (`helmet`)**:
   - `Content-Security-Policy`: Restricts script and style execution sources.
   - `Strict-Transport-Security` (HSTS): Enforces HTTPS connections with `max-age=31536000; includeSubDomains`.
   - `X-Frame-Options: DENY`: Prevents clickjacking.
   - `X-Content-Type-Options: nosniff`: Prevents MIME-confusion attacks.
2. **Rate Limiting**:
   - Express API gateway applies IP-based rate limiting via `express-rate-limit`.
   - General endpoints: 300 requests / 15 minutes.
   - High-risk endpoints (login, register, payment verification): 20 requests / 15 minutes.
3. **Multi-Tenant Protection (Anti-IDOR)**:
   - Product updates whitelist editable fields (`name`, `description`, `price`, `stock`, `images`, `status`).
   - Ownership validation: `req.user.id === product.seller_id` is verified on the backend prior to any database write.
