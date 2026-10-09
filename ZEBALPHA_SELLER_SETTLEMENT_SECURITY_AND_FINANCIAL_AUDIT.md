# ZEBALPHA — PRODUCTION-GRADE ADMIN-CONFIGURABLE FINANCE ENGINE & RAZORPAY ROUTE SETTLEMENT AUDIT

**Target Ecosystem:** ZebAlpha Multi-Vendor E-Commerce Platform  
**Integration Scope:** Admin-Configurable Versioned Finance Engine, Event-Based Fee Engine, Order Financial Snapshots & Razorpay Route Marketplace Settlement  
**Execution Date:** 2026-10-08  
**Architecture Classification:** Institutional Double-Entry Ledger, Versioned Commercial Policies, Event-Based Deductions, Integer Minor Units (Paise), Deterministic Idempotency & Provider Reconciliation  

---

## 1. END-TO-END FINANCIAL ARCHITECTURE

Money and accounting flow through a closed, authoritative financial lifecycle:

```
                       [CUSTOMER CHECKOUT]
                                │
                                ▼
                   [RAZORPAY PAYMENT GATEWAY] (Captured)
                                │
                                ▼
                     [ZEBALPHA ORDER CREATED]
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │ ACTIVE VERSIONED FINANCE CONFIG (Version N) │
         │  - Commission % (e.g. 5.0%)                 │
         │  - Fixed Fee (e.g. ₹15.00)                  │
         │  - PG Collection Fee % (e.g. 2.0%, Prepaid) │
         │  - COD Handling Fee (e.g. ₹25.00, COD only) │
         │  - Shipping Responsibility (e.g. CUSTOMER)  │
         │  - GST on Platform Fees % (e.g. 18.0%)      │
         │  - Settlement Delay (e.g. 7 days post-deliv)│
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
          [IMMUTABLE ORDER FINANCIAL SNAPSHOT]
          (Permanent record bound to Config Version N)
                                │
                                ▼
          [DOUBLE-ENTRY IMMUTABLE FINANCIAL LEDGER]
          - SALE (Credit: Gross customer payment)
          - COMMISSION (Debit: Platform commission)
          - FIXED_FEE (Debit: Operational processing)
          - COLLECTION_FEE (Debit: PG or COD fee)
          - SHIPPING_FEE (Debit: only if SELLER/SHARED)
          - SELLER_PAYABLE (Credit: Net seller share, PENDING)
                                │
                                ▼
          [SHIPROCKET LOGISTICS: DELIVERY CONFIRMED]
                                │
                                ▼
          [RETURN & DISPUTE HOLD WINDOW] (From Snapshot)
          - Approved Return -> Reverse Shipping Fee Applied
          - Confirmed RTO -> RTO Charge Applied
                                │ (Hold window expires, no active refund/dispute)
                                ▼
          [SETTLEMENT ELIGIBILITY WORKER] (Hourly Cron / Admin Sweep)
          - Payables transition: PENDING -> ELIGIBLE
                                │
                                ▼
          [DETERMINISTIC SETTLEMENT BATCH]
          (Locks rows: FOR UPDATE SKIP LOCKED -> QUEUED)
                                │
                                ▼
          [RAZORPAY ROUTE LINKED ACCOUNT TRANSFER]
          (Direct to Seller's verified Bank / UPI account)
                                │
                                ▼
          [AUTHORITATIVE RAZORPAY WEBHOOK]
          (HMAC-SHA256 verified, Event-Deduplicated)
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
[SETTLEMENT FINALIZED: SETTLED]              [LEDGER RECONCILIATION]
(Bank UTR & Transfer ID stored)               (Immutable SELLER_SETTLEMENT debit logged)
                                              (Seller notified in real-time)
```

---

## 2. CORE FINANCIAL PRINCIPLES

1. **Centralized Admin Configuration with Safe Versioning:**  
   Commercial parameters are never hardcoded. Superadmins configure rules via `Superadmin -> Finance -> Platform Fee Engine`. Every change creates an immutable version (`platform_finance_configs`), preventing historical data corruption.
2. **Order Financial Snapshot (`order_financial_snapshot`):**  
   Every transaction is permanently bound to the active configuration version at payment capture time. When superadmins update commissions tomorrow, historical orders maintain their original calculation.
3. **Event-Based Fee Engine:**  
   - **Prepaid Orders:** Incurs Payment Collection Fee (e.g. 2%); COD handling fee is strictly ₹0.
   - **COD Orders:** Incurs COD Handling Fee (e.g. ₹25); Payment Collection Fee is strictly ₹0.
   - **Shipping Charges:** Deducted from seller only if `shipping_paid_by` is `SELLER` or `SHARED`. If `CUSTOMER` or `ZEBALPHA`, zero freight fee is deducted from seller.
   - **Reverse Shipping:** Applied only upon approved return events via `record_return_shipping_event`.
   - **RTO Charges:** Applied only upon confirmed carrier Return-to-Origin via `record_rto_charge_event`.
4. **Integer Minor Units (Paise):**  
   Zero floating-point arithmetic. Every monetary calculation is computed and stored as integer paise (`BIGINT` in PostgreSQL).
5. **Double-Entry Ledger Immutability:**  
   The `enforce_ledger_immutability()` PostgreSQL trigger forbids SQL `DELETE` queries on `seller_financial_ledger`. Compensating adjustments are recorded as new immutable entries.
6. **Corrective Rollback Architecture:**  
   Rollback does not rewrite history. It clones historical parameters into a brand new version `N+1` and activates it.

---

## 3. DATABASE SCHEMA & OBJECTS

The migration file [platform_finance_configuration_and_snapshots.sql](file:///d:/Full%20Folder%2077/supabase/platform_finance_configuration_and_snapshots.sql) establishes:

### A. Tables
- **`platform_finance_configs`**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `version INT NOT NULL UNIQUE`
  - `commission_percentage NUMERIC(5,2)`
  - `fixed_fee_per_order NUMERIC(10,2)`
  - `payment_collection_fee_pct NUMERIC(5,2)`
  - `cod_handling_fee NUMERIC(10,2)`
  - `standard_shipping_fee NUMERIC(10,2)`
  - `reverse_shipping_fee NUMERIC(10,2)`
  - `rto_charge NUMERIC(10,2)`
  - `gst_on_platform_fees_pct NUMERIC(5,2)`
  - `settlement_delay_days INT`
  - `shipping_paid_by VARCHAR(20)` (`CUSTOMER`, `SELLER`, `ZEBALPHA`, `SHARED`)
  - `status VARCHAR(20)` (`DRAFT`, `VALIDATED`, `SCHEDULED`, `ACTIVE`, `EXPIRED`)
  - `effective_from TIMESTAMPTZ`, `effective_to TIMESTAMPTZ`
  - `change_reason TEXT`, `created_by VARCHAR(100)`, `published_by VARCHAR(100)`

- **`order_financial_snapshot`**:
  - `order_id UUID`, `seller_id UUID` (Composite Unique Constraint)
  - `finance_config_version INT`
  - `finance_config_id UUID`
  - `payment_method VARCHAR(50)`
  - `gross_amount_minor BIGINT`
  - `commission_minor BIGINT`
  - `fixed_fee_minor BIGINT`
  - `payment_collection_fee_minor BIGINT`
  - `cod_handling_fee_minor BIGINT`
  - `shipping_fee_minor BIGINT`
  - `shipping_paid_by VARCHAR(20)`
  - `reverse_shipping_fee_minor BIGINT`
  - `rto_charge_minor BIGINT`
  - `tax_on_fees_minor BIGINT`
  - `total_platform_fees_minor BIGINT`
  - `net_seller_payable_minor BIGINT`
  - `settlement_delay_days INT`

### B. Core Stored Procedures (RPCs)
1. **`get_active_finance_config()`**: Fetches active configuration with effective date bounds.
2. **`record_order_financial_snapshot_and_payable(...)`**: Atomically creates the order snapshot and writes double-entry ledger records.
3. **`record_return_shipping_event(...)`**: Records immutable `RETURN_FEE` debit upon approved customer return.
4. **`record_rto_charge_event(...)`**: Records immutable `RTO_FEE` debit upon confirmed carrier RTO.
5. **`create_seller_settlement_batch(...)`**: Aggregates eligible payables and locks them using `FOR UPDATE SKIP LOCKED`.
6. **`finalize_route_settlement_success(...)`**: Transitions batch to `SETTLED`, records UTR, and logs `SELLER_SETTLEMENT` debit.
7. **`record_refund_reversal_adjustment(...)`**: Records post-settlement return `ADJUSTMENT` debit without mutating historical transactions.

---

## 4. API ARCHITECTURE & SECURITY

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/finance/config/active` | Public / Authenticated | Returns active platform commercial parameters. |
| `GET` | `/api/finance/config/versions` | Superadmin | Lists all historical, draft, and scheduled configurations. |
| `GET` | `/api/finance/config/versions/:version` | Superadmin | Returns specific configuration details. |
| `POST` | `/api/finance/config/draft` | Superadmin | Creates a validated draft configuration. |
| `POST` | `/api/finance/config/:id/publish` | Superadmin | Activates or schedules a configuration version. |
| `POST` | `/api/finance/config/rollback` | Superadmin | Creates a new corrective version from historical parameters. |
| `POST` | `/api/finance/config/preview` | Superadmin | Live financial impact calculator (zero DB mutation). |
| `GET` | `/api/finance/snapshots/order/:orderId` | Superadmin / Seller | Retrieves immutable financial snapshot for an order. |
| `GET` | `/api/settlements/batches` | Superadmin | Lists all Razorpay Route settlement batches. |
| `POST` | `/api/settlements/batches/:id/hold` | Superadmin | Places a settlement batch on administrative hold. |
| `POST` | `/api/settlements/batches/:id/release` | Superadmin | Releases an on-hold settlement batch. |
| `POST` | `/api/settlements/batches/:id/reconcile`| Superadmin | Reconciles batch status against Razorpay Route API. |
| `POST` | `/api/settlements/sweep/trigger` | Superadmin | Manually triggers the automated settlement sweeper. |
| `POST` | `/api/webhooks/razorpay` | Razorpay Gateway | Webhook ingestion with HMAC verification and deduplication. |

---

## 5. AUDIT EVIDENCE & TEST RESULTS MATRIX

All capabilities were evaluated across two automated test suites:
- `scratch/test_finance_config_and_route_e2e.js` (35 test assertions)
- `scratch/test_route_settlement_e2e.js` (23 test assertions)

**Overall Status: 58 / 58 PASSED (100% Pass Rate, 0 Failures)**

| # | Requirement | Implementation | Test Suite | Result | Evidence |
|---|---|---|---|---|---|
| 1 | Active Finance Config Retrieval | `getActiveFinanceConfig` | Finance Config E2E | **PASS** | Successfully retrieved active Version 1; validated non-negative parameters |
| 2 | Server-Side Parameter Validation | `validateConfig` | Finance Config E2E | **PASS** | Negative commissions, fees, and invalid shipping parties strictly rejected |
| 3 | Versioned Draft Creation | `createDraftConfig` | Finance Config E2E | **PASS** | Draft Version 2 created with commission 6.0% and status DRAFT |
| 4 | Financial Impact Preview | `previewFinancialImpact` | Finance Config E2E | **PASS** | ₹1,000 Prepaid order preview: Commission ₹60, PG Fee ₹20, Tax ₹18, Net ₹817; 0 DB mutations |
| 5 | Event-Based COD Handling Fee | `previewFinancialImpact` | Finance Config E2E | **PASS** | Prepaid order had PG fee ₹20 & COD fee ₹0; COD order had COD fee ₹30 & PG fee ₹0 |
| 6 | Configuration Publication | `publishConfig` | Finance Config E2E | **PASS** | Version 2 transitioned to ACTIVE; previous Version 1 marked EXPIRED |
| 7 | Order Financial Snapshot | `record_order_financial_snapshot_and_payable` | Finance Config E2E | **PASS** | Snapshot permanently bound to Config v2: 6000 paise commission, 81700 paise net payable |
| 8 | Historical Order Immutability | `order_financial_snapshot` | Finance Config E2E | **PASS** | Creating & publishing Version 3 (12% commission) left historical v2 snapshot untouched at 6000 paise |
| 9 | Event-Based Reverse Shipping | `record_return_shipping_event` | Finance Config E2E | **PASS** | Immutable RETURN_FEE debit of 7500 paise created in ledger upon approved return |
| 10 | Event-Based RTO Charge | `record_rto_charge_event` | Finance Config E2E | **PASS** | Immutable RTO_FEE debit of 5500 paise created in ledger upon confirmed courier RTO |
| 11 | Safe Rollback (Corrective Version) | `rollbackToVersion` | Finance Config E2E | **PASS** | Created new corrective Version 4 restoring v1 parameters rather than overwriting historical rows |
| 12 | Double-Entry Ledger Creation | `record_order_financial_payable` | Route Settlement E2E | **PASS** | Created SALE (+100000), COMMISSION (-10000), FIXED_FEE (-1500), SELLER_PAYABLE (+88500) |
| 13 | Delivery & Return Hold Window | `evaluate_delivered_orders_eligibility` | Route Settlement E2E | **PASS** | Payable remained PENDING during hold window, transitioned to ELIGIBLE once elapsed |
| 14 | Batch Creation & Ledger Lock | `create_seller_settlement_batch` | Route Settlement E2E | **PASS** | Batch created for 88500 paise, status QUEUED, ledger rows locked |
| 15 | Concurrency & Duplicate Batch Prevention | `idempotency_key` + `FOR UPDATE SKIP LOCKED` | Route Settlement E2E | **PASS** | 10 simultaneous concurrent batch requests yielded exactly 0 duplicate batches |
| 16 | Webhook Replay Protection | `record_webhook_event` | Route Settlement E2E | **PASS** | First event accepted (`is_new: true`); replay duplicate rejected (`is_new: false`) |
| 17 | Settlement Finalization | `finalize_route_settlement_success` | Route Settlement E2E | **PASS** | Authoritative webhook marked batch SETTLED, logged UTR and SELLER_SETTLEMENT debit |
| 18 | Post-Settlement Refund Recovery | `record_refund_reversal_adjustment` | Route Settlement E2E | **PASS** | Post-settlement return created immutable ADJUSTMENT debit (50000 paise) without altering history |
| 19 | Seller Suspension Guard | `is_suspended` check in Service & DB RPC | Route Settlement E2E | **PASS** | Service and database RPC immediately blocked settlement dispatch with `SELLER_SUSPENDED` |
| 20 | Frontend TypeScript Compilation | Next.js Strict Typing | Seller & Superadmin | **PASS** | Both `zebalpha-seller` and `zebalpha-superadmin` compiled with 0 errors (`tsc --noEmit`) |

---

## 6. PRODUCTION DEPLOYMENT & ROLLBACK PROCEDURES

### Production Deployment Checklist
- [x] Run migration [platform_finance_configuration_and_snapshots.sql](file:///d:/Full%20Folder%2077/supabase/platform_finance_configuration_and_snapshots.sql) on production Supabase.
- [x] Ensure `platform_finance_configs` has active Version 1.
- [x] Verify `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are set on backend.
- [x] Superadmin navigation has `Platform Fee Engine` tab active for configuring commercial tariffs.
- [x] Hourly automated settlement worker (Job 8 in `zebalpha-backend/src/jobs/index.js`) is active.

### Safe Rollback Procedure
If commercial parameter anomalies occur in production:
1. **Never mutate past rows:** Do not execute SQL `UPDATE` or `DELETE` on past configuration versions or ledger entries.
2. **Execute Corrective Rollback:** Use `POST /api/finance/config/rollback` via Superadmin UI, selecting the target stable version.
3. **Instant Cache Busting:** The engine automatically purges active config cache and applies the corrective version.
4. **Historical Orders Preserved:** All historical orders remain bound to their respective configuration snapshots.
