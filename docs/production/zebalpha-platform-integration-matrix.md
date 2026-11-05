# ZebAlpha — Platform Integration Matrix

**Verified Baseline Commit:** `19e69e6`  
**Purpose:** Cross-platform data contract, API, and database mapping across Android, Web, Seller, Admin, and Backend.

---

## 1. Cross-Platform Integration Matrix

| Platform | Subsystem / View | Consumed API Endpoints | Database Tables Accessed | Auth Mechanism | Test Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Android App** | Home Feed & Catalog | `GET /api/products` | `public.products`, `public.categories` | Anonymous / Supabase JWT | **PASS** |
| **Android App** | Live Heartbeat Tracker | `POST /api/analytics/heartbeat` | `public.customer_sessions` | Anonymous / Session UUID | **PASS** |
| **Android App** | Login & Sign Up | `POST /api/analytics/login-event` | `public.customer_login_logs` | Supabase Auth (Password/OAuth) | **PASS** |
| **Android App** | Checkout & Payment | `POST /api/checkout/razorpay` | `public.orders`, `public.payments` | Supabase Auth / Guest Token | **PASS** |
| **Customer Web** | Storefront & Search | `GET /api/products` | `public.products`, `public.categories` | Browser Cookie / Supabase JWT | **PASS** |
| **Customer Web** | Active Session Sync | `POST /api/analytics/heartbeat` | `public.customer_sessions` | SessionStorage UUID | **PASS** |
| **Customer Web** | Order History & Profile | `GET /api/orders` | `public.orders`, `public.profiles` | Supabase User Session | **PASS** |
| **Seller Panel** | Catalog & Variants | `/api/seller/products` | `public.products`, `public.inventory` | Seller JWT (`public.sellers`) | **PASS** |
| **Seller Panel** | Orders & Dispatch | `/api/seller/orders` | `public.seller_orders`, `public.orders`| Seller JWT (`seller_id` check) | **PASS** |
| **Seller Panel** | Earnings & Payouts | `/api/seller/payouts` | `public.seller_financial_ledger` | Seller JWT + Bank/UPI Record | **PASS** |
| **Super Admin** | 2-Key Auth Gate | `POST /api/admin/login` | Environment Secret Verification | Dual Key + Admin JWT Token | **PASS** |
| **Super Admin** | Customer Intelligence | `GET /api/admin/customer-intelligence` | `profiles`, `orders`, `customer_sessions` | `requireSuperAdmin` Guard | **PASS** |
| **Super Admin** | Segment Configuration | `POST /api/admin/customer-intelligence/config`| `customer_segment_configs` | `requireSuperAdmin` Guard | **PASS** |
| **Super Admin** | Product Approvals | `POST /api/admin/products` | `public.products` (`is_approved`) | `requireSuperAdmin` Guard | **PASS** |
| **Super Admin** | Seller Payouts | `POST /api/admin/settlements` | `seller_payout_requests`, `ledger` | `requireSuperAdmin` Guard | **PASS** |
| **Backend API** | Webhook Receiver | `POST /api/webhooks/razorpay` | `public.payments`, `public.orders` | HMAC-SHA256 Webhook Secret | **PASS** |

---

## 2. Shared Data Contracts & Normalization

### Order Status Mapping:
* `placed` $\rightarrow$ Customer completed checkout; payment authorized or COD confirmed.
* `confirmed` $\rightarrow$ Order verified by seller/admin.
* `shipped` $\rightarrow$ Dispatched with courier tracking ID.
* `delivered` $\rightarrow$ Successfully delivered; qualifies toward Repeat customer status and net revenue.
* `cancelled` $\rightarrow$ Terminated prior to delivery; 0 revenue contribution.
* `returned` $\rightarrow$ Fully returned; refunded and excluded from net revenue.
* `partially_returned` $\rightarrow$ Retains delivered status for non-returned items with reduced net revenue.

### Customer Segmentation Rules:
* **New Customer:** $\le 1$ delivered order.
* **Repeat Customer:** $2 \text{ to } 4$ delivered orders.
* **Loyal Customer:** $\ge 5$ delivered orders.
