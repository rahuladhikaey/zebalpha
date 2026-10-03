# ZEBALPHA PHASE 5 — LOAD & CONCURRENCY TEST SUITE

This directory contains standalone staging load tests and concurrency validation harnesses for ZEBALPHA.

## Test Scripts Overview

| Test Script | Tool | Target Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `catalog_load_test.js` | `k6` | `GET /api/products?page=1&limit=12` | 50 -> 100 -> 250 -> 500 VUs ramp test; measures p50/p95/p99 latency & error rate |
| `concurrent_inventory_test.js` | Node / fetch | `POST /api/checkout/cod` | 50 concurrent checkout attempts against 10 stock items; verifies zero overselling |
| `payment_idempotency_test.js` | Node / fetch | `POST /api/checkout/verify-payment` | 20 concurrent requests with identical Razorpay payment/order IDs; verifies 1 order created |
| `cod_duplicate_test.js` | Node / fetch | `POST /api/checkout/cod` | 10 rapid double-submissions within 100ms; verifies 30s throttle |
| `multi_vendor_checkout_stress_test.js` | Node / fetch | `POST /api/checkout/cod` | 3-seller multi-vendor cart; verifies 1 parent order + 3 seller orders |

---

## Safety Requirements

> [!CAUTION]
> **DO NOT RUN THESE TESTS AGAINST PRODUCTION.**
> Load tests and stock mutation tests must ONLY be run against an isolated staging deployment.

The scripts enforce the following environment variables:

- `STAGING_BASE_URL`: The staging URL (e.g. `https://staging.zebalpha.shop` or `http://localhost:3000`). If omitted, defaults to `http://localhost:3000`.
- `TEST_PRODUCT_ID`: A dedicated staging product UUID set to initial `stock = 10`.
- `ALLOW_DESTRUCTIVE_STAGING_TEST`: Explicit flag required before executing any stock modification tests.

---

## How to Run

### 1. Catalog Load Test (k6)
Requires `k6` installed locally or in CI:
```bash
# Install k6 (macOS: brew install k6 | Windows: choco install k6 | Linux: apt install k6)
k6 run -e STAGING_BASE_URL=https://staging.zebalpha.shop load-tests/catalog_load_test.js
```

### 2. Concurrent Inventory Test
```bash
STAGING_BASE_URL="http://localhost:3000" \
TEST_PRODUCT_ID="00000000-0000-0000-0000-000000000001" \
ALLOW_DESTRUCTIVE_STAGING_TEST=true \
node load-tests/concurrent_inventory_test.js
```

### 3. Payment Idempotency Test
```bash
STAGING_BASE_URL="http://localhost:3000" \
RAZORPAY_KEY_SECRET="your_razorpay_secret" \
node load-tests/payment_idempotency_test.js
```

### 4. Rapid COD Duplicate Test
```bash
STAGING_BASE_URL="http://localhost:3000" \
node load-tests/cod_duplicate_test.js
```

### 5. Multi-Vendor Stress Test
```bash
STAGING_BASE_URL="http://localhost:3000" \
node load-tests/multi_vendor_checkout_stress_test.js
```
