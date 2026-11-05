# ZEBALPHA — ENTERPRISE MULTI-VENDOR ORDER MANAGEMENT AUDIT

**Audit Date:** November 5, 2026  
**Audited Target Systems:** Super Admin Order Management, Customer Checkout, Seller Order Portal, Logistics & Financial Ledger Services  
**Scope:** Architecture, Schemas, Lifecycle State Machines, Multi-Vendor Splitting, Commission Policies, Security, and Scalability  
**Status:** COMPLETE AUDIT

---

## 1. EXECUTIVE SUMMARY & EXISTING ARCHITECTURE

ZebAlpha operates as a high-performance multi-vendor marketplace where customers can place a single unified checkout containing products from multiple independent merchants. The backend already contains sophisticated multi-vendor database abstractions, but the Super Admin Order Management interface currently lags behind the enterprise requirements of platforms like Amazon and Flipkart.

### Current System Topology:
1. **Customer Front-End (`zebalpha-customer`):**
   - Checkout creates one **master parent order** in `public.orders`.
   - The order routing engine (`zebalpha-customer/src/lib/orderRouter.ts`) splits line items by merchant, creating child sub-orders in `public.seller_orders`, granular line items in `public.order_items`, and initial tracking records in `public.shipments`.
2. **Seller Portal (`zebalpha-seller`):**
   - Merchants access only their isolated sub-orders via `zebalpha-seller/src/app/api/orders/route.ts`.
   - Sellers transition orders through an enforced state machine (`placed` $\to$ `confirmed` $\to$ `processing` $\to$ `packed` $\to$ `ready_for_pickup` $\to$ `shipped` $\to$ `delivered`).
3. **Super Admin (`zebalpha-superadmin`):**
   - Currently, `OrderManagementView.tsx` fetches all orders in one monolithic unpaginated database query (`GET /api/admin/orders` calling `.select("*")`).
   - Browser-side filtering is executed on the full array, leading to memory bloat and UI lag with high order volumes.
   - Master order containers and sub-orders are partially deduplicated in memory via regex (`-S\d+`), but multi-vendor child shipments are not properly nested or visually aggregated.
   - Top-level KPI cards (Total Orders, New Orders, Pending Processing, Shipped Orders, Delivered Orders, Cancelled Orders, Returns, Total Order Value) are missing.
   - Server-side pagination, structured multi-seller drawers, and immutable audit logs for administrative overrides are incomplete.

---

## 2. DATABASE SCHEMA & TABLE RELATIONSHIPS

```
                                  ┌────────────────────────┐
                                  │     public.orders      │
                                  │ (Master Customer Order)│
                                  └───────────┬────────────┘
                                              │ 1
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ N                                             │ N
        ┌─────────────▼───────────────┐                 ┌─────────────▼───────────────┐
        │    public.seller_orders     │                 │      public.order_items     │
        │   (Per-Merchant Sub-Order)  │                 │    (Granular SKU Line Items)│
        └─────────────┬───────────────┘                 └─────────────────────────────┘
                      │ 1
                      │
        ┌─────────────▼───────────────┐
        │      public.shipments       │
        │  (AWB, Courier, Logistics)  │
        └─────────────┬───────────────┘
                      │ 1
                      │
        ┌─────────────▼───────────────┐
        │   public.shipping_events    │
        │  (Event History & Tracking) │
        └─────────────────────────────┘
```

### Table Definitions & Field Breakdown:

1. **`public.orders` (Parent Container):**
   - Primary Identifiers: `id` (UUID), `order_number` (VARCHAR, e.g. `AS202611058291`).
   - Customer Identifiers: `user_id` (UUID REFERENCES `auth.users`), `customer_name`, `phone`, `address`, `shipping_address` (JSONB).
   - Financials: `total_amount`, `discount_amount`, `shipping_charge`, `payment_method` (`COD`, `PREPAID`), `payment_status` (`PENDING`, `COMPLETE`, `PAID`, `FAILED`).
   - State: `order_status` (`placed`, `processing`, `shipped`, `delivered`, `cancelled`, `return_requested`, etc.).
   - Return & Refund Fields: `cancellation_reason`, `cancelled_at`, `cancelled_by`, `return_status`, `refund_status`, `refund_amount`, `refund_transaction_id`.
   - Gateways: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.

2. **`public.seller_orders` (Merchant-Specific Sub-Order):**
   - `id` (UUID), `parent_order_id` (UUID REFERENCES `orders.id` ON DELETE CASCADE).
   - `seller_id` (UUID REFERENCES `sellers.id`).
   - `seller_order_number` (VARCHAR, e.g. `SO-179388...`).
   - `seller_status` (`PENDING`, `CONFIRMED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
   - `shipping_status` (`PENDING`, `MANIFESTED`, `IN_TRANSIT`, `DELIVERED`).
   - `total_amount`, `commission_amount`, `seller_earning`.
   - `expected_delivery_from`, `expected_delivery_to`, `expected_delivery_date`.

3. **`public.order_items` (Line Item Detail):**
   - `id`, `parent_order_id`, `seller_order_id`.
   - `product_id` (REFERENCES `products.id`), `seller_id`.
   - `variant` (JSONB: size, color, SKU, image_url).
   - `quantity`, `price`, `discount`, `gst`.

4. **`public.shipments` & `public.shipping_events`:**
   - `shipment_number`, `order_id` / `parent_order_id`, `seller_order_id`, `seller_id`.
   - `courier_name`, `awb_code`, `tracking_number`, `status`, `tracking_url`, `label_url`.
   - `shipping_events` logs chronological checkpoints: `event_timestamp`, `activity`, `location`, `status`.

5. **`public.admin_audit_logs`:**
   - `id`, `username` / `admin_id`, `action`, `ip_address`, `user_agent`, `details` (JSONB), `created_at`.

---

## 3. FINANCIAL POLICY & COMMISSION DISCREPANCY AUDIT

### Source of Truth Analysis:

During the audit, a potential discrepancy between UI labels and backend ledger services was scrutinized:

1. **Backend Financial Ledger (`shared/services/financialLedgerService.ts`):**
   - Line 7: `DEFAULT_FINANCIAL_RULES` sets:
     ```typescript
     export const DEFAULT_FINANCIAL_RULES: MarketplaceFinancialRules = {
       commission_percentage: 0.0,
       fixed_fee_per_order: 0.0,
       payment_collection_fee_pct: 0.0,
       ...
     };
     ```
   - Automated Production Health Gate (`tests/production/complete-marketplace-health-gate.mjs`, Line 45):
     `✅ PASS: 0% marketplace commission policy: Seller receives 100% product price minus shipping`.
   - The true authoritative backend financial ledger executes on **0% marketplace commission**.

2. **Super Admin UI Discrepancy (`zebalpha-superadmin/src/components/admin/SellerManagementView.tsx`):**
   - Lines 764 & 1012 display hardcoded static strings from an early pre-launch prototype:
     - Line 764: `<span className="text-[10px] font-bold text-zinc-500 block">10% Take-Rate on 3rd-Party Merchants</span>`
     - Line 1012: `(10% Comm: ₹{Number(seller.adminCommission || 0).toLocaleString("en-IN")})`

### Determination & Protocol:
- **Zero Silent Changes Rule:** Per user instructions, neither value will be silently modified without explicit founder authorization.
- **Reporting:** In the Order Management Redesign, all financial calculations (subtotal, discounts, shipping, seller payables) will accurately consume the true database numbers (`total_amount`, `seller_earning`, `commission_amount`) without hardcoding arbitrary percentages.

---

## 4. CURRENT DEFICIENCIES & GAPS IN ORDER MANAGEMENT

| Area | Current Behavior | Required Enterprise Behavior |
| :--- | :--- | :--- |
| **Data Fetching** | `select("*")` pulling entire table into memory | Server-side pagination (`page`, `limit`), filtering at SQL level, total row count |
| **KPI Metrics** | Hardcoded or missing top-level KPI cards | Real-time SQL aggregations for Total, New, Processing, Shipped, Delivered, Cancelled, Returns, Total Value |
| **Multi-Vendor UX** | Collapsed single row per order; unclear which seller owns which product | Clear multi-seller breakdown: parent order with nested merchant fulfillment badges, independent delivery statuses |
| **Search & Filtering** | Browser-side JavaScript array filter | PostgreSQL indexed search across Order ID, Customer Name, Phone, Seller Name, Date Ranges, Payment & Delivery Statuses |
| **Order Details Drawer** | Basic modal with limited text | Amazon/Flipkart-style deep inspection: Customer PII masking, item-level variant & seller cards, financial ledger breakdown, shipment timeline |
| **Seller-Wise View** | Mixed in main table with basic dropdown | Dedicated "Seller Orders" view aggregating merchant order volumes, pending shipments, and seller-level fulfillment drilldowns |
| **Admin Overrides** | Direct status dropdown allow arbitrary status updates | Audited privileged actions (Approve/Reject Return, Refund Processing, Escalate Support) with immutable logging in `admin_audit_logs` |
| **PII Protection** | Raw customer phone and address exposed on all rows | Masked by default (`987******321`) with role-based unmasking |

---

## 5. REDESIGN ARCHITECTURAL SPECIFICATION

### 5.1 Backend API Enhancement (`/api/admin/orders`)
- **Query Parameters:**
  - `page` (number, default 1)
  - `limit` (number, default 15, max 100)
  - `tab` (`all`, `new`, `processing`, `shipped`, `delivered`, `cancelled`, `returns`)
  - `search` (Order ID, Customer Name, Phone, Seller Name, SKU, Tracking Number)
  - `dateRange` (`all`, `today`, `7d`, `30d`, `90d`, `custom`)
  - `startDate`, `endDate` (ISO strings)
  - `paymentStatus` (`all`, `PAID`, `PENDING`, `FAILED`)
  - `deliveryStatus` (`all`, `shipped`, `in_transit`, `out_for_delivery`, `delivered`, `rto`)
  - `sellerId` (UUID filter)
  - `view` (`orders` or `seller-summary`)
  - `includeKPIs` (`true` to return database KPI counts)
- **Database Joins & Aggregations:**
  - Retrieve parent orders with joined `seller_orders`, `order_items`, and `shipments`.
  - Calculate real-time counts across order status groupings.
  - Mask customer contact details in list payloads.

### 5.2 Super Admin Order Management View (`OrderManagementView.tsx`)
- **Header & KPI Strip:** 8 live metric cards matching ZebAlpha dark theme (`Total Orders`, `New Orders`, `Pending Processing`, `Shipped Orders`, `Delivered Orders`, `Cancelled Orders`, `Return Requests`, `Total Order Value`).
- **View Selector:** Toggle between **All Orders** (Centralized marketplace table) and **Seller Orders** (Merchant fulfillment matrix).
- **Tab Filter Bar:** `All | New | Processing | Shipped | Delivered | Cancelled | Returns`.
- **Enterprise Order Table:** Sticky header, product thumbnail with `+N more` badge, merchant tags, payment mode badges, independent fulfillment pills, action menu.
- **Order Details Drawer:**
  - Customer Card (Masked phone, city, state, delivery address).
  - Multi-Merchant Fulfillment Cards (Items grouped by seller with independent status, courier, tracking).
  - Financial Reconciliation (Gross, Discount, Shipping, Taxes, Net Paid, Seller Payable).
  - Visual Order Timeline (Order Placed $\to$ Payment Confirmed $\to$ Dispatched $\to$ Delivered).
  - Admin Actions with audit confirmation modal.

